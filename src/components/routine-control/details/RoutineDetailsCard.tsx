import type { ReactNode } from 'react'
import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus'
import type {
  Client,
  CreateTaskLinkInput,
  Department,
  Employee,
  EntityId,
  Routine,
  RoutineStatus,
  RoutineStatusConfig,
  Task,
} from '../../../types/domain'
import {
  RoutineAttachmentsPanel,
  RoutineNotesPanel,
  RoutineStatusControl,
} from '../shared/RoutineCardActions'
import RoutineEditableFields from '../shared/RoutineEditableFields'
import TaskLinksPanel from './TaskLinksPanel'

interface RoutineDetailsCardProps {
  task?: Task | null
  client?: Client
  routine?: Routine
  department?: Department
  employees?: Employee[]
  onStatusChange?: (taskId: EntityId, status: RoutineStatus) => void
  onAssigneeChange?: (taskId: EntityId, assigneeId: EntityId | null) => void
  onDueDateChange?: (taskId: EntityId, dueDate: string) => void
  onAttachmentAdd?: (task: Task) => void
  onAttachmentRemove?: (taskId: EntityId, attachmentId: EntityId) => void
  onNotesChange?: (taskId: EntityId, notes: string) => void
  onLinkAdd?: (taskId: EntityId, link: CreateTaskLinkInput) => void
  onLinkRemove?: (taskId: EntityId, linkId: EntityId) => void
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
  onAssigneeChange,
  onDueDateChange,
  onAttachmentAdd,
  onAttachmentRemove,
  onNotesChange,
  onLinkAdd,
  onLinkRemove,
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
          <section aria-labelledby={`description-title-${task.id}`}>
            <SectionHeading
              id={`description-title-${task.id}`}
              title="Descrição"
              icon={<DescriptionIcon />}
            />
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
              {model.description ||
                'Nenhuma descrição cadastrada para esta execução.'}
            </p>
          </section>

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
            onAssigneeChange={onAssigneeChange}
            onDueDateChange={onDueDateChange}
            onLinkAdd={onLinkAdd}
            onLinkRemove={onLinkRemove}
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

function DetailsSidebar({
  task,
  employees,
  model,
  onStatusChange,
  onAssigneeChange,
  onDueDateChange,
  onLinkAdd,
  onLinkRemove,
}: {
  task: Task
  employees: Employee[]
  model: DetailsModel
  onStatusChange?: (taskId: EntityId, status: RoutineStatus) => void
  onAssigneeChange?: (taskId: EntityId, assigneeId: EntityId | null) => void
  onDueDateChange?: (taskId: EntityId, dueDate: string) => void
  onLinkAdd?: (taskId: EntityId, link: CreateTaskLinkInput) => void
  onLinkRemove?: (taskId: EntityId, linkId: EntityId) => void
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
        <TaskLinksPanel
          task={task}
          title="Links úteis"
          compact
          onLinkAdd={onLinkAdd}
          onLinkRemove={onLinkRemove}
        />
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
  const title = task.isLoose
    ? (task.title ?? 'Tarefa avulsa')
    : (routine?.name ?? task.title ?? 'Execução')
  const description = task.isLoose ? task.description : routine?.description
  const referencePrefix = task.isLoose ? 'Tarefa avulsa' : 'Execução de rotina'

  return {
    title,
    description,
    reference: `${referencePrefix} · ${shortenReference(task.id)}`,
    breadcrumb: `${client?.code ?? 'AV'} · ${department?.name ?? 'Sem departamento'}`,
    clientLabel: client?.name ?? 'Tarefa avulsa',
    departmentLabel: department?.name ?? 'Sem departamento',
    periodLabel: formatPeriod(task.period),
    typeLabel: task.isLoose ? 'Tarefa avulsa' : 'Rotina recorrente',
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
