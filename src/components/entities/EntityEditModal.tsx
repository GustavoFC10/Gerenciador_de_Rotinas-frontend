import { useEffect, useRef, useState, type FormEvent } from 'react'

import {
  clientTaxRegimeOptions,
  routineRecurrenceOptions,
} from '../../constants/entityOptions'
import {
  departmentService,
  type TaskAssigneeResource,
} from '../../services/departmentService'
import {
  companyService,
  type ClientCompanyPatch,
  type ClientCompanyResource,
} from '../../services/companyService'
import type { ApiResponse } from '../../services/httpClient'
import {
  companyRegistrationPatch,
  companyRegistrationValues,
  formatCnpj,
  validateCompanyRegistration,
} from '../../utils/companyIdentity'
import { getErrorPresentation } from '../../utils/apiErrors'
import LoadingState from '../common/LoadingState'
import type { Client, Routine, RoutineRecurrence } from '../../types/domain'
import type { RoutineEditInput } from '../../types/routine'
import { getCompanyCodeLabel } from '../../utils/companyCode'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import Drawer from '../ui/Drawer'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import TextField from '../ui/TextField'
import ClientRoutineAssignmentsPanel from './ClientRoutineAssignmentsPanel'

type EntityEditModalProps =
  | {
      type: 'client'
      entity: Client
      onClose: () => void
      onSave: (changes: ClientCompanyPatch, etag: string) => Promise<void>
      onArchive?: () => Promise<void>
      routines?: Routine[]
      period?: string
    }
  | {
      type: 'routine'
      entity: Routine
      onClose: () => void
      onSave: (changes: RoutineEditInput) => Promise<void>
      onArchive?: () => Promise<void>
    }

type ClientSettingsSection = 'details' | 'routines' | 'danger'

interface EntityEditStatus {
  isSaving: boolean
  setIsSaving: (saving: boolean) => void
}

function EntityEditModal(props: EntityEditModalProps) {
  const [isSaving, setIsSaving] = useState(false)

  return (
    <Drawer
      open
      size="lg"
      ariaLabelledBy="entity-edit-title"
      onClose={props.onClose}
      closeDisabled={isSaving}
      className="bg-[var(--color-app-bg)]"
      bodyClassName="flex flex-col overflow-hidden p-0"
      panelProps={{ 'data-entity-edit-dialog': true }}
    >
      {props.type === 'client' ? (
        <ClientEditRecord
          key={props.entity.id}
          {...props}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
        />
      ) : (
        <RoutineEditForm
          {...props}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
        />
      )}
    </Drawer>
  )
}

type ClientEditProps = Extract<EntityEditModalProps, { type: 'client' }>

function ClientEditRecord(props: ClientEditProps & EntityEditStatus) {
  const id = props.entity.id
  const [result, setResult] =
    useState<ApiResponse<ClientCompanyResource> | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void companyService.get(id, controller.signal).then(
      (response) => {
        if (!controller.signal.aborted) setResult(response)
      },
      (caught) => {
        if (!controller.signal.aborted)
          setError(getErrorPresentation(caught).message)
      },
    )
    return () => controller.abort()
  }, [id, attempt])

  if (!result) {
    return (
      <div className="space-y-4 p-5">
        <h2 id="entity-edit-title" className="app-page-title">
          Configurações da empresa
        </h2>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Button
              onClick={() => {
                setError('')
                setAttempt((value) => value + 1)
              }}
            >
              Tentar novamente
            </Button>
          </>
        ) : (
          <LoadingState message="Carregando cadastro da empresa…" />
        )}
        <Button tone="neutral" onClick={props.onClose} data-overlay-close>
          Fechar
        </Button>
      </div>
    )
  }
  return <ClientEditForm {...props} snapshot={result} />
}

function ClientEditForm({
  entity,
  onClose,
  onSave,
  onArchive,
  routines,
  period,
  snapshot,
  isSaving,
  setIsSaving,
}: ClientEditProps &
  EntityEditStatus & { snapshot: ApiResponse<ClientCompanyResource> }) {
  const baseline = companyRegistrationValues(snapshot.data)
  const [name, setName] = useState(baseline.name)
  const [code, setCode] = useState(baseline.code)
  const [legalName, setLegalName] = useState(baseline.legalName)
  const [cnpj, setCnpj] = useState(baseline.cnpj)
  const [email, setEmail] = useState(baseline.email)
  const [mobilePhone, setMobilePhone] = useState(baseline.mobilePhone)
  const [taxRegime, setTaxRegime] = useState(baseline.taxRegime)
  const [error, setError] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [activeSection, setActiveSection] =
    useState<ClientSettingsSection>('details')
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => nameRef.current?.focus(), [])

  const isRegistrationSection = activeSection === 'details'
  const canManageRoutineAssignments = Boolean(routines && period)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    const values = {
      name,
      code,
      legalName,
      cnpj,
      email,
      mobilePhone,
      taxRegime,
    }
    const [validationError] = Object.values(
      validateCompanyRegistration(values, baseline),
    )
    if (validationError) {
      setError(validationError)
      return
    }

    if (!snapshot.etag) {
      setError(
        'A API não informou a versão da empresa. Reabra a edição para tentar novamente.',
      )
      return
    }

    const patch = companyRegistrationPatch(values, baseline)
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await onSave(patch, snapshot.etag)
      onClose()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível atualizar a empresa.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader
        eyebrow="Empresa"
        title="Configurações"
        description={`${entity.name} · Código ${getCompanyCodeLabel(entity.code)}`}
        onClose={onClose}
        closeDisabled={isSaving}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-5 xl:grid-cols-[11rem_minmax(0,1fr)] xl:gap-7">
          <nav
            aria-label="Seções de configurações da empresa"
            className="border-b border-[var(--color-divider)] pb-3 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-4"
          >
            <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
              Empresa
            </p>
            <div className="grid grid-cols-2 gap-1 xl:block xl:space-y-1">
              <ClientSettingsNavigationItem
                active={activeSection === 'details'}
                label="Dados da empresa"
                onClick={() => setActiveSection('details')}
              />
              {canManageRoutineAssignments && (
                <ClientSettingsNavigationItem
                  active={activeSection === 'routines'}
                  label="Rotinas"
                  onClick={() => setActiveSection('routines')}
                />
              )}
              {onArchive && (
                <ClientSettingsNavigationItem
                  active={activeSection === 'danger'}
                  label="Zona de risco"
                  danger
                  onClick={() => setActiveSection('danger')}
                />
              )}
            </div>
          </nav>

          <div className="min-w-0 max-w-2xl">
            {isRegistrationSection && (
              <form
                id="client-settings-form"
                onSubmit={(event) => void handleSubmit(event)}
                noValidate
              >
                <FormError error={error} />

                {activeSection === 'details' && (
                  <section aria-labelledby="company-general-title">
                    <SectionHeader
                      id="company-general-title"
                      eyebrow="Cadastro"
                      title="Dados da empresa"
                      description="Mantenha as informações de identificação, fiscais e de contato em um único lugar."
                    />
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <TextField
                          ref={nameRef}
                          id="edit-company-name"
                          maxLength={160}
                          label="Nome fantasia"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                        />
                      </div>
                      <TextField
                        id="edit-company-code"
                        label="Código (opcional)"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        inputMode="numeric"
                        maxLength={32}
                      />
                    </div>
                  </section>
                )}

                {activeSection === 'details' && (
                  <section
                    className="mt-8 border-t border-[var(--color-divider)] pt-7"
                    aria-labelledby="company-fiscal-title"
                  >
                    <SectionHeader
                      id="company-fiscal-title"
                      eyebrow="Fiscal"
                      title="Dados fiscais"
                      description="Mantenha os dados usados para identificar a empresa em documentos e relatórios."
                    />
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <TextField
                        id="edit-company-cnpj"
                        label="CNPJ (opcional)"
                        value={cnpj}
                        onChange={(event) =>
                          setCnpj(formatCnpj(event.target.value))
                        }
                        maxLength={18}
                        placeholder="00.000.000/0000-00"
                      />
                      <TextField
                        id="edit-company-legal-name"
                        maxLength={200}
                        label="Razão social (opcional)"
                        value={legalName}
                        onChange={(event) => setLegalName(event.target.value)}
                      />
                      <div className="sm:col-span-2">
                        <TextField
                          id="edit-company-tax-regime"
                          label="Regime tributário"
                          value={taxRegime}
                          onChange={(event) => setTaxRegime(event.target.value)}
                          list="edit-company-tax-regime-options"
                          maxLength={80}
                        />
                      </div>
                    </div>
                    <datalist id="edit-company-tax-regime-options">
                      {clientTaxRegimeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </datalist>
                  </section>
                )}

                {activeSection === 'details' && (
                  <section
                    className="mt-8 border-t border-[var(--color-divider)] pt-7"
                    aria-labelledby="company-contact-title"
                  >
                    <SectionHeader
                      id="company-contact-title"
                      eyebrow="Contato"
                      title="Canais de contato"
                      description="Esses dados são opcionais e podem ser atualizados sempre que necessário."
                    />
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <TextField
                        id="edit-company-email"
                        maxLength={254}
                        label="E-mail"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                      <TextField
                        id="edit-company-mobile-phone"
                        maxLength={32}
                        label="Telefone"
                        type="tel"
                        value={mobilePhone}
                        onChange={(event) => setMobilePhone(event.target.value)}
                      />
                    </div>
                  </section>
                )}
              </form>
            )}

            {activeSection === 'routines' && routines && period && (
              <ClientRoutineAssignmentsPanel
                client={entity}
                routines={routines}
                period={period}
                canManage
              />
            )}

            {activeSection === 'danger' && onArchive && (
              <section aria-labelledby="company-danger-title">
                <SectionHeader
                  id="company-danger-title"
                  eyebrow="Zona de risco"
                  title="Arquivar empresa"
                  description="Retire a empresa das operações ativas sem apagar o histórico já registrado."
                />
                <div className="mt-5 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4">
                  <p className="text-sm leading-6 text-[var(--status-error-text)]">
                    Depois do arquivamento, a empresa deixa de aparecer em novas
                    operações. Essa ação preserva os registros anteriores e pode
                    ser recuperada pela administração quando o ciclo de
                    restauração estiver disponível.
                  </p>
                  <Button
                    type="button"
                    tone="neutral"
                    className="mt-4 border-[var(--status-error-border)] text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)]"
                    onClick={() => setConfirmArchive(true)}
                    disabled={isSaving}
                  >
                    Arquivar empresa
                  </Button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-5 py-4 sm:px-6">
        <Button
          type="button"
          tone="neutral"
          onClick={onClose}
          disabled={isSaving}
        >
          {isRegistrationSection ? 'Cancelar' : 'Fechar'}
        </Button>
        {isRegistrationSection && (
          <Button type="submit" form="client-settings-form" disabled={isSaving}>
            {isSaving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        )}
      </footer>
      {onArchive && (
        <ConfirmDialog
          open={confirmArchive}
          title={`Arquivar ${baseline.name}?`}
          description="A empresa deixará de aparecer nas operações ativas. O histórico será preservado."
          cancelLabel="Manter empresa"
          confirmLabel="Arquivar empresa"
          pendingLabel="Arquivando…"
          errorFallback="Não foi possível arquivar a empresa."
          intent="warning"
          onClose={() => setConfirmArchive(false)}
          onConfirm={async () => {
            await onArchive()
            onClose()
          }}
        />
      )}
    </div>
  )
}

function ClientSettingsNavigationItem({
  active,
  label,
  danger = false,
  onClick,
}: {
  active: boolean
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={
        'flex min-h-10 w-full min-w-0 items-center border-l-2 px-3 text-left text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ' +
        (active
          ? danger
            ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
            : 'border-[var(--color-brand)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-strong)]'
          : danger
            ? 'border-transparent text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)]'
            : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-panel-soft-bg)] hover:text-[var(--color-text-strong)]')
      }
    >
      <span className="truncate">{label}</span>
    </button>
  )
}

function RoutineEditForm({
  entity,
  onClose,
  onSave,
  onArchive,
  isSaving,
  setIsSaving,
}: Extract<EntityEditModalProps, { type: 'routine' }> & EntityEditStatus) {
  const [name, setName] = useState(entity.name)
  const [shotname, setShotname] = useState(entity.shortName)
  const [description, setDescription] = useState(entity.description ?? '')
  const [recurrence, setRecurrence] = useState<RoutineRecurrence>(
    entity.recurrence ?? 'monthly',
  )
  const [defaultDueDays, setDefaultDueDays] = useState(
    String(entity.defaultDueDays ?? 0),
  )
  const [defaultAssigneeMemberId, setDefaultAssigneeMemberId] = useState(
    entity.defaultAssigneeMemberId ?? '',
  )
  const [recurrenceMonths, setRecurrenceMonths] = useState<number[]>(
    entity.recurrenceMonths ?? [],
  )
  const [assignees, setAssignees] = useState<TaskAssigneeResource[]>([])
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(true)
  const [assigneesError, setAssigneesError] = useState('')
  const [error, setError] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)

  useEffect(() => {
    let isCurrent = true

    void departmentService
      .getTaskAssignees(entity.departmentId)
      .then((response) => {
        if (isCurrent) setAssignees(response.data)
      })
      .catch((caughtError: unknown) => {
        if (isCurrent) {
          setAssigneesError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Não foi possível carregar os responsáveis elegíveis.',
          )
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingAssignees(false)
      })

    return () => {
      isCurrent = false
    }
  }, [entity.departmentId])

  const cycleOptions = getRecurrenceMonthOptions(recurrence)
  const selectedCycle = recurrenceMonths.join('-')

  function updateRecurrence(nextRecurrence: RoutineRecurrence) {
    setRecurrence(nextRecurrence)
    setRecurrenceMonths([])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    const dueDays = Number(defaultDueDays)

    if (!name.trim()) {
      setError('Informe o título da rotina.')
      return
    }

    if (!shotname.trim()) {
      setError('Informe o nome curto mostrado na tela.')
      return
    }

    if (shotname.trim().length > 32) {
      setError('O nome curto pode ter até 32 caracteres.')
      return
    }

    if (!description.trim()) {
      setError('Informe a descrição da rotina.')
      return
    }

    if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 3750) {
      setError('Informe um prazo inteiro entre 0 e 3.750 dias.')
      return
    }

    const expectedMonths: Partial<Record<RoutineRecurrence, number>> = {
      quarterly: 4,
      semiannual: 2,
      annual: 1,
    }
    const expectedMonthCount = expectedMonths[recurrence]
    if (expectedMonthCount && recurrenceMonths.length !== expectedMonthCount) {
      setError('Selecione o ciclo compatível com a recorrência.')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        shotname: shotname.trim(),
        description: description.trim(),
        recurrence,
        defaultDueDays: dueDays,
        recurrenceMonths,
        defaultAssigneeMemberId: defaultAssigneeMemberId || null,
      })
      onClose()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível publicar a nova versão da rotina.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
    >
      <DrawerHeader
        title="Editar rotina"
        description="A identidade é atualizada e a regra operacional é publicada como uma nova versão."
        onClose={onClose}
        closeDisabled={isSaving}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <FormError error={error} />

        <section aria-labelledby="routine-identity-title">
          <SectionHeader
            id="routine-identity-title"
            eyebrow="Identificação"
            title="Dados da rotina"
            description="O nome curto é exibido nas colunas das telas."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                data-overlay-initial-focus
                id="edit-routine-name"
                label="Título da rotina *"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <TextField
              id="edit-routine-shotname"
              label="Nome curto *"
              value={shotname}
              maxLength={32}
              onChange={(event) => setShotname(event.target.value)}
              required
            />
            <div className="hidden sm:block" aria-hidden="true" />
            <div className="sm:col-span-2">
              <Textarea
                id="edit-routine-description"
                label="Descrição *"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section
          className="mt-7 border-t border-[var(--color-divider)] pt-6"
          aria-labelledby="routine-rule-title"
        >
          <SectionHeader
            id="routine-rule-title"
            eyebrow="Regra publicada"
            title="Padrões de execução"
            description="O prazo é contado a partir do primeiro dia da competência."
          />

          <fieldset className="mt-4">
            <legend className="text-sm font-bold text-[var(--color-text-muted)]">
              Recorrência *
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {routineRecurrenceOptions.map((option) => {
                const selected = recurrence === option.value
                return (
                  <label
                    key={option.value}
                    className={
                      'flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border p-3 ' +
                      (selected
                        ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)]'
                        : 'border-[var(--color-divider)] hover:bg-[var(--color-control-hover-bg)]')
                    }
                  >
                    <input
                      type="radio"
                      name="edit-routine-recurrence"
                      value={option.value}
                      checked={selected}
                      onChange={() => updateRecurrence(option.value)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    <span className="text-sm font-bold text-[var(--color-text-strong)]">
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-routine-due-days"
              label="Prazo padrão (dias) *"
              type="number"
              min="0"
              max="3750"
              value={defaultDueDays}
              onChange={(event) => setDefaultDueDays(event.target.value)}
              required
            />
            <div>
              <Select
                id="edit-routine-assignee"
                label="Responsável padrão (opcional)"
                value={defaultAssigneeMemberId}
                onChange={(event) =>
                  setDefaultAssigneeMemberId(event.target.value)
                }
                disabled={isLoadingAssignees || Boolean(assigneesError)}
                required={false}
              >
                <option value="">
                  {isLoadingAssignees
                    ? 'Carregando responsáveis…'
                    : 'Selecione o responsável'}
                </option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.displayName}
                  </option>
                ))}
              </Select>
              {assigneesError && (
                <p className="mt-1.5 text-xs font-bold text-[var(--status-error-text)]">
                  {assigneesError}
                </p>
              )}
            </div>

            {cycleOptions.length > 0 && (
              <div className="sm:col-span-2">
                <Select
                  id="edit-routine-months"
                  label={
                    recurrence === 'annual'
                      ? 'Mês de execução *'
                      : 'Ciclo de execução *'
                  }
                  value={selectedCycle}
                  onChange={(event) => {
                    const cycle = cycleOptions.find(
                      (option) => option.value === event.target.value,
                    )
                    setRecurrenceMonths(cycle?.months ?? [])
                  }}
                  required
                >
                  <option value="">Selecione</option>
                  {cycleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-5 py-4 sm:px-6">
        <div>
          {onArchive && (
            <Button
              type="button"
              tone="neutral"
              className="border-[var(--status-error-border)] text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)]"
              onClick={() => setConfirmArchive(true)}
              disabled={isSaving}
            >
              Arquivar rotina
            </Button>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            tone="neutral"
            disabled={isSaving}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Salvando…' : 'Salvar e publicar versão'}
          </Button>
        </div>
      </footer>
      {onArchive && (
        <ConfirmDialog
          open={confirmArchive}
          title={`Arquivar ${entity.name}?`}
          description="Todos os vínculos com empresas serão encerrados imediatamente. O histórico de tarefas será preservado."
          cancelLabel="Manter rotina"
          confirmLabel="Arquivar rotina"
          pendingLabel="Arquivando…"
          errorFallback="Não foi possível arquivar a rotina."
          intent="warning"
          onClose={() => setConfirmArchive(false)}
          onConfirm={async () => {
            await onArchive()
            onClose()
          }}
        />
      )}
    </form>
  )
}

function DrawerHeader({
  eyebrow = 'Edição',
  title,
  description,
  onClose,
  closeDisabled,
}: {
  eyebrow?: string
  title: string
  description: string
  onClose: () => void
  closeDisabled: boolean
}) {
  return (
    <header className="flex items-start gap-4 border-b border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-5 py-5 sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
          {eyebrow}
        </p>
        <h2
          id="entity-edit-title"
          className="mt-1 text-xl font-black text-[var(--color-text-strong)]"
        >
          {title}
        </h2>
        <p className="mt-1 max-w-xl text-sm leading-5 text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar edição"
        data-overlay-close
        disabled={closeDisabled}
        className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
      >
        <CloseIcon />
      </button>
    </header>
  )
}

function SectionHeader({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
        {eyebrow}
      </p>
      <h3
        id={id}
        className="mt-1 text-base font-black text-[var(--color-text-strong)]"
      >
        {title}
      </h3>
      <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    </div>
  )
}

function FormError({ error }: { error: string }) {
  if (!error) return null

  return (
    <p
      role="alert"
      className="mb-5 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)]"
    >
      {error}
    </p>
  )
}

function getRecurrenceMonthOptions(
  recurrence: RoutineRecurrence,
): Array<{ value: string; label: string; months: number[] }> {
  if (recurrence === 'quarterly') {
    return [
      {
        value: '1-4-7-10',
        label: 'Janeiro, abril, julho e outubro',
        months: [1, 4, 7, 10],
      },
      {
        value: '2-5-8-11',
        label: 'Fevereiro, maio, agosto e novembro',
        months: [2, 5, 8, 11],
      },
      {
        value: '3-6-9-12',
        label: 'Março, junho, setembro e dezembro',
        months: [3, 6, 9, 12],
      },
    ]
  }

  if (recurrence === 'semiannual') {
    return [
      { value: '1-7', label: 'Janeiro e julho', months: [1, 7] },
      { value: '2-8', label: 'Fevereiro e agosto', months: [2, 8] },
      { value: '3-9', label: 'Março e setembro', months: [3, 9] },
      { value: '4-10', label: 'Abril e outubro', months: [4, 10] },
      { value: '5-11', label: 'Maio e novembro', months: [5, 11] },
      { value: '6-12', label: 'Junho e dezembro', months: [6, 12] },
    ]
  }

  if (recurrence === 'annual') {
    return [
      { value: '1', label: 'Janeiro', months: [1] },
      { value: '2', label: 'Fevereiro', months: [2] },
      { value: '3', label: 'Março', months: [3] },
      { value: '4', label: 'Abril', months: [4] },
      { value: '5', label: 'Maio', months: [5] },
      { value: '6', label: 'Junho', months: [6] },
      { value: '7', label: 'Julho', months: [7] },
      { value: '8', label: 'Agosto', months: [8] },
      { value: '9', label: 'Setembro', months: [9] },
      { value: '10', label: 'Outubro', months: [10] },
      { value: '11', label: 'Novembro', months: [11] },
      { value: '12', label: 'Dezembro', months: [12] },
    ]
  }

  return []
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export default EntityEditModal
