import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import {
  CreationErrorSummary,
  CreationSuccess,
  FieldError,
} from '../components/forms/CreationFeedback'
import CreationProgress from '../components/forms/CreationProgress'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import { focusRing } from '../constants/designTokens'
import {
  getClientTaxRegimeLabel,
  getRoutineRecurrenceLabel,
} from '../constants/entityOptions'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type {
  Client,
  ClientTaxRegime,
  CreateClientInput,
  DepartmentDivision,
  EntityId,
  Routine,
  RoutineControlData,
} from '../types/domain'

const steps = [
  {
    id: 'company',
    label: 'Dados da empresa',
    description: 'Identificação e contato',
  },
  {
    id: 'routines',
    label: 'Fiscal e rotinas',
    description: 'Predefinição e ajustes',
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
  document: string
  email: string
  phone: string
  divisionId: EntityId
  routineIds: EntityId[]
}

type CompanyField =
  'name' | 'code' | 'document' | 'email' | 'divisionId' | 'submit'

type CompanyErrors = Partial<Record<CompanyField, string>>

export interface CreateCompanyResult {
  client: Client
  createdTaskCount: number
  linkedRoutineCount?: number
}

interface CreateCompanyPageProps {
  data: RoutineControlData
  onCreate: (input: CreateClientInput) => CreateCompanyResult
}

const initialDraft: CompanyDraft = {
  name: '',
  legalName: '',
  code: '',
  document: '',
  email: '',
  phone: '',
  divisionId: '',
  routineIds: [],
}

function CreateCompanyPage({ data, onCreate }: CreateCompanyPageProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<CompanyDraft>(initialDraft)
  const [errors, setErrors] = useState<CompanyErrors>({})
  const [routineSearch, setRoutineSearch] = useState('')
  const [pendingDivisionId, setPendingDivisionId] = useState<EntityId | null>(
    null,
  )
  const [result, setResult] = useState<CreateCompanyResult | null>(null)

  const fiscalDepartment = useMemo(
    () =>
      data.departments.find(
        (department) =>
          department.name.toLocaleLowerCase('pt-BR').includes('fiscal') &&
          data.divisions?.some(
            (division) => division.departmentId === department.id,
          ),
      ) ??
      data.departments.find((department) =>
        data.divisions?.some(
          (division) => division.departmentId === department.id,
        ),
      ),
    [data.departments, data.divisions],
  )
  const fiscalDivisions = useMemo(
    () =>
      (data.divisions ?? [])
        .filter(
          (division) =>
            division.departmentId === fiscalDepartment?.id &&
            division.active !== false,
        )
        .sort((left, right) => left.position - right.position),
    [data.divisions, fiscalDepartment?.id],
  )
  const fiscalRoutines = useMemo(
    () =>
      data.routines
        .filter(
          (routine) =>
            routine.departmentId === fiscalDepartment?.id &&
            routine.active !== false,
        )
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [data.routines, fiscalDepartment?.id],
  )
  const selectedDivision = fiscalDivisions.find(
    (division) => division.id === draft.divisionId,
  )
  const presetRoutineIds = useMemo(
    () =>
      getPresetRoutineIds(draft.divisionId, data.divisionRoutineLinks ?? []),
    [data.divisionRoutineLinks, draft.divisionId],
  )
  const selectedRoutineIds = useMemo(
    () => new Set(draft.routineIds),
    [draft.routineIds],
  )
  const presetRoutineIdSet = useMemo(
    () => new Set(presetRoutineIds),
    [presetRoutineIds],
  )
  const filteredRoutines = useMemo(() => {
    const query = routineSearch.trim().toLocaleLowerCase('pt-BR')
    if (!query) return fiscalRoutines

    return fiscalRoutines.filter((routine) =>
      [routine.name, routine.description]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase('pt-BR').includes(query)),
    )
  }, [fiscalRoutines, routineSearch])
  const selectedRoutines = fiscalRoutines.filter((routine) =>
    selectedRoutineIds.has(routine.id),
  )
  const removedSuggestionCount = presetRoutineIds.filter(
    (routineId) => !selectedRoutineIds.has(routineId),
  ).length
  const manuallyAddedCount = draft.routineIds.filter(
    (routineId) => !presetRoutineIdSet.has(routineId),
  ).length

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
          title={result.client.name}
          description="O cadastro, a divisão fiscal e os vínculos escolhidos foram salvos nesta sessão. Rotinas da predefinição passam a compor a planilha; rotinas extras continuam disponíveis somente nas listagens."
          detail={`${result.linkedRoutineCount ?? draft.routineIds.length} rotinas vinculadas · ${result.createdTaskCount} tarefas geradas para a competência atual`}
          primaryAction={{
            label: 'Abrir empresa',
            to: `${ROUTES.COMPANIES}/${encodeURIComponent(
              result.client.id,
            )}?divisionId=${encodeURIComponent(draft.divisionId)}`,
          }}
          secondaryAction={{
            label: 'Cadastrar outra',
            onClick: () => {
              setDraft(initialDraft)
              setErrors({})
              setRoutineSearch('')
              setStep(0)
              setResult(null)
            },
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

  function applyDivision(divisionId: EntityId) {
    updateDraft('divisionId', divisionId)
    updateDraft(
      'routineIds',
      getPresetRoutineIds(divisionId, data.divisionRoutineLinks ?? []),
    )
    setPendingDivisionId(null)
  }

  function requestDivisionChange(divisionId: EntityId) {
    if (divisionId === draft.divisionId) return

    const hasManualAdjustments =
      draft.divisionId && !haveSameIds(draft.routineIds, presetRoutineIds)

    if (hasManualAdjustments) {
      setPendingDivisionId(divisionId)
      return
    }

    applyDivision(divisionId)
  }

  function toggleRoutine(routineId: EntityId) {
    updateDraft(
      'routineIds',
      selectedRoutineIds.has(routineId)
        ? draft.routineIds.filter((id) => id !== routineId)
        : [...draft.routineIds, routineId],
    )
  }

  function validateCompanyData(): CompanyErrors {
    const nextErrors: CompanyErrors = {}
    const normalizedCode = draft.code.trim()
    const normalizedDocument = normalizeDocument(draft.document)

    if (!draft.name.trim()) {
      nextErrors.name = 'Informe o nome da empresa.'
    }

    if (!/^\d{4}$/.test(normalizedCode)) {
      nextErrors.code = 'O código deve ter exatamente 4 dígitos.'
    } else if (
      data.clients.some((client) => client.code.trim() === normalizedCode)
    ) {
      nextErrors.code = 'Este código já pertence a outra empresa.'
    }

    if (normalizedDocument.length !== 14) {
      nextErrors.document = 'Informe um CNPJ com 14 dígitos.'
    } else if (
      data.clients.some(
        (client) =>
          normalizeDocument(client.document ?? '') === normalizedDocument,
      )
    ) {
      nextErrors.document = 'Este CNPJ já está cadastrado.'
    }

    if (
      draft.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
    ) {
      nextErrors.email = 'Informe um e-mail válido.'
    }

    return nextErrors
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      if (!draft.divisionId) {
        setErrors({
          divisionId: 'Escolha uma predefinição fiscal para continuar.',
        })
        return
      }

      setErrors({})
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const finalErrors = validateCompanyData()
    if (!draft.divisionId) {
      finalErrors.divisionId = 'Escolha uma predefinição fiscal.'
    }
    if (Object.keys(finalErrors).length > 0 || !fiscalDepartment) {
      setErrors(
        fiscalDepartment
          ? finalErrors
          : { submit: 'Nenhum departamento fiscal está configurado.' },
      )
      setStep(
        Object.keys(finalErrors).some((key) => key !== 'divisionId') ? 0 : 1,
      )
      return
    }

    try {
      const created = onCreate({
        name: draft.name.trim(),
        legalName: draft.legalName.trim() || undefined,
        code: draft.code.trim(),
        document: formatCnpj(draft.document),
        email: draft.email.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        departmentId: fiscalDepartment.id,
        divisionId: draft.divisionId,
        taxRegime: getTaxRegime(selectedDivision),
        routineIds: draft.routineIds,
      })
      setErrors({})
      setResult(created)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : 'Não foi possível criar a empresa.',
      })
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

      <form onSubmit={handleSubmit} noValidate>
        <CreationErrorSummary
          messages={Object.values(errors).filter((message): message is string =>
            Boolean(message),
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
            <CompanyRoutinesStep
              divisions={fiscalDivisions}
              selectedDivisionId={draft.divisionId}
              pendingDivisionId={pendingDivisionId}
              routines={filteredRoutines}
              selectedRoutineIds={selectedRoutineIds}
              presetRoutineIds={presetRoutineIdSet}
              selectedCount={draft.routineIds.length}
              totalCount={fiscalRoutines.length}
              routineSearch={routineSearch}
              divisionError={errors.divisionId}
              onDivisionChange={requestDivisionChange}
              onPendingDivisionConfirm={() => {
                if (pendingDivisionId) applyDivision(pendingDivisionId)
              }}
              onPendingDivisionCancel={() => setPendingDivisionId(null)}
              onRoutineSearchChange={setRoutineSearch}
              onRoutineToggle={toggleRoutine}
              onRestorePreset={() =>
                updateDraft('routineIds', presetRoutineIds)
              }
            />
          )}
          {step === 2 && (
            <CompanyReviewStep
              draft={draft}
              division={selectedDivision}
              routines={selectedRoutines}
              removedSuggestionCount={removedSuggestionCount}
              manuallyAddedCount={manuallyAddedCount}
              onChangeStep={setStep}
            />
          )}
        </div>

        <div className="sticky bottom-0 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[color-mix(in_srgb,var(--color-panel-bg)_94%,transparent)] px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur sm:px-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            {step === 0 && 'Campos marcados com * são obrigatórios.'}
            {step === 1 &&
              `${draft.routineIds.length} de ${fiscalRoutines.length} rotinas selecionadas.`}
            {step === 2 && 'Nada será criado antes da confirmação.'}
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              tone="neutral"
              onClick={() =>
                step === 0 ? navigate(ROUTES.HOME) : setStep(step - 1)
              }
            >
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </Button>
            <Button type="submit" tone="primary">
              {step === 2
                ? `Criar empresa e vincular ${draft.routineIds.length} ${
                    draft.routineIds.length === 1 ? 'rotina' : 'rotinas'
                  }`
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
      <div className="border-b border-[var(--color-divider)] px-5 py-4 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
          Etapa 1 de 3
        </p>
        <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
          Identifique a empresa
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--color-text-muted)]">
          Nome, código e CNPJ são a base do cadastro. Os dados de contato podem
          ser completados agora ou editados depois.
        </p>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <TextField
              id="company-name"
              label="Nome da empresa *"
              value={draft.name}
              onChange={(event) => onUpdate('name', event.target.value)}
              autoComplete="organization"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'company-name-error' : undefined}
              placeholder="Ex.: Aurora Comércio"
              required
            />
            <FieldError id="company-name-error">{errors.name}</FieldError>
          </div>

          <TextField
            id="company-legal-name"
            label="Razão social (opcional)"
            value={draft.legalName}
            onChange={(event) => onUpdate('legalName', event.target.value)}
            autoComplete="organization"
            placeholder="Nome empresarial registrado"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <TextField
                id="company-code"
                label="Código *"
                value={draft.code}
                onChange={(event) =>
                  onUpdate(
                    'code',
                    event.target.value.replace(/\D/g, '').slice(0, 4),
                  )
                }
                inputMode="numeric"
                maxLength={4}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={
                  errors.code ? 'company-code-error' : 'company-code-hint'
                }
                placeholder="0001"
                required
              />
              <p
                id="company-code-hint"
                className="mt-1.5 text-xs text-[var(--color-text-muted)]"
              >
                Identificador interno com 4 dígitos.
              </p>
              <FieldError id="company-code-error">{errors.code}</FieldError>
            </div>
            <div>
              <TextField
                id="company-document"
                label="CNPJ *"
                value={draft.document}
                onChange={(event) =>
                  onUpdate('document', formatCnpj(event.target.value))
                }
                inputMode="numeric"
                maxLength={18}
                autoComplete="off"
                aria-invalid={Boolean(errors.document)}
                aria-describedby={
                  errors.document ? 'company-document-error' : undefined
                }
                placeholder="00.000.000/0000-00"
                required
              />
              <FieldError id="company-document-error">
                {errors.document}
              </FieldError>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <TextField
              id="company-email"
              label="E-mail (opcional)"
              type="email"
              value={draft.email}
              onChange={(event) => onUpdate('email', event.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? 'company-email-error' : undefined
              }
              placeholder="contato@empresa.com.br"
            />
            <FieldError id="company-email-error">{errors.email}</FieldError>
          </div>
          <TextField
            id="company-phone"
            label="Telefone (opcional)"
            type="tel"
            value={draft.phone}
            onChange={(event) => onUpdate('phone', event.target.value)}
            autoComplete="tel"
            placeholder="(21) 99999-9999"
          />
          <div className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4">
            <p className="text-sm font-black text-[var(--color-text-strong)]">
              O que acontece depois?
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
              Na próxima etapa você escolhe a divisão fiscal, revisa as rotinas
              sugeridas e decide quais tarefas devem ser criadas.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function CompanyRoutinesStep({
  divisions,
  selectedDivisionId,
  pendingDivisionId,
  routines,
  selectedRoutineIds,
  presetRoutineIds,
  selectedCount,
  totalCount,
  routineSearch,
  divisionError,
  onDivisionChange,
  onPendingDivisionConfirm,
  onPendingDivisionCancel,
  onRoutineSearchChange,
  onRoutineToggle,
  onRestorePreset,
}: {
  divisions: DepartmentDivision[]
  selectedDivisionId: EntityId
  pendingDivisionId: EntityId | null
  routines: Routine[]
  selectedRoutineIds: Set<EntityId>
  presetRoutineIds: Set<EntityId>
  selectedCount: number
  totalCount: number
  routineSearch: string
  divisionError?: string
  onDivisionChange: (divisionId: EntityId) => void
  onPendingDivisionConfirm: () => void
  onPendingDivisionCancel: () => void
  onRoutineSearchChange: (value: string) => void
  onRoutineToggle: (routineId: EntityId) => void
  onRestorePreset: () => void
}) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.75fr)_minmax(30rem,1.25fr)]">
      <Card>
        <div className="border-b border-[var(--color-divider)] px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
            Etapa 2 de 3
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
            Escolha a predefinição fiscal
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
            A divisão organiza a empresa na planilha e sugere um conjunto
            inicial de rotinas. Ela não substitui o regime tributário.
          </p>
        </div>

        <fieldset
          id="company-division"
          className="space-y-2 px-5 py-5"
          aria-invalid={Boolean(divisionError)}
          aria-required="true"
          aria-describedby={
            divisionError ? 'company-division-error' : undefined
          }
        >
          <legend className="sr-only">Predefinição fiscal</legend>
          {divisions.map((division) => {
            const selected = selectedDivisionId === division.id

            return (
              <label
                key={division.id}
                className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-3 transition ${
                  selected
                    ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)]'
                    : 'border-[var(--color-divider)] bg-[var(--color-panel-bg)] hover:bg-[var(--color-control-hover-bg)]'
                } ${focusRing}`}
              >
                <input
                  type="radio"
                  name="fiscal-division"
                  value={division.id}
                  checked={selected}
                  onChange={() => onDivisionChange(division.id)}
                  className="mt-0.5 size-4 accent-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
                  required
                />
                <span>
                  <span className="block text-sm font-black text-[var(--color-text-strong)]">
                    {division.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">
                    {division.description || 'Predefinição fiscal disponível'}
                  </span>
                </span>
              </label>
            )
          })}
          {divisions.length === 0 && (
            <p className="rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-3 text-sm font-semibold text-[var(--status-error-text)]">
              Nenhuma divisão fiscal está configurada.
            </p>
          )}
          <FieldError id="company-division-error">{divisionError}</FieldError>
        </fieldset>

        {pendingDivisionId && (
          <div
            className="mx-5 mb-5 rounded-[var(--radius-control)] border border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] p-3"
            role="alert"
          >
            <p className="text-sm font-black text-[var(--status-progress-text)]">
              Trocar a predefinição?
            </p>
            <p className="mt-1 text-sm leading-5 text-[var(--status-progress-text)]">
              As seleções manuais atuais serão substituídas pelas sugestões da
              nova divisão.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                tone="primary"
                onClick={onPendingDivisionConfirm}
              >
                Trocar e aplicar sugestões
              </Button>
              <Button
                size="sm"
                tone="neutral"
                onClick={onPendingDivisionCancel}
              >
                Manter seleção atual
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="border-b border-[var(--color-divider)] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-strong)]">
                Revise as rotinas atribuídas
              </h2>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                {selectedCount} de {totalCount} selecionadas. Você pode remover
                sugestões ou adicionar rotinas gerais.
              </p>
            </div>
            <Button
              size="sm"
              tone="neutral"
              onClick={onRestorePreset}
              disabled={!selectedDivisionId}
            >
              Restaurar sugestões
            </Button>
          </div>
          <div className="mt-4">
            <TextField
              id="company-routine-search"
              label="Buscar rotina"
              type="search"
              value={routineSearch}
              onChange={(event) => onRoutineSearchChange(event.target.value)}
              placeholder="Busque por nome ou descrição"
              disabled={!selectedDivisionId}
            />
          </div>
        </div>

        {!selectedDivisionId ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-[var(--color-text-strong)]">
              Escolha uma predefinição para carregar as sugestões.
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              A lista continuará editável antes da confirmação.
            </p>
          </div>
        ) : (
          <fieldset>
            <legend className="sr-only">Rotinas atribuídas à empresa</legend>
            <ul className="max-h-[32rem] divide-y divide-[var(--color-divider)] overflow-y-auto">
              {routines.map((routine) => {
                const checked = selectedRoutineIds.has(routine.id)
                const suggested = presetRoutineIds.has(routine.id)

                return (
                  <li key={routine.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-[var(--color-control-hover-bg)]">
                      <input
                        type="checkbox"
                        name="company-routines"
                        value={routine.id}
                        checked={checked}
                        onChange={() => onRoutineToggle(routine.id)}
                        className="mt-1 size-4 accent-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-[var(--color-text-strong)]">
                            {routine.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              suggested
                                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
                                : 'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-divider)]'
                            }`}
                          >
                            {suggested ? 'Sugerida' : 'Rotina geral'}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">
                          {getRoutineRecurrenceLabel(routine.recurrence)}
                          {routine.defaultDueDay
                            ? ` · prazo padrão: dia ${routine.defaultDueDay}`
                            : routine.defaultDueDays
                              ? ` · prazo padrão: ${routine.defaultDueDays} dias`
                              : ' · prazo definido na tarefa'}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
              {routines.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  Nenhuma rotina corresponde à busca.
                </li>
              )}
            </ul>
          </fieldset>
        )}

        <div className="border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-5 py-3">
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">
            Rotinas gerais adicionadas fora da predefinição ficam acessíveis nas
            listagens da empresa, mas não criam novas colunas nesta planilha.
          </p>
        </div>
      </Card>
    </div>
  )
}

function CompanyReviewStep({
  draft,
  division,
  routines,
  removedSuggestionCount,
  manuallyAddedCount,
  onChangeStep,
}: {
  draft: CompanyDraft
  division?: DepartmentDivision
  routines: Routine[]
  removedSuggestionCount: number
  manuallyAddedCount: number
  onChangeStep: (step: number) => void
}) {
  return (
    <Card>
      <div className="border-b border-[var(--color-divider)] px-5 py-4 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
          Etapa 3 de 3
        </p>
        <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
          Confira antes de criar
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--color-text-muted)]">
          Revise o cadastro e volte diretamente à seção que precisar de ajuste.
        </p>
      </div>

      <div className="divide-y divide-[var(--color-divider)] px-5 sm:px-6">
        <ReviewSection
          title="Empresa"
          onChange={() => onChangeStep(0)}
          rows={[
            ['Nome', draft.name],
            ['Razão social', draft.legalName || 'Não informada'],
            ['Código', draft.code],
            ['CNPJ', formatCnpj(draft.document)],
            ['E-mail', draft.email || 'Não informado'],
            ['Telefone', draft.phone || 'Não informado'],
          ]}
        />
        <ReviewSection
          title="Perfil fiscal"
          onChange={() => onChangeStep(1)}
          rows={[
            ['Divisão fiscal', division?.name ?? 'Não selecionada'],
            [
              'Regime associado',
              getClientTaxRegimeLabel(getTaxRegime(division)),
            ],
          ]}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            <ReviewBadge>
              {routines.length} {routines.length === 1 ? 'rotina' : 'rotinas'}
            </ReviewBadge>
            {removedSuggestionCount > 0 && (
              <ReviewBadge>
                {removedSuggestionCount}{' '}
                {removedSuggestionCount === 1
                  ? 'sugestão removida'
                  : 'sugestões removidas'}
              </ReviewBadge>
            )}
            {manuallyAddedCount > 0 && (
              <ReviewBadge>
                {manuallyAddedCount}{' '}
                {manuallyAddedCount === 1
                  ? 'rotina geral adicionada'
                  : 'rotinas gerais adicionadas'}
              </ReviewBadge>
            )}
          </div>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {routines.map((routine) => (
              <li
                key={routine.id}
                className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-2"
              >
                <p className="text-sm font-bold text-[var(--color-text-strong)]">
                  {routine.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {getRoutineRecurrenceLabel(routine.recurrence)}
                </p>
              </li>
            ))}
            {routines.length === 0 && (
              <li className="text-sm text-[var(--color-text-muted)]">
                Nenhuma rotina será vinculada agora.
              </li>
            )}
          </ul>
        </ReviewSection>
      </div>
    </Card>
  )
}

function ReviewSection({
  title,
  rows,
  onChange,
  children,
}: {
  title: string
  rows: Array<[string, string]>
  onChange: () => void
  children?: React.ReactNode
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
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-bold text-[var(--color-text-muted)]">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-[var(--color-text-strong)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  )
}

function ReviewBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-strong)]">
      {children}
    </span>
  )
}

function getPresetRoutineIds(
  divisionId: EntityId,
  links: Array<{
    divisionId: EntityId
    routineId: EntityId
    position: number
  }>,
): EntityId[] {
  return links
    .filter((link) => link.divisionId === divisionId)
    .sort(
      (left, right) =>
        left.position - right.position ||
        left.routineId.localeCompare(right.routineId),
    )
    .map((link) => link.routineId)
    .filter((routineId, index, values) => values.indexOf(routineId) === index)
}

function haveSameIds(left: EntityId[], right: EntityId[]): boolean {
  if (left.length !== right.length) return false
  const rightIds = new Set(right)
  return left.every((id) => rightIds.has(id))
}

function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14)
}

function formatCnpj(value: string): string {
  const digits = normalizeDocument(value)

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function getTaxRegime(
  division?: DepartmentDivision,
): ClientTaxRegime | undefined {
  if (!division) return undefined

  const slug = division.slug.toLocaleLowerCase('pt-BR')
  if (slug.includes('simples')) return 'simples_nacional'
  if (slug.includes('lucro-presumido')) return 'lucro_presumido'
  if (slug === 'mei' || slug.endsWith('-mei')) return 'mei'
  return undefined
}

export default CreateCompanyPage
