import { useMemo, useState, type FormEvent } from 'react'

import Button from '../../ui/Button'
import Select from '../../ui/Select'
import Textarea from '../../ui/Textarea'
import TextField from '../../ui/TextField'
import {
  routineStatusConfig,
  ROUTINE_STATUS,
} from '../../../constants/routineStatus'
import { useAppState } from '../../../hooks/useAppState'
import type {
  AppUser,
  Routine,
  RoutineControlData,
  RoutineStatus,
  RoutineStatusConfig,
  Task,
} from '../../../types/domain'

interface LooseTaskValues {
  title: string
  description: string
  clientId: string
  routineId: string
  departmentId: string
  assigneeId: string
  status: RoutineStatus
  period: string
  dueDate: string
  notes: string
  attachments: string
}

type LooseTaskChangeHandler = <Field extends keyof LooseTaskValues>(
  field: Field,
  value: LooseTaskValues[Field],
) => void

interface LooseTaskFormModalProps {
  data: RoutineControlData
  onClose?: () => void
  onCreate?: (task: Task) => void
}

interface ValuesFieldProps {
  values: LooseTaskValues
  onChange: LooseTaskChangeHandler
}

const statusOptions = Object.values(ROUTINE_STATUS).map((status) => ({
  value: status,
  label: routineStatusConfig[status].label,
  dotClass: routineStatusConfig[status].dotClass,
  surfaceClass: routineStatusConfig[status].surfaceClass,
}))

function LooseTaskFormModal({
  data,
  onClose,
  onCreate,
}: LooseTaskFormModalProps) {
  const { competence, user } = useAppState()
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [values, setValues] = useState(() =>
    buildInitialValues(data, competence, user),
  )
  const [error, setError] = useState('')

  const routinesForDepartment = useMemo(() => {
    return data.routines.filter(
      (routine) => routine.departmentId === values.departmentId,
    )
  }, [data.routines, values.departmentId])
  const selectedStatus =
    routineStatusConfig[values.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]

  function updateField<Field extends keyof LooseTaskValues>(
    field: Field,
    value: LooseTaskValues[Field],
  ) {
    setError('')
    setValues((current) => {
      if (field === 'departmentId') {
        const nextRoutine = data.routines.find(
          (routine) =>
            routine.id === current.routineId && routine.departmentId === value,
        )

        return {
          ...current,
          departmentId: value,
          routineId: nextRoutine ? current.routineId : '',
        }
      }

      return { ...current, [field]: value }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validateValues(values)

    if (validationError) {
      setError(validationError)
      return
    }

    onCreate?.(buildLooseTask(values))
    onClose?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--color-overlay-bg)] p-3 backdrop-blur-[2px] sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.()
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
      >
        <header className="border-b border-[var(--color-divider)] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand)]">
                Tarefa avulsa
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--color-text-strong)]">
                Adicionar tarefa avulsa
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] text-lg font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
              aria-label="Fechar formulario"
              title="Fechar formulario"
            >
              x
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-panel-soft-bg)] px-4 py-4 sm:px-5">
          {error && (
            <p className="mb-4 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-bold text-[var(--status-error-text)]">
              {error}
            </p>
          )}

          <StackLayout values={values} onChange={updateField} />

          <AdvancedOptions
            data={data}
            values={values}
            routines={routinesForDepartment}
            selectedStatus={selectedStatus}
            isOpen={isAdvancedOpen}
            onToggle={() => setIsAdvancedOpen((current) => !current)}
            onChange={updateField}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-4 py-4 sm:px-5">
          <Button type="button" tone="neutral" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" tone="primary">
            Criar tarefa
          </Button>
        </footer>
      </form>
    </div>
  )
}

function StackLayout({ values, onChange }: ValuesFieldProps) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4 sm:p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_11rem]">
        <TicketTitleField values={values} onChange={onChange} />
        <TicketDueDateField values={values} onChange={onChange} />
        <div className="md:col-span-2">
          <TicketDescriptionField
            values={values}
            onChange={onChange}
            rows={5}
          />
        </div>
      </div>
    </section>
  )
}

function AdvancedOptions({
  data,
  values,
  routines,
  selectedStatus,
  isOpen,
  onToggle,
  onChange,
}: ValuesFieldProps & {
  data: RoutineControlData
  routines: Routine[]
  selectedStatus: RoutineStatusConfig
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <section className="mt-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-control-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)] sm:px-5"
        aria-expanded={isOpen}
      >
        <div>
          <p className="text-sm font-black text-[var(--color-text-strong)]">
            Opcoes avancadas
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">
            {getAdvancedSummary(data, values)}
          </p>
        </div>
        <span className="text-xl font-black text-[var(--color-text-muted)]">
          {isOpen ? '-' : '+'}
        </span>
      </button>

      {isOpen && (
        <div className="grid gap-4 border-t border-[var(--color-divider)] px-4 py-4 sm:grid-cols-2 sm:px-5">
          <ClientField values={values} data={data} onChange={onChange} />
          <RoutineField
            values={values}
            routines={routines}
            onChange={onChange}
          />
          <DepartmentField values={values} data={data} onChange={onChange} />
          <AssigneeField values={values} data={data} onChange={onChange} />
          <PeriodField values={values} onChange={onChange} />
          <StatusSelectField
            values={values}
            selectedStatus={selectedStatus}
            onChange={onChange}
          />
          <AttachmentField values={values} onChange={onChange} />
          <NotesField values={values} onChange={onChange} />
        </div>
      )}
    </section>
  )
}

function TicketTitleField({ values, onChange }: ValuesFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]">
        Nome *
      </span>
      <input
        value={values.title}
        onChange={(event) => onChange('title', event.target.value)}
        placeholder="Ex.: Conferir retorno do cliente"
        className="w-full border-0 border-b border-[var(--color-control-border)] bg-transparent px-0 pb-3 text-lg font-black text-[var(--color-text-strong)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-0"
        required
      />
    </label>
  )
}

function TicketDueDateField({ values, onChange }: ValuesFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]">
        Prazo *
      </span>
      <input
        type="date"
        value={values.dueDate}
        onChange={(event) => onChange('dueDate', event.target.value)}
        className="w-full border-0 border-b border-[var(--color-control-border)] bg-transparent px-0 pb-3 text-lg font-black text-[var(--color-text-strong)] outline-none transition focus:border-[var(--color-control-focus)] focus:ring-0"
        required
      />
    </label>
  )
}

function TicketDescriptionField({
  values,
  onChange,
  rows = 7,
}: ValuesFieldProps & { rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]">
        Descricao
      </span>
      <textarea
        value={values.description}
        onChange={(event) => onChange('description', event.target.value)}
        placeholder="Detalhe o que precisa ser feito."
        rows={rows}
        className="w-full resize-y rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-panel-soft-bg)] px-3 py-3 text-sm leading-6 text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
      />
    </label>
  )
}

function NotesField({ values, onChange }: ValuesFieldProps) {
  return (
    <Textarea
      label="Observacao interna"
      value={values.notes}
      onChange={(event) => onChange('notes', event.target.value)}
      placeholder="Observacao opcional."
      rows={3}
    />
  )
}

function ClientField({
  values,
  data,
  onChange,
}: ValuesFieldProps & { data: RoutineControlData }) {
  return (
    <Select
      label="Empresa"
      value={values.clientId}
      onChange={(event) => onChange('clientId', event.target.value)}
    >
      <option value="">Sem empresa definida</option>
      {data.clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.code} - {client.name}
        </option>
      ))}
    </Select>
  )
}

function RoutineField({
  values,
  routines,
  onChange,
}: ValuesFieldProps & { routines: Routine[] }) {
  return (
    <Select
      label="Rotina"
      value={values.routineId}
      onChange={(event) => onChange('routineId', event.target.value)}
    >
      <option value="">Sem rotina definida</option>
      {routines.map((routine) => (
        <option key={routine.id} value={routine.id}>
          {routine.name}
        </option>
      ))}
    </Select>
  )
}

function DepartmentField({
  values,
  data,
  onChange,
}: ValuesFieldProps & { data: RoutineControlData }) {
  return (
    <Select
      label="Departamento"
      value={values.departmentId}
      onChange={(event) => onChange('departmentId', event.target.value)}
    >
      {data.departments.map((department) => (
        <option key={department.id} value={department.id}>
          {department.name}
        </option>
      ))}
    </Select>
  )
}

function AssigneeField({
  values,
  data,
  onChange,
}: ValuesFieldProps & { data: RoutineControlData }) {
  return (
    <Select
      label="Responsavel"
      value={values.assigneeId}
      onChange={(event) => onChange('assigneeId', event.target.value)}
    >
      <option value="">Nao atribuido</option>
      {data.employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.name}
        </option>
      ))}
    </Select>
  )
}

function PeriodField({ values, onChange }: ValuesFieldProps) {
  return (
    <TextField
      label="Competencia"
      type="month"
      value={values.period}
      onChange={(event) => onChange('period', event.target.value)}
    />
  )
}

function StatusSelectField({
  values,
  selectedStatus,
  onChange,
}: ValuesFieldProps & { selectedStatus: RoutineStatusConfig }) {
  return (
    <label className="block text-sm font-medium text-[var(--color-text-muted)]">
      <span className="mb-1.5 block">Estado inicial</span>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          value={values.status}
          onChange={(event) =>
            onChange('status', event.target.value as RoutineStatus)
          }
          className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm text-[var(--color-control-text)] outline-none transition focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <span
          className={`inline-flex min-h-9 items-center justify-center rounded-[var(--radius-control)] border px-3 text-xs font-bold ${selectedStatus.surfaceClass}`}
        >
          {selectedStatus.label}
        </span>
      </div>
    </label>
  )
}

function AttachmentField({ values, onChange }: ValuesFieldProps) {
  return (
    <TextField
      label="Anexos iniciais"
      type="number"
      min="0"
      value={values.attachments}
      onChange={(event) => onChange('attachments', event.target.value)}
    />
  )
}

function getAdvancedSummary(
  data: RoutineControlData,
  values: LooseTaskValues,
): string {
  const client = data.clients.find((item) => item.id === values.clientId)
  const routine = data.routines.find((item) => item.id === values.routineId)
  const employee = data.employees.find((item) => item.id === values.assigneeId)

  return [
    client?.name ?? 'Sem empresa',
    routine?.name ?? 'Sem rotina',
    employee?.name ?? 'Nao atribuido',
  ].join(' - ')
}

function buildInitialValues(
  data: RoutineControlData,
  competence: string,
  user: AppUser,
): LooseTaskValues {
  const defaultDepartment =
    data.departments.find((department) => department.id === 'dept-fiscal') ??
    data.departments[0]
  const defaultAssignee =
    data.employees.find((employee) => employee.id === user.employeeId) ??
    data.employees[0]

  return {
    title: '',
    description: '',
    clientId: '',
    routineId: '',
    departmentId: defaultDepartment?.id ?? '',
    assigneeId: defaultAssignee?.id ?? '',
    status: ROUTINE_STATUS.PENDING,
    period: competence,
    dueDate: buildDefaultDueDate(competence),
    notes: '',
    attachments: '0',
  }
}

function buildDefaultDueDate(competence: string): string {
  if (!competence) return ''

  return `${competence}-20`
}

function validateValues(values: LooseTaskValues): string {
  if (!values.title.trim()) return 'Informe o nome da tarefa.'
  if (!values.dueDate) return 'Informe o prazo.'
  if (!values.departmentId)
    return 'Informe o departamento nas opcoes avancadas.'
  if (!values.assigneeId) return 'Informe o responsavel nas opcoes avancadas.'
  if (!values.period) return 'Informe a competencia nas opcoes avancadas.'
  if (!values.status) return 'Informe o estado inicial nas opcoes avancadas.'

  return ''
}

function buildLooseTask(values: LooseTaskValues): Task {
  const attachments = Math.max(0, Number(values.attachments) || 0)
  const completedAt =
    values.status === ROUTINE_STATUS.COMPLETED ? new Date().toISOString() : null

  return {
    id: `loose-task-${Date.now()}`,
    isLoose: true,
    title: values.title.trim(),
    description: values.description.trim(),
    clientId: values.clientId || null,
    routineId: values.routineId || null,
    departmentId: values.departmentId,
    assigneeId: values.assigneeId,
    status: values.status,
    statusDetail: null,
    period: values.period,
    dueDate: values.dueDate,
    completedAt,
    notes: values.notes.trim(),
    indicators: {
      attachments,
      comments: 0,
      alerts: 0,
    },
  }
}

export default LooseTaskFormModal
