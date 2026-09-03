import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import { CreationSuccess } from '../components/forms/CreationFeedback'
import FormActions from '../components/forms/FormActions'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import TextField from '../components/ui/TextField'
import { routineRecurrenceOptions } from '../constants/entityOptions'
import WorkspaceBar from '../layouts/WorkspaceBar'
import {
  departmentService,
  type TaskAssigneeResource,
} from '../services/departmentService'
import type { RoutineInput, RoutineResource } from '../services/routineService'
import type { Department, RoutineRecurrence } from '../types/domain'

interface CreateRoutinePageProps {
  departments: Department[]
  period: string
  onCreate: (input: RoutineInput) => Promise<RoutineResource>
  onCancel: () => void
}

interface RoutineFormValues {
  name: string
  shotname: string
  description: string
  departmentId: string
  recurrence: RoutineRecurrence
  defaultDueDays: string
  defaultAssigneeMemberId: string
  recurrenceMonths: number[]
}

type RoutineFormField = keyof RoutineFormValues | 'schedule' | 'submit'

type RoutineFormErrors = Partial<Record<RoutineFormField, string>>

const initialValues: RoutineFormValues = {
  name: '',
  shotname: '',
  description: '',
  departmentId: '',
  recurrence: 'monthly',
  defaultDueDays: '14',
  defaultAssigneeMemberId: '',
  recurrenceMonths: [],
}

const recurrenceDescriptions: Record<RoutineRecurrence, string> = {
  on_demand: 'Criada somente quando alguém precisar executar este trabalho.',
  monthly: 'Repete a cada competência mensal.',
  quarterly: 'Repete em quatro meses definidos no ano.',
  semiannual: 'Repete em dois meses definidos no ano.',
  annual: 'Repete em um mês definido no ano.',
}

const recurrenceMonthOptions: Record<
  Exclude<RoutineRecurrence, 'monthly' | 'on_demand'>,
  Array<{ value: string; label: string; months: number[] }>
> = {
  quarterly: [
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
  ],
  semiannual: [
    { value: '1-7', label: 'Janeiro e julho', months: [1, 7] },
    { value: '2-8', label: 'Fevereiro e agosto', months: [2, 8] },
    { value: '3-9', label: 'Março e setembro', months: [3, 9] },
    { value: '4-10', label: 'Abril e outubro', months: [4, 10] },
    { value: '5-11', label: 'Maio e novembro', months: [5, 11] },
    { value: '6-12', label: 'Junho e dezembro', months: [6, 12] },
  ],
  annual: [
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
  ],
}

function CreateRoutinePage({
  departments,
  period,
  onCreate,
  onCancel,
}: CreateRoutinePageProps) {
  const [values, setValues] = useState<RoutineFormValues>(initialValues)
  const [errors, setErrors] = useState<RoutineFormErrors>({})
  const [submissionError, setSubmissionError] = useState('')
  const [createdRoutine, setCreatedRoutine] = useState<RoutineResource | null>(
    null,
  )
  const [assignees, setAssignees] = useState<TaskAssigneeResource[]>([])
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false)
  const [assigneesError, setAssigneesError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const selectedDepartment = departments.find(
    (department) => department.id === values.departmentId,
  )
  const selectedAssignee = assignees.find(
    (assignee) => assignee.id === values.defaultAssigneeMemberId,
  )
  const selectedRecurrence = routineRecurrenceOptions.find(
    (option) => option.value === values.recurrence,
  )
  const monthOptions =
    values.recurrence === 'quarterly' ||
    values.recurrence === 'semiannual' ||
    values.recurrence === 'annual'
      ? recurrenceMonthOptions[values.recurrence]
      : []
  const selectedMonthsValue = values.recurrenceMonths.join('-')

  useEffect(() => {
    let isCurrent = true

    if (!values.departmentId) {
      setAssignees([])
      setAssigneesError('')
      setIsLoadingAssignees(false)
      return () => {
        isCurrent = false
      }
    }

    setIsLoadingAssignees(true)
    setAssigneesError('')
    setAssignees([])
    setValues((current) => ({ ...current, defaultAssigneeMemberId: '' }))

    void departmentService
      .getTaskAssignees(values.departmentId)
      .then((response) => {
        if (isCurrent) setAssignees(response.data)
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setAssigneesError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar responsáveis elegíveis.',
          )
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingAssignees(false)
      })

    return () => {
      isCurrent = false
    }
  }, [values.departmentId])

  if (createdRoutine) {
    return (
      <div className="mx-auto w-full max-w-[90rem]">
        <WorkspaceBar label="Cadastros" title="Nova rotina" />
        <CreationSuccess
          eyebrow="Rotina criada"
          title={createdRoutine.name}
          description="O modelo e sua primeira versão foram enviados para a API. Nenhuma tarefa foi criada nesta etapa."
          detail={
            selectedDepartment?.name +
            ' · ' +
            (selectedRecurrence?.label || 'Recorrência')
          }
          primaryAction={{ label: 'Ver rotinas', to: '/rotinas' }}
          secondaryAction={{
            label: 'Criar outra rotina',
            onClick: resetForm,
          }}
        />
      </div>
    )
  }

  function updateField<Field extends keyof RoutineFormValues>(
    field: Field,
    value: RoutineFormValues[Field],
  ) {
    setCreatedRoutine(null)
    setSubmissionError('')
    setErrors((current) => ({ ...current, [field]: undefined }))
    setValues((current) => ({ ...current, [field]: value }))
  }

  function updateRecurrence(recurrence: RoutineRecurrence) {
    setCreatedRoutine(null)
    setSubmissionError('')
    setErrors((current) => ({
      ...current,
      recurrence: undefined,
      schedule: undefined,
      defaultAssigneeMemberId: undefined,
    }))
    setValues((current) => ({
      ...current,
      recurrence,
      recurrenceMonths: [],
    }))
  }

  function validate(): RoutineFormErrors {
    const nextErrors: RoutineFormErrors = {}
    const dueDays = Number(values.defaultDueDays)

    if (!values.name.trim()) nextErrors.name = 'Informe o título da rotina.'
    if (!values.shotname.trim()) {
      nextErrors.shotname = 'Informe o nome curto mostrado na planilha.'
    } else if (values.shotname.trim().length > 32) {
      nextErrors.shotname = 'O nome curto pode ter até 32 caracteres.'
    }
    if (!values.description.trim()) {
      nextErrors.description = 'Informe a descrição da rotina.'
    }
    if (!values.departmentId) {
      nextErrors.departmentId = 'Selecione o departamento.'
    }
    if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 3750) {
      nextErrors.schedule = 'Informe um prazo inteiro entre 0 e 3.750 dias.'
    }
    if (
      values.recurrence === 'quarterly' &&
      values.recurrenceMonths.length !== 4
    ) {
      nextErrors.schedule = 'Selecione um ciclo trimestral.'
    }
    if (
      values.recurrence === 'semiannual' &&
      values.recurrenceMonths.length !== 2
    ) {
      nextErrors.schedule = 'Selecione um ciclo semestral.'
    }
    if (
      values.recurrence === 'annual' &&
      values.recurrenceMonths.length !== 1
    ) {
      nextErrors.schedule = 'Selecione o mês da rotina anual.'
    }

    return nextErrors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setSubmissionError('')

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return
    }

    setIsSubmitting(true)
    try {
      const routine = await onCreate({
        departmentId: values.departmentId,
        name: values.name.trim(),
        shotname: values.shotname.trim(),
        description: values.description.trim(),
        recurrence: values.recurrence,
        defaultDueDays: Number(values.defaultDueDays),
        recurrenceMonths: values.recurrenceMonths,
        ...(values.defaultAssigneeMemberId
          ? {
              defaultAssigneeMemberId: values.defaultAssigneeMemberId,
            }
          : {}),
      })
      setCreatedRoutine(routine)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar a rotina. Revise os dados e tente novamente.',
      )
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
    } finally {
      setIsSubmitting(false)
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

  const errorEntries = [
    ...Object.values(errors).filter((message): message is string =>
      Boolean(message),
    ),
    ...(submissionError ? [submissionError] : []),
  ]

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
        Defina o padrão que poderá ser associado às empresas. O cadastro publica
        uma versão da regra, sem criar tarefas nem alterar as telas atuais.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        {errorEntries.length > 0 && (
          <div
            ref={errorSummaryRef}
            className="mb-5 rounded-[var(--radius-panel)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-4 text-[var(--status-error-text)] shadow-[var(--shadow-panel)] sm:px-5"
            role="alert"
            tabIndex={-1}
          >
            <p className="font-black">Revise os dados da rotina</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {[...new Set(errorEntries)].map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <Card className="p-4 sm:p-5">
              <section aria-labelledby="routine-identification-title">
                <SectionHeading
                  number="1"
                  id="routine-identification-title"
                  title="Identificação do modelo"
                  description="Dê um nome claro ao trabalho e indique onde ele será executado."
                />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <FieldContainer
                    error={errors.name}
                    errorId="routine-name-error"
                  >
                    <TextField
                      id="routine-name"
                      label="Nome da rotina *"
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
                    error={errors.shotname}
                    errorId="routine-shotname-error"
                  >
                    <TextField
                      id="routine-shotname"
                      label="Nome curto na planilha *"
                      value={values.shotname}
                      onChange={(event) =>
                        updateField('shotname', event.target.value)
                      }
                      maxLength={32}
                      placeholder="Ex.: NFs entrada"
                      required
                      aria-invalid={Boolean(errors.shotname)}
                      aria-describedby={
                        errors.shotname ? 'routine-shotname-error' : undefined
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
                      {departments.map((department) => (
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
                        As empresas e telas serão configuradas em outro momento.
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
                        Esta orientação acompanhará a versão publicada do
                        modelo.
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
                  description="Escolha frequência, prazo e o responsável que receberá as ocorrências recorrentes."
                />

                <fieldset className="mt-5">
                  <legend className="text-sm font-bold text-[var(--color-text-muted)]">
                    Recorrência *
                  </legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {routineRecurrenceOptions.map((option) => {
                      const checked = values.recurrence === option.value

                      return (
                        <label
                          key={option.value}
                          className={
                            'flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-3 transition ' +
                            (checked
                              ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                              : 'border-[var(--color-control-border)] bg-[var(--color-control-bg)] hover:bg-[var(--color-control-hover-bg)]')
                          }
                        >
                          <input
                            type="radio"
                            name="recurrence"
                            value={option.value}
                            checked={checked}
                            onChange={() => updateRecurrence(option.value)}
                            required
                            className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
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
                </fieldset>

                <div className="mt-5 grid gap-4 border-t border-[var(--color-divider)] pt-5 sm:grid-cols-2">
                  <FieldContainer
                    error={errors.schedule}
                    errorId="routine-schedule-error"
                  >
                    <TextField
                      id="routine-due-days"
                      label="Prazo padrão (dias) *"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="3750"
                      value={values.defaultDueDays}
                      onChange={(event) =>
                        updateField('defaultDueDays', event.target.value)
                      }
                      aria-invalid={Boolean(errors.schedule)}
                      aria-describedby={
                        errors.schedule
                          ? 'routine-schedule-error'
                          : 'routine-due-days-help'
                      }
                    />
                    {!errors.schedule && (
                      <p
                        id="routine-due-days-help"
                        className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]"
                      >
                        Contado a partir do primeiro dia da competência.
                      </p>
                    )}
                  </FieldContainer>

                  <FieldContainer
                    error={errors.defaultAssigneeMemberId || assigneesError}
                    errorId="routine-assignee-error"
                  >
                    <Select
                      id="routine-assignee"
                      label="Responsável padrão (opcional)"
                      value={values.defaultAssigneeMemberId}
                      onChange={(event) =>
                        updateField(
                          'defaultAssigneeMemberId',
                          event.target.value,
                        )
                      }
                      disabled={
                        !values.departmentId ||
                        isLoadingAssignees ||
                        Boolean(assigneesError)
                      }
                      required={false}
                      aria-invalid={Boolean(
                        errors.defaultAssigneeMemberId || assigneesError,
                      )}
                      aria-describedby="routine-assignee-help"
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
                    {!errors.defaultAssigneeMemberId && !assigneesError && (
                      <p
                        id="routine-assignee-help"
                        className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]"
                      >
                        A lista vem dos membros elegíveis deste departamento.
                      </p>
                    )}
                  </FieldContainer>

                  {monthOptions.length > 0 && (
                    <div className="sm:col-span-2">
                      <Select
                        id="routine-recurrence-months"
                        label={
                          values.recurrence === 'annual'
                            ? 'Mês de execução *'
                            : 'Ciclo de execução *'
                        }
                        value={selectedMonthsValue}
                        onChange={(event) => {
                          const option = monthOptions.find(
                            (item) => item.value === event.target.value,
                          )
                          updateField('recurrenceMonths', option?.months ?? [])
                        }}
                        required
                        aria-invalid={Boolean(errors.schedule)}
                      >
                        <option value="">Selecione</option>
                        {monthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              </section>
            </Card>
          </div>

          <RoutinePreview
            period={period}
            name={values.name}
            shotname={values.shotname}
            description={values.description}
            departmentName={selectedDepartment?.name}
            recurrenceLabel={selectedRecurrence?.label}
            recurrence={values.recurrence}
            assigneeName={selectedAssignee?.displayName}
            defaultDueDays={values.defaultDueDays}
            recurrenceMonths={values.recurrenceMonths}
          />
        </div>

        <Card className="mt-5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-5 text-[var(--color-text-muted)]">
              Ao criar, a API salva a identidade da rotina e publica sua
              primeira versão. A associação a empresas e telas é feita
              separadamente.
            </p>
            <FormActions
              submitLabel="Criar rotina"
              cancelLabel="Cancelar"
              isSubmitting={isSubmitting}
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
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-xs font-bold leading-5 text-[var(--status-error-text)]"
        >
          {error}
        </p>
      )}
    </div>
  )
}

function RoutinePreview({
  period,
  name,
  shotname,
  description,
  departmentName,
  recurrenceLabel,
  recurrence,
  assigneeName,
  defaultDueDays,
  recurrenceMonths,
}: {
  period: string
  name: string
  shotname: string
  description: string
  departmentName?: string
  recurrenceLabel?: string
  recurrence: RoutineRecurrence
  assigneeName?: string
  defaultDueDays: string
  recurrenceMonths: number[]
}) {
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
            Confira como a configuração será publicada.
          </p>
        </header>

        <div className="px-4 py-4">
          <div className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-3">
            <p className="break-words text-base font-black text-[var(--color-text-strong)]">
              {name.trim() || 'Título da rotina'}
            </p>
            <p className="mt-1 text-xs font-bold text-[var(--color-brand)]">
              {shotname.trim() || 'Nome curto na planilha'}
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
              value={departmentName || 'Selecione'}
            />
            <PreviewItem
              label="Recorrência"
              value={recurrenceLabel || 'Selecione'}
            />
            <PreviewItem
              label="Responsável padrão"
              value={assigneeName || 'Não definido'}
            />
            <PreviewItem
              label="Prazo padrão"
              value={
                defaultDueDays
                  ? defaultDueDays + ' dias após o início'
                  : 'No início da competência'
              }
            />
            {recurrenceMonths.length > 0 && (
              <PreviewItem label="Meses" value={recurrenceMonths.join(', ')} />
            )}
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
                : 'A recorrência orienta ocorrências futuras, mas não gera nenhuma tarefa agora.'}
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

function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return period || 'Não informada'

  return match[2] + '/' + match[1]
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
