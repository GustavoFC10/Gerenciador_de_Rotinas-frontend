import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

import {
  clientTaxRegimeOptions,
  getRoutineRecurrenceLabel,
  routineRecurrenceOptions,
} from '../../constants/entityOptions'
import type {
  Client,
  ClientDivisionAssignment,
  ClientTaxRegime,
  EntityId,
  Routine,
  RoutineConfigurationUpdateInput,
  RoutineControlData,
  RoutineRecurrence,
  UpdateClientInput,
} from '../../types/domain'
import { normalizeSearch } from '../../utils/normalizeSearch'
import {
  formatRoutineSchedule,
  getRoutineScheduleError,
  normalizeRoutineSchedule,
  type RoutineScheduleValue,
} from '../../utils/routineSchedule'
import RoutineScheduleFields from '../forms/RoutineScheduleFields'
import { CatalogSearchField } from '../catalog/CatalogList'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import TextField from '../ui/TextField'

type EntityEditModalProps =
  | {
      type: 'client'
      entity: Client
      data: RoutineControlData
      onClose: () => void
      onSave: (changes: UpdateClientInput) => void
    }
  | {
      type: 'routine'
      entity: Routine
      data: RoutineControlData
      onClose: () => void
      onSave: (changes: RoutineConfigurationUpdateInput) => void
    }

function EntityEditModal(props: EntityEditModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const dialog = document.querySelector<HTMLElement>(
      '[data-entity-edit-dialog]',
    )
    const focusableSelector = [
      'button:not([disabled])',
      'select:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        props.onClose()
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const focusableElements = [
        ...dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter((element) => element.getClientRects().length > 0)

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstElement = focusableElements[0]!
      const lastElement = focusableElements.at(-1)!

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus()
    }
  }, [props])

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[var(--color-overlay-bg)] backdrop-blur-[2px]"
      role="presentation"
    >
      {props.type === 'client' ? (
        <ClientEditForm {...props} />
      ) : (
        <RoutineEditForm {...props} />
      )}
    </div>
  )
}

function ClientEditForm({
  entity,
  data,
  onClose,
  onSave,
}: Extract<EntityEditModalProps, { type: 'client' }>) {
  const [name, setName] = useState(entity.name)
  const [code, setCode] = useState(entity.code)
  const [legalName, setLegalName] = useState(entity.legalName ?? '')
  const [document, setDocument] = useState(entity.document ?? '')
  const [email, setEmail] = useState(entity.email ?? '')
  const [phone, setPhone] = useState(entity.phone ?? '')
  const [taxRegime, setTaxRegime] = useState<ClientTaxRegime | ''>(
    entity.taxRegime ?? '',
  )
  const [divisionAssignments, setDivisionAssignments] = useState<
    ClientDivisionAssignment[]
  >(entity.divisionAssignments ?? [])
  const initialRoutineIds = data.clientRoutineLinks
    .filter((link) => link.clientId === entity.id)
    .map((link) => link.routineId)
  const [selectedRoutineIds, setSelectedRoutineIds] =
    useState<EntityId[]>(initialRoutineIds)
  const [routineSearch, setRoutineSearch] = useState('')
  const [active, setActive] = useState(entity.active !== false)
  const [error, setError] = useState('')

  const fiscalDepartment = data.departments.find((department) =>
    department.name.toLocaleLowerCase('pt-BR').includes('fiscal'),
  )
  const fiscalDivisions = (data.divisions ?? [])
    .filter(
      (division) =>
        division.departmentId === fiscalDepartment?.id &&
        division.active !== false,
    )
    .sort((left, right) => left.position - right.position)
  const fiscalDivisionId =
    divisionAssignments.find(
      (assignment) => assignment.departmentId === fiscalDepartment?.id,
    )?.divisionId ?? ''
  const presetRoutineIds = (data.divisionRoutineLinks ?? [])
    .filter((link) => link.divisionId === fiscalDivisionId)
    .sort((left, right) => left.position - right.position)
    .map((link) => link.routineId)
  const presetRoutineIdSet = new Set(presetRoutineIds)
  const selectedRoutineIdSet = new Set(selectedRoutineIds)
  const routineQuery = normalizeSearch(routineSearch).trim()

  const fiscalRoutines = data.routines
    .filter(
      (routine) =>
        routine.departmentId === fiscalDepartment?.id &&
        routine.active !== false &&
        (!routineQuery ||
          normalizeSearch(
            [routine.name, routine.description].filter(Boolean).join(' '),
          ).includes(routineQuery)),
    )
    .sort(
      (left, right) =>
        Number(selectedRoutineIdSet.has(right.id)) -
          Number(selectedRoutineIdSet.has(left.id)) ||
        presetRoutineIds.indexOf(left.id) -
          presetRoutineIds.indexOf(right.id) ||
        left.name.localeCompare(right.name, 'pt-BR'),
    )
  const nonFiscalRoutineIds = initialRoutineIds.filter(
    (routineId) =>
      data.routines.find((routine) => routine.id === routineId)
        ?.departmentId !== fiscalDepartment?.id,
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !/^\d{4}$/.test(code.trim())) {
      setError('Informe o nome e um código interno com 4 dígitos.')
      return
    }

    if (document.replace(/\D/g, '').length !== 14) {
      setError('Informe um CNPJ com 14 dígitos.')
      return
    }

    if (fiscalDepartment && !fiscalDivisionId) {
      setError('Selecione a divisão fiscal da empresa.')
      return
    }

    try {
      onSave({
        name: name.trim(),
        code: code.trim(),
        legalName: legalName.trim() || undefined,
        document: document.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        taxRegime: taxRegime || undefined,
        divisionAssignments,
        routineIds: [...nonFiscalRoutineIds, ...selectedRoutineIds],
        active,
      })
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Não foi possível atualizar a empresa.',
      )
    }
  }

  function handleFiscalDivisionChange(divisionId: string) {
    if (!fiscalDepartment) return

    setDivisionAssignments((currentAssignments) => {
      const existingAssignment = currentAssignments.find(
        (assignment) => assignment.departmentId === fiscalDepartment.id,
      )
      const remainingAssignments = currentAssignments.filter(
        (assignment) => assignment.departmentId !== fiscalDepartment.id,
      )

      if (!divisionId) return remainingAssignments

      return [
        ...remainingAssignments,
        {
          id:
            existingAssignment?.id ??
            `client-division-${entity.id}-${fiscalDepartment.id}`,
          departmentId: fiscalDepartment.id,
          divisionId,
        },
      ]
    })
  }

  function toggleRoutine(routineId: EntityId) {
    setSelectedRoutineIds((current) =>
      current.includes(routineId)
        ? current.filter((id) => id !== routineId)
        : [...current, routineId],
    )
  }

  function applyFiscalPreset() {
    const otherDepartmentRoutineIds = selectedRoutineIds.filter(
      (routineId) =>
        data.routines.find((routine) => routine.id === routineId)
          ?.departmentId !== fiscalDepartment?.id,
    )
    setSelectedRoutineIds([...otherDepartmentRoutineIds, ...presetRoutineIds])
  }

  return (
    <ModalForm
      title="Editar empresa"
      context={`${entity.code} · ${entity.name}`}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
      pendingSummary={`${selectedRoutineIds.length} rotinas selecionadas`}
    >
      <EditSection title="Cadastro">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <TextField
            label="Nome de exibição *"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <TextField
            label="Código interno *"
            value={code}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, '').slice(0, 4))
            }
          />
          <TextField
            label="Razão social"
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
            className="sm:col-span-2"
          />
          <TextField
            label="CNPJ *"
            value={document}
            onChange={(event) => setDocument(event.target.value)}
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
          />
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="contato@empresa.com"
          />
          <TextField
            label="Telefone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(00) 0000-0000"
          />
          <Select
            label="Regime tributário"
            value={taxRegime}
            onChange={(event) =>
              setTaxRegime(event.target.value as ClientTaxRegime | '')
            }
          >
            <option value="">Não informado</option>
            {clientTaxRegimeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <EntityStatusField active={active} onChange={setActive} />
        </div>
      </EditSection>

      <EditSection title="Configuração fiscal">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Select
            label="Divisão fiscal *"
            value={fiscalDivisionId}
            onChange={(event) => handleFiscalDivisionChange(event.target.value)}
          >
            <option value="">Selecione uma divisão</option>
            {fiscalDivisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </Select>
          <Button
            tone="neutral"
            onClick={applyFiscalPreset}
            disabled={!fiscalDivisionId}
          >
            Aplicar predefinição
          </Button>
        </div>

        <p className="mt-4 text-xs leading-5 text-[var(--color-text-muted)]">
          A divisão define a planilha. Rotinas podem ser incluídas ou removidas
          individualmente antes de salvar.
        </p>

        <div className="mt-3">
          <CatalogSearchField
            label="Buscar rotinas fiscais"
            value={routineSearch}
            onChange={setRoutineSearch}
            placeholder="Buscar rotina fiscal"
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-divider)]">
          <div className="flex items-center justify-between gap-3 bg-[var(--color-panel-soft-bg)] px-3 py-2 text-xs font-bold text-[var(--color-text-muted)]">
            <span>{selectedRoutineIds.length} rotinas vinculadas</span>
            <span>Selecionadas primeiro</span>
          </div>
          <ul className="divide-y divide-[var(--color-divider)]">
            {fiscalRoutines.map((routine) => {
              const checked = selectedRoutineIdSet.has(routine.id)
              return (
                <li key={routine.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-[var(--color-control-hover-bg)]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRoutine(routine.id)}
                      className="mt-1 size-4 accent-[var(--color-brand)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[var(--color-text-strong)]">
                          {routine.name}
                        </span>
                        {presetRoutineIdSet.has(routine.id) && (
                          <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--color-brand)]">
                            Predefinição
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                        {getRoutineRecurrenceLabel(routine.recurrence)} ·{' '}
                        {formatRoutineSchedule(routine)}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </EditSection>
    </ModalForm>
  )
}

function RoutineEditForm({
  entity,
  data,
  onClose,
  onSave,
}: Extract<EntityEditModalProps, { type: 'routine' }>) {
  const [name, setName] = useState(entity.name)
  const [shortName, setShortName] = useState(entity.shortName)
  const [description, setDescription] = useState(entity.description ?? '')
  const [recurrence, setRecurrence] = useState<RoutineRecurrence>(
    entity.recurrence ?? 'monthly',
  )
  const [schedule, setSchedule] = useState<RoutineScheduleValue>({
    defaultDueDays: entity.defaultDueDays,
    defaultDueDay: entity.defaultDueDay,
    recurrenceMonths: entity.recurrenceMonths,
  })
  const [defaultAssigneeId, setDefaultAssigneeId] = useState(
    entity.defaultAssigneeId ?? '',
  )
  const [active, setActive] = useState(entity.active !== false)
  const [error, setError] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [unlinkClientIds, setUnlinkClientIds] = useState<EntityId[]>([])
  const availableEmployees = data.employees
    .filter(
      (employee) =>
        employee.active !== false &&
        (!employee.departmentIds?.length ||
          employee.departmentIds.includes(entity.departmentId)),
    )
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  const linkedCompanies = data.clientRoutineLinks
    .filter((link) => link.routineId === entity.id)
    .map((link) => ({
      link,
      client: data.clients.find((client) => client.id === link.clientId),
    }))
    .filter((item): item is typeof item & { client: Client } =>
      Boolean(item.client),
    )
    .filter(({ client }) =>
      normalizeSearch(
        [client.code, client.name, client.document, client.email]
          .filter(Boolean)
          .join(' '),
      ).includes(normalizeSearch(clientSearch).trim()),
    )
    .sort(
      (left, right) =>
        Number(unlinkClientIds.includes(left.client.id)) -
          Number(unlinkClientIds.includes(right.client.id)) ||
        left.client.code.localeCompare(right.client.code, 'pt-BR', {
          numeric: true,
        }),
    )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !shortName.trim()) {
      setError('Informe o nome e o nome curto da rotina.')
      return
    }

    const scheduleError = getRoutineScheduleError(recurrence, schedule)
    if (scheduleError) {
      setError(scheduleError)
      return
    }

    const normalizedSchedule = normalizeRoutineSchedule(recurrence, schedule)

    try {
      onSave({
        routine: {
          name: name.trim(),
          shortName: shortName.trim(),
          description: description.trim() || undefined,
          recurrence,
          defaultDueDays: normalizedSchedule.defaultDueDays,
          defaultDueDay: normalizedSchedule.defaultDueDay,
          recurrenceMonths: normalizedSchedule.recurrenceMonths,
          defaultAssigneeId: defaultAssigneeId || null,
          active,
        },
        unlinkClientIds,
      })
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Não foi possível atualizar a rotina.',
      )
    }
  }

  return (
    <ModalForm
      title="Editar rotina"
      context={entity.name}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
      pendingSummary={
        unlinkClientIds.length > 0
          ? `${unlinkClientIds.length} desvínculo${unlinkClientIds.length === 1 ? '' : 's'} pendente${unlinkClientIds.length === 1 ? '' : 's'}`
          : undefined
      }
    >
      <EditSection title="Informações">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nome *"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <TextField
            label="Nome curto *"
            value={shortName}
            onChange={(event) => setShortName(event.target.value)}
          />
          <Textarea
            label="Descrição"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="sm:col-span-2"
          />
        </div>
      </EditSection>

      <EditSection title="Execução">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Recorrência *"
            value={recurrence}
            onChange={(event) => {
              setRecurrence(event.target.value as RoutineRecurrence)
              setSchedule({})
              setError('')
            }}
          >
            {routineRecurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Responsável padrão"
            value={defaultAssigneeId}
            onChange={(event) => setDefaultAssigneeId(event.target.value)}
          >
            <option value="">Sem responsável padrão</option>
            {availableEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
          <RoutineScheduleFields
            recurrence={recurrence}
            value={schedule}
            onChange={(value) => {
              setSchedule(value)
              setError('')
            }}
            idPrefix="routine-edit"
          />
          <EntityStatusField active={active} onChange={setActive} />
        </div>
      </EditSection>

      <EditSection title="Empresas vinculadas">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">
            O desvínculo impede novas tarefas. As tarefas já criadas permanecem
            no histórico.
          </p>
          <span className="rounded-full bg-[var(--color-panel-soft-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)] ring-1 ring-[var(--color-divider)]">
            {
              data.clientRoutineLinks.filter(
                (link) => link.routineId === entity.id,
              ).length
            }{' '}
            vinculadas
          </span>
        </div>

        <div className="mt-3">
          <CatalogSearchField
            label="Buscar empresas vinculadas"
            value={clientSearch}
            onChange={setClientSearch}
            placeholder="Buscar empresa vinculada"
          />
        </div>

        <ul className="mt-3 divide-y divide-[var(--color-divider)] overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-divider)]">
          {linkedCompanies.map(({ client, link }) => {
            const willUnlink = unlinkClientIds.includes(client.id)
            const division = data.divisions?.find(
              (item) => item.id === link.divisionId,
            )

            return (
              <li
                key={client.id}
                className={`flex flex-wrap items-center gap-3 px-3 py-3 ${
                  willUnlink
                    ? 'bg-[var(--status-error-bg)]'
                    : 'bg-[var(--color-panel-bg)]'
                }`}
              >
                <span className="w-12 shrink-0 text-xs font-black text-[var(--color-text-muted)]">
                  {client.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-extrabold ${
                      willUnlink
                        ? 'text-[var(--status-error-text)] line-through'
                        : 'text-[var(--color-text-strong)]'
                    }`}
                  >
                    {client.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                    {division?.name ?? 'Sem divisão'}
                    {link.source === 'preset' ? ' · Predefinição' : ''}
                  </span>
                </span>
                {willUnlink && (
                  <span className="text-xs font-bold text-[var(--status-error-text)]">
                    Será desvinculada
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setUnlinkClientIds((current) =>
                      current.includes(client.id)
                        ? current.filter((id) => id !== client.id)
                        : [...current, client.id],
                    )
                  }
                  className={`min-h-9 shrink-0 rounded-[var(--radius-control)] border px-3 text-xs font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${
                    willUnlink
                      ? 'border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] text-[var(--color-button-neutral-text)] hover:bg-[var(--color-button-neutral-hover-bg)]'
                      : 'border-[var(--status-error-border)] text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)]'
                  }`}
                  aria-label={`${
                    willUnlink ? 'Manter vínculo com' : 'Desvincular'
                  } ${client.name}`}
                >
                  {willUnlink ? 'Manter vínculo' : 'Desvincular'}
                </button>
              </li>
            )
          })}
        </ul>

        {linkedCompanies.length === 0 && (
          <p className="mt-3 rounded-[var(--radius-control)] border border-dashed border-[var(--color-divider)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            Nenhuma empresa vinculada encontrada.
          </p>
        )}
      </EditSection>
    </ModalForm>
  )
}

function EditSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-3 border-b border-[var(--color-divider)] pb-6 last:border-b-0 last:pb-0 [&+section]:pt-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-6">
      <h3 className="pt-0.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
        {title}
      </h3>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function ModalForm({
  title,
  context,
  error,
  onClose,
  onSubmit,
  children,
  pendingSummary,
}: {
  title: string
  context: string
  error: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  pendingSummary?: string
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex h-dvh w-full max-w-4xl flex-col overflow-hidden border-l border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-edit-title"
      data-entity-edit-dialog
      tabIndex={-1}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[var(--color-text-muted)]">
            {context}
          </p>
          <h2
            id="entity-edit-title"
            className="mt-0.5 text-xl font-black tracking-tight text-[var(--color-text-strong)]"
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-lg font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          aria-label="Fechar edição"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {error && (
          <p
            className="mb-4 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {children}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-4 py-3 sm:px-6">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
          {pendingSummary ?? 'Revise os campos antes de salvar'}
        </span>
        <div className="flex justify-end gap-2">
          <Button type="button" tone="neutral" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" tone="primary">
            Salvar alterações
          </Button>
        </div>
      </footer>
    </form>
  )
}

function EntityStatusField({
  active,
  onChange,
}: {
  active: boolean
  onChange: (active: boolean) => void
}) {
  return (
    <Select
      label="Situação do cadastro"
      value={active ? 'active' : 'inactive'}
      onChange={(event) => onChange(event.target.value === 'active')}
    >
      <option value="active">Ativo</option>
      <option value="inactive">Inativo</option>
    </Select>
  )
}

export default EntityEditModal
