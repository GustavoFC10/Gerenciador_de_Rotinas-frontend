import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'

import {
  CreationErrorSummary,
  CreationSuccess,
  FieldError,
} from '../components/forms/CreationFeedback'
import CreationProgress from '../components/forms/CreationProgress'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import {
  clientTaxRegimeOptions,
  getRoutineRecurrenceLabel,
} from '../constants/entityOptions'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { Routine, Screen } from '../types/domain'
import type { ClientCompanyInput } from '../services/companyService'
import { formatRoutineSchedule } from '../utils/routineSchedule'

const steps = [
  {
    id: 'company',
    label: 'Dados da empresa',
    description: 'Identificação e contato',
  },
  {
    id: 'operations',
    label: 'Operação',
    description: 'Tela e rotinas',
  },
  {
    id: 'review',
    label: 'Revisar',
    description: 'Conferência antes de criar',
  },
]

interface CompanyDraft {
  name: string
  legalName: string
  code: string
  cnpj: string
  email: string
  mobilePhone: string
  taxRegime: string
  screenId: string
  routineIds: string[]
  startsOn: string
}

type CompanyField =
  | 'name'
  | 'code'
  | 'cnpj'
  | 'email'
  | 'startsOn'
  | 'submit'

type CompanyErrors = Partial<Record<CompanyField, string>>

export interface CompanySetupInput {
  company: ClientCompanyInput
  screenId?: string
  routineIds: string[]
  startsOn: string
}

export interface CreateCompanyResult {
  company: { id: string; name: string }
  linkedRoutineCount: number
  screenName?: string
}

export interface CompanySetupPartialResult {
  company: { id: string; name: string }
  linkedRoutineCount: number
  requestedRoutineCount: number
  screenLinked: boolean
  nextStep: string
}

export class CompanySetupError extends Error {
  readonly partial: CompanySetupPartialResult

  constructor(message: string, partial: CompanySetupPartialResult) {
    super(message)
    this.name = 'CompanySetupError'
    this.partial = partial
  }
}

interface CreateCompanyPageProps {
  screens: Screen[]
  routines: Routine[]
  period: string
  onCreate: (input: CompanySetupInput) => Promise<CreateCompanyResult>
  onCancel: () => void
}

function getInitialDraft(period: string): CompanyDraft {
  return {
    name: '',
    legalName: '',
    code: '',
    cnpj: '',
    email: '',
    mobilePhone: '',
    taxRegime: '',
    screenId: '',
    routineIds: [],
    startsOn: isPeriod(period) ? period + '-01' : '',
  }
}

function CreateCompanyPage({
  screens,
  routines,
  period,
  onCreate,
  onCancel,
}: CreateCompanyPageProps) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<CompanyDraft>(() =>
    getInitialDraft(period),
  )
  const [errors, setErrors] = useState<CompanyErrors>({})
  const [routineSearch, setRoutineSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<CreateCompanyResult | null>(null)
  const [partialResult, setPartialResult] =
    useState<CompanySetupPartialResult | null>(null)
  const [pendingScreenId, setPendingScreenId] = useState<string | null>(null)

  const availableScreens = useMemo(
    () =>
      screens
        .filter(
          (screen) =>
            screen.type === 'spreadsheet' &&
            !screen.archivedAt &&
            screen.companies.length < 500,
        )
        .sort(
          (left, right) =>
            left.position - right.position ||
            left.name.localeCompare(right.name, 'pt-BR'),
        ),
    [screens],
  )
  const selectedScreen = availableScreens.find(
    (screen) => screen.id === draft.screenId,
  )
  const availableRoutines = useMemo(
    () =>
      routines
        .filter(
          (routine) => routine.active !== false,
        )
        .filter((routine) => {
          const query = routineSearch.trim().toLocaleLowerCase('pt-BR')
          if (!query) return true

          return [routine.name, routine.shortName, routine.description]
            .filter(Boolean)
            .some((value) =>
              value?.toLocaleLowerCase('pt-BR').includes(query),
            )
        })
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [routineSearch, routines],
  )
  const selectedRoutineIds = new Set(draft.routineIds)
  const selectedRoutines = routines.filter((routine) =>
    selectedRoutineIds.has(routine.id),
  )
  if (result) {
    return (
      <div className="mx-auto w-full max-w-[90rem]">
        <WorkspaceBar
          context={{ label: 'Cadastros', to: ROUTES.HOME }}
          label="Empresa"
          title="Adicionar empresa"
        />
        <CreationSuccess
          eyebrow="Empresa criada"
          title={result.company.name}
          description="O cadastro, as rotinas escolhidas e a inclusão opcional em uma tela foram enviados para a API."
          detail={
            result.linkedRoutineCount +
            (result.linkedRoutineCount === 1
              ? ' rotina vinculada'
              : ' rotinas vinculadas') +
            (result.screenName ? ' · Tela ' + result.screenName : '')
          }
          primaryAction={{
            label: 'Abrir empresa',
            to:
              ROUTES.COMPANIES +
              '/' +
              encodeURIComponent(result.company.id) +
              '?source=catalog',
          }}
          secondaryAction={{
            label: 'Cadastrar outra',
            onClick: () => {
              setDraft(getInitialDraft(period))
              setErrors({})
              setRoutineSearch('')
              setStep(0)
              setPendingScreenId(null)
              setResult(null)
            },
          }}
        />
      </div>
    )
  }

  if (partialResult) {
    return (
      <div className="mx-auto w-full max-w-[90rem]">
        <WorkspaceBar
          context={{ label: 'Cadastros', to: ROUTES.HOME }}
          label="Empresa"
          title="Adicionar empresa"
        />
        <PartialSetupNotice
          result={partialResult}
          onCreateAnother={() => {
            setDraft(getInitialDraft(period))
            setErrors({})
            setRoutineSearch('')
            setStep(0)
            setPendingScreenId(null)
            setPartialResult(null)
          }}
        />
      </div>
    )
  }

  function updateDraft<K extends keyof CompanyDraft>(
    field: K,
    value: CompanyDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    if (field in errors) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  function updateScreen(screenId: string) {
    const screen = availableScreens.find((item) => item.id === screenId)

    setDraft((current) => ({
      ...current,
      screenId,
      routineIds: screen?.routines.map((routine) => routine.id) ?? [],
    }))
    setPendingScreenId(null)
  }

  function requestScreenChange(screenId: string) {
    if (screenId === draft.screenId) return

    if (draft.routineIds.length > 0) {
      setPendingScreenId(screenId)
      return
    }

    updateScreen(screenId)
  }

  function restoreScreenSuggestions() {
    if (!draft.screenId) return
    updateScreen(draft.screenId)
  }

  function toggleRoutine(routineId: string) {
    setDraft((current) => ({
      ...current,
      routineIds: current.routineIds.includes(routineId)
        ? current.routineIds.filter((id) => id !== routineId)
        : [...current.routineIds, routineId],
    }))
  }

  function validateCompanyData(): CompanyErrors {
    const nextErrors: CompanyErrors = {}
    const code = draft.code.trim()
    const cnpj = normalizeDocument(draft.cnpj)

    if (!draft.name.trim()) {
      nextErrors.name = 'Informe o nome da empresa.'
    }

    if (!/^[0-9]{1,32}$/.test(code)) {
      nextErrors.code = 'Informe um código numérico com até 32 dígitos.'
    }

    if (cnpj && cnpj.length !== 14) {
      nextErrors.cnpj = 'Informe um CNPJ com 14 dígitos ou deixe o campo vazio.'
    }

    if (
      draft.email.trim() &&
      !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(draft.email.trim())
    ) {
      nextErrors.email = 'Informe um e-mail válido.'
    }

    return nextErrors
  }

  function validateOperations(): CompanyErrors {
    const nextErrors: CompanyErrors = {}

    if (draft.routineIds.length > 0 && !isDate(draft.startsOn)) {
      nextErrors.startsOn =
        'Informe a data de início para os vínculos de rotina.'
    }

    if (pendingScreenId !== null) {
      nextErrors.submit =
        'Confirme ou cancele a troca de tela antes de continuar.'
    }

    return nextErrors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (step === 0) {
      const nextErrors = validateCompanyData()
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length === 0) {
        setStep(1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    if (step === 1) {
      const nextErrors = validateOperations()
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length === 0) {
        setStep(2)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    const finalErrors = {
      ...validateCompanyData(),
      ...validateOperations(),
    }
    setErrors(finalErrors)
    if (Object.keys(finalErrors).length > 0) {
      setStep(finalErrors.startsOn ? 1 : 0)
      return
    }

    setIsSubmitting(true)
    try {
      const created = await onCreate({
        company: removeEmptyFields({
          code: draft.code.trim(),
          name: draft.name.trim(),
          legalName: draft.legalName.trim(),
          cnpj: formatCnpj(draft.cnpj),
          email: draft.email.trim(),
          mobilePhone: draft.mobilePhone.trim(),
          taxRegime: draft.taxRegime,
        }),
        ...(draft.screenId ? { screenId: draft.screenId } : {}),
        routineIds: draft.routineIds,
        startsOn: draft.startsOn,
      })
      setErrors({})
      setPartialResult(null)
      setResult(created)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      if (error instanceof CompanySetupError) {
        setPartialResult(error.partial)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : 'Não foi possível criar a empresa.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        context={{ label: 'Cadastros', to: ROUTES.HOME }}
        label="Empresa"
        title="Adicionar empresa"
        meta="Cadastro em 3 etapas"
      />

      <div className="mb-5">
        <CreationProgress
          steps={steps}
          currentStep={step}
          onStepSelect={setStep}
        />
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <CreationErrorSummary
          messages={Object.values(errors).filter(
            (message): message is string => Boolean(message),
          )}
        />

        <div className={Object.keys(errors).length > 0 ? 'mt-4' : ''}>
          {step === 0 && (
            <CompanyDataStep
              draft={draft}
              errors={errors}
              onUpdate={updateDraft}
            />
          )}
          {step === 1 && (
            <CompanyOperationsStep
              screens={availableScreens}
              routines={availableRoutines}
              draft={draft}
              selectedScreen={selectedScreen}
              selectedRoutineIds={selectedRoutineIds}
              errors={errors}
              routineSearch={routineSearch}
              onScreenChange={requestScreenChange}
              onRestoreSuggestions={restoreScreenSuggestions}
              pendingScreenId={pendingScreenId}
              pendingScreen={availableScreens.find(
                (screen) => screen.id === pendingScreenId,
              )}
              onConfirmScreenChange={() => {
                if (pendingScreenId !== null) updateScreen(pendingScreenId)
              }}
              onCancelScreenChange={() => setPendingScreenId(null)}
              onStartChange={(startsOn) => updateDraft('startsOn', startsOn)}
              onRoutineSearchChange={setRoutineSearch}
              onRoutineToggle={toggleRoutine}
            />
          )}
          {step === 2 && (
            <CompanyReviewStep
              draft={draft}
              screen={selectedScreen}
              routines={selectedRoutines}
              onChangeStep={setStep}
            />
          )}
        </div>

        <div className="sticky bottom-0 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[color-mix(in_srgb,var(--color-panel-bg)_94%,transparent)] px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur sm:px-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            {step === 0 && 'Campos marcados com * são obrigatórios.'}
            {step === 1 &&
              draft.routineIds.length +
                (draft.routineIds.length === 1
                  ? ' rotina selecionada.'
                  : ' rotinas selecionadas.')}
            {step === 2 &&
              'Nada será criado antes da confirmação. A API registrará os vínculos em sequência.'}
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              tone="neutral"
              disabled={isSubmitting}
              onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
            >
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </Button>
            <Button type="submit" tone="primary" disabled={isSubmitting}>
              {isSubmitting
                ? 'Criando…'
                : step === 2
                  ? 'Criar empresa'
                  : 'Continuar'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function CompanyDataStep({
  draft,
  errors,
  onUpdate,
}: {
  draft: CompanyDraft
  errors: CompanyErrors
  onUpdate: <K extends keyof CompanyDraft>(
    field: K,
    value: CompanyDraft[K],
  ) => void
}) {
  return (
    <Card>
      <StepHeader
        eyebrow="Etapa 1 de 3"
        title="Identifique a empresa"
        description="Nome, código e CNPJ organizam o cadastro. Os dados de contato podem ser completados agora ou editados depois."
      />
      <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-2">
        <div className="space-y-4">
          <FieldGroup error={errors.name} errorId="company-name-error">
            <TextField
              id="company-name"
              label="Nome da empresa *"
              value={draft.name}
              onChange={(event) => onUpdate('name', event.target.value)}
              autoComplete="organization"
              placeholder="Ex.: Aurora Comércio"
              required
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'company-name-error' : undefined}
            />
          </FieldGroup>
          <TextField
            id="company-legal-name"
            label="Razão social (opcional)"
            value={draft.legalName}
            onChange={(event) => onUpdate('legalName', event.target.value)}
            autoComplete="organization"
            placeholder="Nome empresarial registrado"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup error={errors.code} errorId="company-code-error">
              <TextField
                id="company-code"
                label="Código *"
                value={draft.code}
                onChange={(event) =>
                  onUpdate(
                    'code',
                    event.target.value.replace(/\\D/g, '').slice(0, 32),
                  )
                }
                inputMode="numeric"
                maxLength={32}
                placeholder="Ex.: 007"
                required
                aria-invalid={Boolean(errors.code)}
                aria-describedby={
                  errors.code ? 'company-code-error' : 'company-code-hint'
                }
              />
              {!errors.code && (
                <p
                  id="company-code-hint"
                  className="mt-1.5 text-xs text-[var(--color-text-muted)]"
                >
                  Somente números, com até 32 dígitos.
                </p>
              )}
            </FieldGroup>
            <FieldGroup error={errors.cnpj} errorId="company-cnpj-error">
              <TextField
                id="company-cnpj"
                label="CNPJ (opcional)"
                value={draft.cnpj}
                onChange={(event) =>
                  onUpdate('cnpj', formatCnpj(event.target.value))
                }
                inputMode="numeric"
                maxLength={18}
                placeholder="00.000.000/0000-00"
                aria-invalid={Boolean(errors.cnpj)}
                aria-describedby={errors.cnpj ? 'company-cnpj-error' : undefined}
              />
            </FieldGroup>
          </div>
        </div>

        <div className="space-y-4">
          <FieldGroup error={errors.email} errorId="company-email-error">
            <TextField
              id="company-email"
              label="E-mail (opcional)"
              type="email"
              value={draft.email}
              onChange={(event) => onUpdate('email', event.target.value)}
              autoComplete="email"
              placeholder="contato@empresa.com.br"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'company-email-error' : undefined}
            />
          </FieldGroup>
          <TextField
            id="company-phone"
            label="Celular (opcional)"
            type="tel"
            value={draft.mobilePhone}
            onChange={(event) => onUpdate('mobilePhone', event.target.value)}
            autoComplete="tel"
            placeholder="(21) 99999-9999"
          />
          <TextField
            id="company-tax-regime"
            label="Regime tributário (opcional)"
            value={draft.taxRegime}
            onChange={(event) => onUpdate('taxRegime', event.target.value)}
            list="company-tax-regime-options"
            maxLength={80}
            placeholder="Ex.: Simples Nacional"
          />
          <datalist id="company-tax-regime-options">
            {clientTaxRegimeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
          <div className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4">
            <p className="text-sm font-black text-[var(--color-text-strong)]">
              O que acontece depois?
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
              Na próxima etapa você pode escolher uma tela de trabalho e as
              rotinas que serão vinculadas à empresa.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function CompanyOperationsStep({
  screens,
  routines,
  draft,
  selectedScreen,
  selectedRoutineIds,
  errors,
  routineSearch,
  onScreenChange,
  onRestoreSuggestions,
  pendingScreenId,
  pendingScreen,
  onConfirmScreenChange,
  onCancelScreenChange,
  onStartChange,
  onRoutineSearchChange,
  onRoutineToggle,
}: {
  screens: Screen[]
  routines: Routine[]
  draft: CompanyDraft
  selectedScreen?: Screen
  selectedRoutineIds: Set<string>
  errors: CompanyErrors
  routineSearch: string
  onScreenChange: (screenId: string) => void
  onRestoreSuggestions: () => void
  pendingScreenId: string | null
  pendingScreen?: Screen
  onConfirmScreenChange: () => void
  onCancelScreenChange: () => void
  onStartChange: (startsOn: string) => void
  onRoutineSearchChange: (value: string) => void
  onRoutineToggle: (routineId: string) => void
}) {
  const visibleRoutines = [...routines].sort(
    (left, right) =>
      Number(selectedRoutineIds.has(right.id)) -
        Number(selectedRoutineIds.has(left.id)) ||
      Number(
        Boolean(selectedScreen?.routines.some((item) => item.id === right.id)),
      ) -
        Number(
          Boolean(selectedScreen?.routines.some((item) => item.id === left.id)),
        ) ||
      left.name.localeCompare(right.name, 'pt-BR'),
  )

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.75fr)_minmax(30rem,1.25fr)]">
      <Card>
        <StepHeader
          eyebrow="Etapa 2 de 3"
          title="Organize a operação"
          description="A empresa já pertence ao tenant inteiro. Escolha, se necessário, uma tela inicial e as rotinas que serão vinculadas."
        />
        <div className="space-y-4 px-5 py-5">
          <FieldGroup error={errors.startsOn} errorId="company-starts-on-error">
            <TextField
              id="company-starts-on"
              label="Início da vigência das rotinas"
              type="date"
              value={draft.startsOn}
              onChange={(event) => onStartChange(event.target.value)}
              required={selectedRoutineIds.size > 0}
              aria-invalid={Boolean(errors.startsOn)}
              aria-describedby={
                errors.startsOn
                  ? 'company-starts-on-error'
                  : 'company-starts-on-hint'
              }
            />
            {!errors.startsOn && (
              <p
                id="company-starts-on-hint"
                className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]"
              >
                Informe esta data somente quando houver rotinas selecionadas.
              </p>
            )}
          </FieldGroup>
          <fieldset>
            <legend className="text-sm font-medium text-[var(--color-text-muted)]">
              Tela operacional (opcional)
            </legend>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
              A tela organiza a matriz e pode sugerir as rotinas iniciais; ela
              não altera o vínculo das rotinas com a empresa.
            </p>
            <div className="mt-3 grid gap-2">
              <ScreenChoice
                checked={!draft.screenId}
                label="Sem tela inicial"
                description="Crie a empresa e as rotinas sem incluí-la em uma matriz agora."
                onChange={() => onScreenChange('')}
              />
              {screens.map((screen) => (
                <ScreenChoice
                  key={screen.id}
                  checked={draft.screenId === screen.id}
                  label={screen.name}
                  description={
                    screen.companies.length +
                    (screen.companies.length === 1
                      ? ' empresa · '
                      : ' empresas · ') +
                    screen.routines.length +
                    (screen.routines.length === 1
                      ? ' rotina sugerida'
                      : ' rotinas sugeridas')
                  }
                  onChange={() => onScreenChange(screen.id)}
                />
              ))}
              {screens.length === 0 && (
                <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--color-divider)] px-3 py-3 text-xs leading-5 text-[var(--color-text-muted)]">
                  Ainda não existe uma tela de planilha disponível.
                </p>
              )}
            </div>
          </fieldset>

          {pendingScreenId !== null && (
            <div
              className="rounded-[var(--radius-control)] border border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] p-4"
              role="alert"
            >
              <p className="text-sm font-black text-[var(--status-progress-text)]">
                Trocar de tela substitui as rotinas selecionadas
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                {pendingScreen
                  ? `Usar “${pendingScreen.name}” aplicará as sugestões dessa tela.`
                  : 'Remover a tela limpará as sugestões aplicadas.'}{' '}
                Suas seleções manuais atuais serão removidas.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={onConfirmScreenChange}>
                  Confirmar troca
                </Button>
                <Button size="sm" tone="neutral" onClick={onCancelScreenChange}>
                  Manter seleção atual
                </Button>
              </div>
            </div>
          )}
          <div className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-[var(--color-text-strong)]">
                {selectedScreen
                  ? 'Sugestões da tela ' + selectedScreen.name
                  : 'Escolha uma tela, se necessário'}
              </p>
              {selectedScreen && (
                <Button size="sm" tone="neutral" onClick={onRestoreSuggestions}>
                  Restaurar sugestões
                </Button>
              )}
            </div>
            <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
              Quando selecionada, a tela sugere rotinas e recebe a empresa em
              sua matriz após a criação.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-[var(--color-divider)] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-strong)]">
                Revise as rotinas atribuídas
              </h2>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                {selectedRoutineIds.size}
                {selectedRoutineIds.size === 1
                  ? ' rotina selecionada.'
                  : ' rotinas selecionadas.'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <TextField
              id="company-routine-search"
              label="Buscar rotina"
              type="search"
              value={routineSearch}
              onChange={(event) => onRoutineSearchChange(event.target.value)}
              placeholder="Busque por nome, nome curto ou descrição"
            />
          </div>
        </div>

        {routines.length === 0 ? (
          <EmptyPanel
            title="Nenhuma rotina ativa disponível."
            description="Crie ou vincule uma rotina antes de continuar."
          />
        ) : (
          <fieldset>
            <legend className="sr-only">Rotinas atribuídas à empresa</legend>
            <ul className="max-h-[32rem] divide-y divide-[var(--color-divider)] overflow-y-auto">
              {visibleRoutines.map((routine) => {
                const checked = selectedRoutineIds.has(routine.id)
                const suggested = selectedScreen?.routines.some(
                  (item) => item.id === routine.id,
                )

                return (
                  <li key={routine.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-5 py-3 transition hover:bg-[var(--color-control-hover-bg)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onRoutineToggle(routine.id)}
                        className="mt-0.5 size-4 accent-[var(--color-brand)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-[var(--color-text-strong)]">
                            {routine.name}
                          </span>
                          {suggested && (
                            <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[var(--color-brand)]">
                              Sugerida pela tela
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">
                          {routine.shortName}
                          {' · '}
                          {getRoutineRecurrenceLabel(routine.recurrence)}
                          {' · '}
                          {formatRoutineSchedule(routine)}
                        </span>
                        {routine.description && (
                          <span className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">
                            {routine.description}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )}
      </Card>
    </div>
  )
}

function CompanyReviewStep({
  draft,
  screen,
  routines,
  onChangeStep,
}: {
  draft: CompanyDraft
  screen?: Screen
  routines: Routine[]
  onChangeStep: (step: number) => void
}) {
  return (
    <Card>
      <StepHeader
        eyebrow="Etapa 3 de 3"
        title="Revise antes de criar"
        description="Confira os dados e os vínculos que serão registrados na organização."
      />
      <div className="divide-y divide-[var(--color-divider)] px-5 sm:px-6">
        <ReviewSection title="Dados da empresa" onChange={() => onChangeStep(0)}>
          <ReviewGrid
            entries={[
              ['Nome', draft.name],
              ['Código', draft.code],
              ['Razão social', draft.legalName || 'Não informada'],
              ['CNPJ', draft.cnpj || 'Não informado'],
              ['E-mail', draft.email || 'Não informado'],
              ['Celular', draft.mobilePhone || 'Não informado'],
            ]}
          />
        </ReviewSection>
        <ReviewSection title="Operação" onChange={() => onChangeStep(1)}>
          <ReviewGrid
            entries={[
              [
                'Início das rotinas',
                routines.length > 0 ? formatDate(draft.startsOn) : 'Não se aplica',
              ],
              ['Tela operacional', screen?.name || 'Não selecionada'],
              ['Rotinas', String(routines.length)],
            ]}
          />
          {routines.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Rotinas selecionadas">
              {routines.map((routine) => (
                <li
                  key={routine.id}
                  className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-2"
                >
                  <span className="block text-sm font-black text-[var(--color-text-strong)]">
                    {routine.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                    {routine.shortName} · {getRoutineRecurrenceLabel(routine.recurrence)}{' '}
                    · {formatRoutineSchedule(routine)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ReviewSection>
      </div>
    </Card>
  )
}

function ScreenChoice({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  onChange: () => void
}) {
  return (
    <label
      className={
        'flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-3 transition ' +
        (checked
          ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)]'
          : 'border-[var(--color-divider)] bg-[var(--color-panel-bg)] hover:bg-[var(--color-control-hover-bg)]')
      }
    >
      <input
        type="radio"
        name="company-screen"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-black text-[var(--color-text-strong)]">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">
          {description}
        </span>
      </span>
    </label>
  )
}

function PartialSetupNotice({
  result,
  onCreateAnother,
}: {
  result: CompanySetupPartialResult
  onCreateAnother: () => void
}) {
  const completedSteps = [
    result.linkedRoutineCount
      ? String(result.linkedRoutineCount) +
        (result.linkedRoutineCount === 1
          ? ' rotina vinculada'
          : ' rotinas vinculadas')
      : null,
    result.screenLinked ? 'tela atualizada' : null,
  ].filter((step): step is string => Boolean(step))

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <div className="border-b border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-5 py-5 sm:px-7">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--status-error-text)]">
          Cadastro parcialmente concluído
        </p>
        <h2 className="mt-1 text-xl font-black text-[var(--color-text-strong)]">
          {result.company.name} já foi criada
        </h2>
      </div>
      <div className="px-5 py-5 sm:px-7">
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">
          A API concluiu parte da sequência antes de interromper a operação. Não
          envie novamente este formulário, pois o código da empresa já pode
          estar reservado.
        </p>
        {completedSteps.length > 0 && (
          <p className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] px-3 py-2 text-sm font-semibold text-[var(--color-text-strong)]">
            Concluído: {completedSteps.join(' · ')}
          </p>
        )}
        <p className="mt-3 text-sm font-bold text-[var(--status-error-text)]">
          Próxima ação: {result.nextStep}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to={
              ROUTES.COMPANIES +
              '/' +
              encodeURIComponent(result.company.id) +
              '?source=catalog'
            }
            className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 text-sm font-bold text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          >
            Abrir empresa
          </Link>
          <Button tone="neutral" onClick={onCreateAnother}>
            Cadastrar outra empresa
          </Button>
        </div>
      </div>
    </Card>
  )
}

function StepHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="border-b border-[var(--color-divider)] px-5 py-4 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
        {title}
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    </div>
  )
}

function FieldGroup({
  error,
  errorId,
  children,
}: {
  error?: string
  errorId: string
  children: ReactNode
}) {
  return (
    <div>
      {children}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

function EmptyPanel({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-bold text-[var(--color-text-strong)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
    </div>
  )
}

function ReviewSection({
  title,
  onChange,
  children,
}: {
  title: string
  onChange: () => void
  children: ReactNode
}) {
  return (
    <section className="py-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-[var(--color-text-strong)]">
          {title}
        </h3>
        <Button size="sm" tone="neutral" onClick={onChange}>
          Alterar
        </Button>
      </div>
      {children}
    </section>
  )
}

function ReviewGrid({ entries }: { entries: Array<[string, string]> }) {
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-bold text-[var(--color-text-strong)]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function removeEmptyFields(input: ClientCompanyInput): ClientCompanyInput {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== ''),
  ) as ClientCompanyInput
}

function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCnpj(value: string): string {
  const digits = normalizeDocument(value).slice(0, 14)

  if (digits.length <= 2) return digits
  if (digits.length <= 5) return digits.slice(0, 2) + '.' + digits.slice(2)
  if (digits.length <= 8) {
    return digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5)
  }
  if (digits.length <= 12) {
    return (
      digits.slice(0, 2) +
      '.' +
      digits.slice(2, 5) +
      '.' +
      digits.slice(5, 8) +
      '/' +
      digits.slice(8)
    )
  }

  return (
    digits.slice(0, 2) +
    '.' +
    digits.slice(2, 5) +
    '.' +
    digits.slice(5, 8) +
    '/' +
    digits.slice(8, 12) +
    '-' +
    digits.slice(12)
  )
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isPeriod(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

function formatDate(value: string): string {
  if (!isDate(value)) return 'Não informada'

  const [year, month, day] = value.split('-')
  return day + '/' + month + '/' + year
}

export default CreateCompanyPage
