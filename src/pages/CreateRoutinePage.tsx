import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import FormActions from '../components/forms/FormActions'
import RoutineScheduleFields from '../components/forms/RoutineScheduleFields'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import TextField from '../components/ui/TextField'
import { routineRecurrenceOptions } from '../constants/entityOptions'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type {
  CreateRoutineInput,
  Routine,
  RoutineControlData,
  RoutineRecurrence,
} from '../types/domain'
import {
  formatRoutineSchedule,
  getRoutineScheduleError,
  normalizeRoutineSchedule,
} from '../utils/routineSchedule'

interface CreateRoutinePageProps {
  data: RoutineControlData
  period: string
  onCreate: (input: CreateRoutineInput) => Routine
  onCancel?: () => void
}

interface RoutineFormValues {
  name: string
  description: string
  departmentId: string
  recurrence: RoutineRecurrence | ''
  defaultAssigneeId: string
  defaultDueDate: string
  defaultDueDay: string
  recurrenceMonths: number[]
}

type RoutineFormField = keyof RoutineFormValues
type RoutineFormErrorField = RoutineFormField | 'schedule'
type RoutineFormErrors = Partial<Record<RoutineFormErrorField, string>>

const initialValues: RoutineFormValues = {
  name: '',
  description: '',
  departmentId: '',
  recurrence: '',
  defaultAssigneeId: '',
  defaultDueDate: '',
  defaultDueDay: '',
  recurrenceMonths: [],
}

const recurrenceDescriptions: Record<RoutineRecurrence, string> = {
  on_demand: 'Criada somente quando alguém precisar executar este trabalho.',
  monthly: 'Repete a cada competência mensal.',
  quarterly: 'Repete a cada três meses.',
  semiannual: 'Repete a cada seis meses.',
  annual: 'Repete uma vez por ano.',
  custom: 'A frequência detalhada será configurada ao usar o modelo.',
}

function CreateRoutinePage({
  data,
  period,
  onCreate,
  onCancel,
}: CreateRoutinePageProps) {
  const [values, setValues] = useState<RoutineFormValues>(initialValues)
  const [errors, setErrors] = useState<RoutineFormErrors>({})
  const [submissionError, setSubmissionError] = useState('')
  const [createdRoutine, setCreatedRoutine] = useState<Routine | null>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const availableDepartments = useMemo(
    () =>
      [...data.departments].sort((left, right) =>
        left.name.localeCompare(right.name, 'pt-BR'),
      ),
    [data.departments],
  )

  const availableEmployees = useMemo(
    () =>
      data.employees
        .filter(
          (employee) =>
            employee.active !== false &&
            (!values.departmentId ||
              !employee.departmentIds?.length ||
              employee.departmentIds.includes(values.departmentId)),
        )
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [data.employees, values.departmentId],
  )

  const selectedDepartment = data.departments.find(
    (department) => department.id === values.departmentId,
  )
  const selectedEmployee = data.employees.find(
    (employee) => employee.id === values.defaultAssigneeId,
  )
  const selectedRecurrence = routineRecurrenceOptions.find(
    (option) => option.value === values.recurrence,
  )

  function updateField<Field extends RoutineFormField>(
    field: Field,
    value: RoutineFormValues[Field],
  ) {
    setCreatedRoutine(null)
    setSubmissionError('')
    setErrors((current) => {
      if (!current[field]) return current

      const nextErrors = { ...current }
      delete nextErrors[field]
      return nextErrors
    })
    setValues((current) => {
      if (field !== 'departmentId') {
        return { ...current, [field]: value }
      }

      const nextDepartmentId = String(value)
      const assignedEmployee = data.employees.find(
        (employee) => employee.id === current.defaultAssigneeId,
      )
      const canKeepAssignee =
        !assignedEmployee?.departmentIds?.length ||
        assignedEmployee.departmentIds.includes(nextDepartmentId)

      return {
        ...current,
        departmentId: nextDepartmentId,
        defaultAssigneeId: canKeepAssignee ? current.defaultAssigneeId : '',
      }
    })
  }

  function updateRecurrence(recurrence: RoutineRecurrence) {
    setCreatedRoutine(null)
    setSubmissionError('')
    setErrors((current) => ({
      ...current,
      recurrence: undefined,
      schedule: undefined,
    }))
    setValues((current) => ({
      ...current,
      recurrence,
      defaultDueDate: '',
      defaultDueDay: '',
      recurrenceMonths: [],
    }))
  }

  function updateSchedule(schedule: {
    defaultDueDate?: string
    defaultDueDay?: number
    recurrenceMonths?: number[]
  }) {
    setErrors((current) => ({ ...current, schedule: undefined }))
    setValues((current) => ({
      ...current,
      defaultDueDate: schedule.defaultDueDate ?? '',
      defaultDueDay: schedule.defaultDueDay
        ? String(schedule.defaultDueDay)
        : '',
      recurrenceMonths: schedule.recurrenceMonths ?? [],
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateRoutine(values)
    setErrors(nextErrors)
    setSubmissionError('')

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return
    }

    const input = buildCreateInput(values)

    try {
      const routine = onCreate(input)
      setCreatedRoutine(routine)
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar a rotina. Revise os dados e tente novamente.',
      )
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
    }
  }

  function resetForm() {
    setValues(initialValues)
    setErrors({})
    setSubmissionError('')
    setCreatedRoutine(null)
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>('#routine-name')?.focus(),
    )
  }

  const errorEntries = Object.entries(errors) as Array<
    [RoutineFormErrorField, string]
  >

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        label="Cadastros"
        title="Nova rotina"
        meta={
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-1 text-xs font-bold">
            <TemplateIcon />
            Modelo operacional
          </span>
        }
      />

      <p className="-mt-1 mb-5 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
        Defina o padrão que poderá ser associado às empresas. Este cadastro não
        cria tarefas nem altera as planilhas atuais.
      </p>

      {createdRoutine && (
        <section
          className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[var(--radius-panel)] border border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] px-4 py-4 text-[var(--status-completed-text)] shadow-[var(--shadow-panel)] sm:px-5"
          role="status"
          aria-live="polite"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--status-completed-strong-bg)] text-[var(--status-completed-strong-text)]">
              <CheckIcon />
            </span>
            <div>
              <h2 className="font-black">Rotina criada</h2>
              <p className="mt-1 text-sm leading-5">
                <strong>{createdRoutine.name}</strong> foi salva como modelo.
                Nenhuma tarefa ou planilha foi criada.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-[var(--radius-control)] px-2 py-1 text-sm font-extrabold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Criar outra rotina
          </button>
        </section>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {(errorEntries.length > 0 || submissionError) && (
          <div
            ref={errorSummaryRef}
            className="mb-5 rounded-[var(--radius-panel)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-4 text-[var(--status-error-text)] shadow-[var(--shadow-panel)] sm:px-5"
            role="alert"
            tabIndex={-1}
            aria-labelledby="routine-error-title"
          >
            <h2 id="routine-error-title" className="text-sm font-black">
              {submissionError
                ? 'Não foi possível criar a rotina'
                : `Revise ${errorEntries.length === 1 ? 'o campo indicado' : 'os campos indicados'}`}
            </h2>
            {submissionError ? (
              <p className="mt-1 text-sm">{submissionError}</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    <button
                      type="button"
                      className="text-left font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                      onClick={() =>
                        document.getElementById(fieldIds[field])?.focus()
                      }
                    >
                      {message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <Card className="p-4 sm:p-5">
              <section aria-labelledby="routine-identification-title">
                <SectionHeading
                  number="1"
                  id="routine-identification-title"
                  title="Identificação"
                  description="Nomeie o modelo e explique qual trabalho ele representa."
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <FieldContainer
                    error={errors.name}
                    errorId="routine-name-error"
                  >
                    <TextField
                      id="routine-name"
                      label="Título da rotina *"
                      value={values.name}
                      onChange={(event) =>
                        updateField('name', event.target.value)
                      }
                      placeholder="Ex.: Importar notas de entrada"
                      autoComplete="off"
                      autoFocus
                      required
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={
                        errors.name ? 'routine-name-error' : undefined
                      }
                    />
                  </FieldContainer>

                  <FieldContainer
                    error={errors.departmentId}
                    errorId="routine-department-error"
                  >
                    <Select
                      id="routine-department"
                      label="Departamento *"
                      value={values.departmentId}
                      onChange={(event) =>
                        updateField('departmentId', event.target.value)
                      }
                      required
                      aria-invalid={Boolean(errors.departmentId)}
                      aria-describedby={
                        errors.departmentId
                          ? 'routine-department-error'
                          : 'routine-department-help'
                      }
                    >
                      <option value="">Selecione o departamento</option>
                      {availableDepartments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </Select>
                    {!errors.departmentId && (
                      <p
                        id="routine-department-help"
                        className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]"
                      >
                        A divisão e as empresas serão vinculadas em outro
                        momento.
                      </p>
                    )}
                  </FieldContainer>

                  <FieldContainer
                    error={errors.description}
                    errorId="routine-description-error"
                    className="sm:col-span-2"
                  >
                    <Textarea
                      id="routine-description"
                      label="Descrição *"
                      value={values.description}
                      onChange={(event) =>
                        updateField('description', event.target.value)
                      }
                      placeholder="Descreva o resultado esperado e o que deve ser conferido."
                      rows={5}
                      required
                      aria-invalid={Boolean(errors.description)}
                      aria-describedby={
                        errors.description
                          ? 'routine-description-error'
                          : 'routine-description-help'
                      }
                    />
                    {!errors.description && (
                      <p
                        id="routine-description-help"
                        className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]"
                      >
                        Esta orientação acompanha o modelo quando ele for
                        utilizado.
                      </p>
                    )}
                  </FieldContainer>
                </div>
              </section>
            </Card>

            <Card className="p-4 sm:p-5">
              <section aria-labelledby="routine-execution-title">
                <SectionHeading
                  number="2"
                  id="routine-execution-title"
                  title="Padrões de execução"
                  description="Escolha a frequência e, se fizer sentido, deixe um responsável e um prazo sugeridos."
                />

                <fieldset
                  className="mt-5"
                  aria-describedby={[
                    'routine-recurrence-help',
                    errors.recurrence ? 'routine-recurrence-error' : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <legend className="text-sm font-bold text-[var(--color-text-muted)]">
                    Recorrência *
                  </legend>
                  <p
                    id="routine-recurrence-help"
                    className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]"
                  >
                    Selecione também “Sob demanda” quando não houver uma
                    frequência fixa.
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {routineRecurrenceOptions.map((option) => {
                      const checked = values.recurrence === option.value

                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-3 transition ${
                            checked
                              ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                              : 'border-[var(--color-control-border)] bg-[var(--color-control-bg)] hover:bg-[var(--color-control-hover-bg)]'
                          }`}
                        >
                          <input
                            id={
                              option.value === 'on_demand'
                                ? 'routine-recurrence'
                                : undefined
                            }
                            type="radio"
                            name="recurrence"
                            value={option.value}
                            checked={checked}
                            onChange={() => updateRecurrence(option.value)}
                            required
                            className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
                            aria-invalid={Boolean(errors.recurrence)}
                          />
                          <span>
                            <span className="block text-sm font-extrabold text-[var(--color-text-strong)]">
                              {option.label}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">
                              {recurrenceDescriptions[option.value]}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {errors.recurrence && (
                    <FieldError
                      id="routine-recurrence-error"
                      message={errors.recurrence}
                    />
                  )}
                </fieldset>

                <div
                  id="routine-schedule"
                  className="mt-5 grid gap-4 border-t border-[var(--color-divider)] pt-5 sm:grid-cols-2"
                  tabIndex={-1}
                >
                  {values.recurrence ? (
                    <RoutineScheduleFields
                      recurrence={values.recurrence}
                      value={{
                        defaultDueDate: values.defaultDueDate || undefined,
                        defaultDueDay: values.defaultDueDay
                          ? Number(values.defaultDueDay)
                          : undefined,
                        recurrenceMonths: values.recurrenceMonths,
                      }}
                      onChange={updateSchedule}
                      error={errors.schedule}
                      idPrefix="routine"
                    />
                  ) : (
                    <p className="sm:col-span-2 rounded-[var(--radius-control)] border border-dashed border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      Selecione a recorrência para configurar o prazo.
                    </p>
                  )}

                  <div>
                    <Select
                      id="routine-assignee"
                      label="Responsável padrão (opcional)"
                      value={values.defaultAssigneeId}
                      onChange={(event) =>
                        updateField('defaultAssigneeId', event.target.value)
                      }
                      aria-describedby="routine-assignee-help"
                    >
                      <option value="">Sem responsável padrão</option>
                      {availableEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </Select>
                    <p
                      id="routine-assignee-help"
                      className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]"
                    >
                      Pode ser alterado quando a rotina for vinculada.
                    </p>
                  </div>
                </div>
              </section>
            </Card>
          </div>

          <RoutinePreview
            period={period}
            name={values.name}
            description={values.description}
            departmentName={selectedDepartment?.name}
            recurrenceLabel={selectedRecurrence?.label}
            recurrence={values.recurrence}
            assigneeName={selectedEmployee?.name}
            defaultDueDate={values.defaultDueDate}
            defaultDueDay={values.defaultDueDay}
            recurrenceMonths={values.recurrenceMonths}
          />
        </div>

        <Card className="mt-5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-5 text-[var(--color-text-muted)]">
              Ao criar, somente as configurações do modelo serão salvas. A
              associação a divisões, empresas e planilhas será feita
              separadamente.
            </p>
            <FormActions
              submitLabel="Criar rotina"
              cancelLabel="Cancelar"
              onCancel={onCancel}
            />
          </div>
        </Card>
      </form>
    </div>
  )
}

function SectionHeading({
  number,
  id,
  title,
  description,
}: {
  number: string
  id: string
  title: string
  description: string
}) {
  return (
    <header className="flex items-start gap-3 border-b border-[var(--color-divider)] pb-4">
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-xs font-black text-[var(--color-brand)]"
        aria-hidden="true"
      >
        {number}
      </span>
      <div>
        <h2
          id={id}
          className="text-base font-black text-[var(--color-text-strong)]"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
    </header>
  )
}

function FieldContainer({
  error,
  errorId,
  className = '',
  children,
}: {
  error?: string
  errorId: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      {children}
      {error && <FieldError id={errorId} message={error} />}
    </div>
  )
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      className="mt-1.5 text-xs font-bold leading-5 text-[var(--status-error-text)]"
    >
      {message}
    </p>
  )
}

function RoutinePreview({
  period,
  name,
  description,
  departmentName,
  recurrenceLabel,
  recurrence,
  assigneeName,
  defaultDueDate,
  defaultDueDay,
  recurrenceMonths,
}: {
  period: string
  name: string
  description: string
  departmentName?: string
  recurrenceLabel?: string
  recurrence: RoutineRecurrence | ''
  assigneeName?: string
  defaultDueDate: string
  defaultDueDay: string
  recurrenceMonths: number[]
}) {
  const dueLabel = recurrence
    ? formatRoutineSchedule({
        recurrence,
        defaultDueDate: defaultDueDate || undefined,
        defaultDueDay: defaultDueDay ? Number(defaultDueDay) : undefined,
        recurrenceMonths,
      })
    : 'Selecione a recorrência'

  return (
    <aside
      className="xl:sticky xl:top-4"
      aria-labelledby="routine-preview-title"
    >
      <Card>
        <header className="border-b border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="routine-preview-title"
              className="text-sm font-black text-[var(--color-text-strong)]"
            >
              Prévia do modelo
            </h2>
            <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--color-brand)]">
              Modelo
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
            Confira como a configuração será registrada.
          </p>
        </header>

        <div className="px-4 py-4">
          <div className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-3">
            <p className="break-words text-base font-black text-[var(--color-text-strong)]">
              {name.trim() || 'Título da rotina'}
            </p>
            <p className="mt-2 break-words text-sm leading-5 text-[var(--color-text-muted)]">
              {description.trim() || 'A descrição do trabalho aparecerá aqui.'}
            </p>
          </div>

          <dl
            className="mt-4 divide-y divide-[var(--color-divider)]"
            aria-live="polite"
          >
            <PreviewItem
              label="Departamento"
              value={departmentName ?? 'Selecione'}
            />
            <PreviewItem
              label="Recorrência"
              value={recurrenceLabel ?? 'Selecione'}
            />
            <PreviewItem
              label="Responsável padrão"
              value={assigneeName ?? 'Não definido'}
            />
            <PreviewItem label="Prazo padrão" value={dueLabel} />
            <PreviewItem
              label="Competência atual"
              value={formatPeriod(period)}
            />
          </dl>

          <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-3">
            <InfoIcon />
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">
              {recurrence === 'on_demand'
                ? 'Sob demanda não gera tarefas automaticamente.'
                : 'A recorrência orienta tarefas futuras, mas não gera nenhuma tarefa agora.'}{' '}
              Este modelo também não cria uma nova planilha.
            </p>
          </div>
        </div>
      </Card>
    </aside>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-xs font-semibold text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="text-right text-xs font-extrabold text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

function validateRoutine(values: RoutineFormValues): RoutineFormErrors {
  const errors: RoutineFormErrors = {}
  const dueDays = Number(values.defaultDueDays)

  if (!values.name.trim()) {
    errors.name = 'Informe o título da rotina.'
  }

  if (!values.description.trim()) {
    errors.description = 'Informe a descrição da rotina.'
  }

  if (!values.departmentId) {
    errors.departmentId = 'Selecione o departamento.'
  }

  if (!values.recurrence) {
    errors.recurrence = 'Selecione a recorrência, inclusive sob demanda.'
  }

  if (
    values.defaultDueDays &&
    (!Number.isInteger(dueDays) || dueDays < 1 || dueDays > 365)
  ) {
    errors.defaultDueDays = 'Informe um prazo inteiro entre 1 e 365 dias.'
  }

  return errors
}

function buildCreateInput(values: RoutineFormValues): CreateRoutineInput {
  const input: CreateRoutineInput = {
    departmentId: values.departmentId,
    name: values.name.trim(),
    description: values.description.trim(),
    recurrence: values.recurrence as RoutineRecurrence,
  }

  if (values.defaultAssigneeId) {
    input.defaultAssigneeId = values.defaultAssigneeId
  }

  if (values.defaultDueDays) {
    input.defaultDueDays = Number(values.defaultDueDays)
  }

  return input
}

function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return period || 'Não informada'

  return `${match[2]}/${match[1]}`
}

const fieldIds: Record<RoutineFormField, string> = {
  name: 'routine-name',
  description: 'routine-description',
  departmentId: 'routine-department',
  recurrence: 'routine-recurrence',
  defaultAssigneeId: 'routine-assignee',
  defaultDueDays: 'routine-due-days',
}

function TemplateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 size-4 shrink-0 text-[var(--color-brand)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  )
}

export default CreateRoutinePage
