import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus'
import type {
  Client,
  Department,
  Employee,
  EntityId,
  Routine,
  RoutineStatus,
  RoutineStatusConfig,
  Task,
} from '../../../types/domain'
import { getCompanyCodeLabel } from '../../../utils/companyCode'
import {
  RoutineAttachmentsPanel,
  RoutineNotesPanel,
  RoutineStatusControl,
} from '../shared/RoutineCardActions'
import RoutineEditableFields from '../shared/RoutineEditableFields'
import TaskLinksPanel from './TaskLinksPanel'

type TaskChangeHandler<Value> = (
  taskId: EntityId,
  value: Value,
) => void | Promise<void>

export interface RoutineDetailsCardProps {
  task?: Task | null
  client?: Client
  routine?: Routine
  department?: Department
  employees?: Employee[]
  onStatusChange?: (taskId: EntityId, status: RoutineStatus) => void
  allowedStatusChanges?: readonly RoutineStatus[]
  onAssigneeChange?: TaskChangeHandler<EntityId | null>
  onDueDateChange?: TaskChangeHandler<string>
  onAttachmentAdd?: (task: Task) => void
  onAttachmentRemove?: (taskId: EntityId, attachmentId: EntityId) => void
  onContentChange?: TaskChangeHandler<{ title: string; description: string }>
  onNotesChange?: TaskChangeHandler<string>
  onClose?: () => void
}

interface DetailsModel {
  title: string
  description?: string
  reference: string
  breadcrumb: string
  clientLabel: string
  departmentLabel: string
  periodLabel: string
  typeLabel: string
  completedLabel: string
}

function RoutineDetailsCard({
  task,
  client,
  routine,
  department,
  employees = [],
  onStatusChange,
  allowedStatusChanges,
  onAssigneeChange,
  onDueDateChange,
  onAttachmentAdd,
  onAttachmentRemove,
  onContentChange,
  onNotesChange,
  onClose,
}: RoutineDetailsCardProps) {
  if (!task) return null

  const statusConfig =
    routineStatusConfig[task.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]
  const model = buildDetailsModel({ task, client, routine, department })
  const titleId = `routine-details-title-${task.id}`

  return (
    <article
      className="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-main)] shadow-[var(--shadow-floating)]"
      aria-labelledby={titleId}
      data-details-view="document"
    >
      <div
        className={`absolute inset-x-0 top-0 z-20 h-1 ${statusConfig.accentClass}`}
        aria-hidden="true"
      />

      <RoutineIdentityHeader
        model={model}
        statusConfig={statusConfig}
        titleId={titleId}
        onClose={onClose}
      />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0 space-y-4 overflow-y-auto p-4 sm:p-5">
          <TaskContentSection
            task={task}
            model={model}
            onContentChange={onContentChange}
          />

          <section
            className="overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]"
            data-execution-context="combined"
            aria-label="Execução da tarefa"
          >
            <div className="p-3">
              <RoutineAttachmentsPanel
                task={task}
                onAttachmentAdd={onAttachmentAdd}
                onAttachmentRemove={onAttachmentRemove}
                variant="preview"
              />
            </div>
            <div className="border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-3">
              <RoutineNotesPanel
                task={task}
                onNotesChange={onNotesChange}
                variant="embedded"
                title="Registro da execução"
                rows={2}
              />
            </div>
          </section>
        </main>

        <aside className="min-h-0 overflow-y-auto border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4 lg:border-t-0 lg:border-l">
          <DetailsSidebar
            task={task}
            employees={employees}
            model={model}
            onStatusChange={onStatusChange}
            allowedStatusChanges={allowedStatusChanges}
            onAssigneeChange={onAssigneeChange}
            onDueDateChange={onDueDateChange}
          />
        </aside>
      </div>
    </article>
  )
}

interface RoutineIdentityHeaderProps {
  model: DetailsModel
  statusConfig: RoutineStatusConfig
  titleId: string
  onClose?: () => void
}

function RoutineIdentityHeader({
  model,
  statusConfig,
  titleId,
  onClose,
}: RoutineIdentityHeaderProps) {
  return (
    <header className="shrink-0 border-b border-[var(--color-divider)] px-4 pt-4 pb-3 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
          <span className={`size-2 rounded-full ${statusConfig.dotClass}`} />
          <span className="truncate">{model.reference}</span>
          <span aria-hidden="true">/</span>
          <span className="truncate">{model.breadcrumb}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          data-dialog-close
          className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          aria-label="Fechar detalhes"
        >
          <CloseIcon />
        </button>
      </div>

      <h2
        id={titleId}
        className="mt-2 truncate text-xl font-bold tracking-tight text-[var(--color-text-strong)] sm:text-2xl"
      >
        {model.title}
      </h2>
    </header>
  )
}

function TaskContentSection({
  task,
  model,
  onContentChange,
}: {
  task: Task
  model: DetailsModel
  onContentChange?: TaskChangeHandler<{ title: string; description: string }>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(model.title)
  const [description, setDescription] = useState(model.description ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTitle(model.title)
    setDescription(model.description ?? '')
    setIsEditing(false)
    setError('')
  }, [model.description, model.title, task.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!onContentChange) return

    if (title.length > 200) {
      setError('O título pode ter no máximo 200 caracteres.')
      return
    }

    if (description.length > 5000) {
      setError('A descrição pode ter no máximo 5.000 caracteres.')
      return
    }

    if (title === model.title && description === (model.description ?? '')) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await onContentChange(task.id, { title, description })
      setIsEditing(false)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível salvar o conteúdo da execução.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    setTitle(model.title)
    setDescription(model.description ?? '')
    setError('')
    setIsEditing(false)
  }

  return (
    <section aria-labelledby={`description-title-${task.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHeading
          id={`description-title-${task.id}`}
          title="Descrição"
          icon={<DescriptionIcon />}
        />
        {onContentChange && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="min-h-8 rounded-[var(--radius-control)] border border-[var(--color-divider)] px-2.5 text-xs font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]"
          >
            Editar conteúdo
          </button>
        )}
      </div>

      {isEditing ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[var(--color-text-muted)]">
              Título da execução
            </span>
            <input
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              className="min-h-10 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-sm text-[var(--color-text-strong)] outline-none transition focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-control-focus)]/20 disabled:opacity-60"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[var(--color-text-muted)]">
              Descrição da execução
            </span>
            <textarea
              value={description}
              maxLength={5000}
              rows={4}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
              className="resize-y rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm leading-6 text-[var(--color-text-strong)] outline-none transition focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-control-focus)]/20 disabled:opacity-60"
            />
          </label>
          {error && (
            <p
              className="text-sm font-semibold text-[var(--status-error-text)]"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="min-h-9 rounded-[var(--radius-control)] border border-[var(--color-divider)] px-3 text-sm font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-9 rounded-[var(--radius-control)] bg-[var(--color-brand)] px-3 text-sm font-bold text-white hover:brightness-95 disabled:opacity-60"
            >
              {isSaving ? 'Salvando…' : 'Salvar conteúdo'}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
          {model.description ||
            'Nenhuma descrição cadastrada para esta execução.'}
        </p>
      )}
    </section>
  )
}

function DetailsSidebar({
  task,
  employees,
  model,
  onStatusChange,
  allowedStatusChanges,
  onAssigneeChange,
  onDueDateChange,
}: {
  task: Task
  employees: Employee[]
  model: DetailsModel
  onStatusChange?: (taskId: EntityId, status: RoutineStatus) => void
  allowedStatusChanges?: readonly RoutineStatus[]
  onAssigneeChange?: TaskChangeHandler<EntityId | null>
  onDueDateChange?: TaskChangeHandler<string>
}) {
  return (
    <section aria-labelledby={`details-title-${task.id}`}>
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`details-title-${task.id}`}
          className="text-sm font-bold text-[var(--color-text-strong)]"
        >
          Detalhes
        </h3>
        <RoutineStatusControl
          task={task}
          onStatusChange={onStatusChange}
          allowedStatusChanges={allowedStatusChanges}
          variant="menu"
        />
      </div>

      <div className="mt-3 space-y-1 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1">
        <RoutineEditableFields
          task={task}
          employees={employees}
          onAssigneeChange={onAssigneeChange}
          onDueDateChange={onDueDateChange}
          appearance="row"
          layout="stacked"
        />
      </div>

      <div
        className="mt-4 border-t border-[var(--color-divider)] pt-4"
        data-task-resources="links"
      >
        <TaskLinksPanel task={task} title="Links úteis" compact />
      </div>

      <EntityFacts model={model} />
    </section>
  )
}

function EntityFacts({ model }: { model: DetailsModel }) {
  const facts: Array<[string, string]> = [
    ['Empresa', model.clientLabel],
    ['Departamento', model.departmentLabel],
    ['Competência', model.periodLabel],
    ['Tipo', model.typeLabel],
    ...(model.completedLabel
      ? ([['Finalizada em', model.completedLabel]] as Array<[string, string]>)
      : []),
  ]

  return (
    <section className="mt-4">
      <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
        Informações
      </h3>
      <dl className="mt-2 space-y-2.5">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2"
          >
            <dt className="text-xs text-[var(--color-text-subtle)]">{label}</dt>
            <dd
              className="truncate text-xs font-semibold text-[var(--color-text-strong)]"
              title={value}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function SectionHeading({
  id,
  title,
  icon,
}: {
  id: string
  title: string
  icon: ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      <h3 id={id} className="text-sm font-bold text-[var(--color-text-strong)]">
        {title}
      </h3>
    </div>
  )
}

function buildDetailsModel({
  task,
  client,
  routine,
  department,
}: {
  task: Task
  client?: Client
  routine?: Routine
  department?: Department
}): DetailsModel {
  const isAdHocTask = task.kind === 'ad_hoc'
  const title =
    task.title ??
    (isAdHocTask ? 'Tarefa avulsa' : (routine?.name ?? 'Execução'))
  const description =
    task.description ?? (isAdHocTask ? undefined : routine?.description)
  const referencePrefix = isAdHocTask ? 'Tarefa avulsa' : 'Execução de rotina'

  return {
    title,
    description,
    reference: `${referencePrefix} · ${shortenReference(task.id)}`,
    breadcrumb: `${client ? getCompanyCodeLabel(client.code) : 'AV'} · ${department?.name ?? 'Sem departamento'}`,
    clientLabel: client?.name ?? 'Tarefa avulsa',
    departmentLabel: department?.name ?? 'Sem departamento',
    periodLabel: formatPeriod(task.period),
    typeLabel: isAdHocTask ? 'Tarefa avulsa' : 'Rotina recorrente',
    completedLabel: formatDateTime(task.completedAt),
  }
}

function shortenReference(taskId = ''): string {
  const normalized = taskId.replace(/^task-/, '').replace(/^loose-task-/, '')
  return normalized.length > 28 ? `${normalized.slice(0, 28)}…` : normalized
}

function formatPeriod(period: string): string {
  if (!period) return 'Sem competência'
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  if (Number.isNaN(date.getTime())) return period

  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="m7 7 10 10M17 7 7 17" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DescriptionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M5 6h14M5 10h14M5 14h9M5 18h6"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default RoutineDetailsCard
