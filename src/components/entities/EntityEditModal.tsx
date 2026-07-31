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
  RoutineControlData,
  RoutineRecurrence,
  UpdateClientInput,
  UpdateRoutineInput,
} from '../../types/domain'
import {
  formatRoutineSchedule,
  getRoutineScheduleError,
  normalizeRoutineSchedule,
  type RoutineScheduleValue,
} from '../../utils/routineSchedule'
import RoutineScheduleFields from '../forms/RoutineScheduleFields'
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
      onSave: (changes: UpdateRoutineInput) => void
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
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--color-overlay-bg)] p-3 backdrop-blur-[2px] sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose()
      }}
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
  const routineQuery = routineSearch.trim().toLocaleLowerCase('pt-BR')

  const fiscalRoutines = data.routines
    .filter(
      (routine) =>
        routine.departmentId === fiscalDepartment?.id &&
        routine.active !== false &&
        (!routineQuery ||
          routine.name.toLocaleLowerCase('pt-BR').includes(routineQuery) ||
          routine.description
            ?.toLocaleLowerCase('pt-BR')
            .includes(routineQuery)),
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
      description="Atualize os dados, a configuração Fiscal e as rotinas vinculadas."
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
      wide
    >
      <EditSection
        title="Dados da empresa"
        description="Informações usadas para identificar e contatar a empresa."
      >
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

      <EditSection
        title="Fiscal"
        description="A divisão determina a planilha; as rotinas podem ser ajustadas individualmente."
      >
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

        <div className="mt-4">
          <TextField
            label="Buscar rotina fiscal"
            type="search"
            value={routineSearch}
            onChange={(event) => setRoutineSearch(event.target.value)}
            placeholder="Nome ou descrição"
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-divider)]">
          <div className="flex items-center justify-between gap-3 bg-[var(--color-panel-soft-bg)] px-3 py-2 text-xs font-bold text-[var(--color-text-muted)]">
            <span>{selectedRoutineIds.length} rotinas vinculadas</span>
            <span>Selecionadas primeiro</span>
          </div>
          <ul className="max-h-72 divide-y divide-[var(--color-divider)] overflow-y-auto">
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
  const availableEmployees = data.employees
    .filter(
      (employee) =>
        employee.active !== false &&
        (!employee.departmentIds?.length ||
          employee.departmentIds.includes(entity.departmentId)),
    )
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))

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
        name: name.trim(),
        shortName: shortName.trim(),
        description: description.trim() || undefined,
        recurrence,
        defaultDueDays: normalizedSchedule.defaultDueDays,
        defaultDueDay: normalizedSchedule.defaultDueDay,
        recurrenceMonths: normalizedSchedule.recurrenceMonths,
        defaultAssigneeId: defaultAssigneeId || null,
        active,
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
      description="A configuração atual orienta novas tarefas; tarefas já geradas preservam seus próprios prazos."
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
      wide
    >
      <EditSection
        title="Identificação"
        description="Nome e instruções exibidos nas áreas de trabalho e listagens."
      >
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

      <EditSection
        title="Execução"
        description="A frequência define quando tarefas recorrentes são geradas."
      >
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
    </ModalForm>
  )
}

function EditSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="border-b border-[var(--color-divider)] pb-5 last:border-b-0 last:pb-0 [&+section]:pt-5">
      <h3 className="text-sm font-black text-[var(--color-text-strong)]">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ModalForm({
  title,
  description,
  error,
  onClose,
  onSubmit,
  children,
  wide = false,
}: {
  title: string
  description: string
  error: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)] ${
        wide ? 'max-w-4xl' : 'max-w-2xl'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-edit-title"
      data-entity-edit-dialog
      tabIndex={-1}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-4 sm:px-5">
        <div>
          <h2
            id="entity-edit-title"
            className="text-xl font-black tracking-tight text-[var(--color-text-strong)]"
          >
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--color-text-muted)]">
            {description}
          </p>
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        {error && (
          <p
            className="mb-4 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {children}
        <p className="mt-5 border-t border-[var(--color-divider)] pt-4 text-xs leading-5 text-[var(--color-text-muted)]">
          As alterações permanecem somente na sessão atual até a integração com
          o backend.
        </p>
      </div>

      <footer className="flex justify-end gap-2 border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-4 py-3 sm:px-5">
        <Button type="button" tone="neutral" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" tone="primary">
          Salvar alterações
        </Button>
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
