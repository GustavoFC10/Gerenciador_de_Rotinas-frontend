import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus.js'
import {
  RoutineAttachmentButton,
  RoutineAttachmentsPanel,
  RoutineNotesPanel,
  RoutineStatusControl,
} from '../shared/RoutineCardActions.jsx'
import RoutineEditableFields, {
  RoutineAssigneeField,
  RoutineDueDateField,
} from '../shared/RoutineEditableFields.jsx'
import { getRoutineAttachments } from './routineDetailsUtils.js'

const detailsLayoutByVariant = {
  document: RoutineIssueLayout,
  compact: RoutineContextLayout,
  panel: RoutineFlowLayout,
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
  onNotesChange,
  onClose,
  viewMode = 'document',
  onViewModeChange,
  variant = 'document',
}) {
  if (!task) return null

  const statusConfig =
    routineStatusConfig[task.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]
  const model = buildDetailsModel({ task, client, routine, department })
  const Layout = detailsLayoutByVariant[variant] ?? RoutineIssueLayout
  const titleId = `routine-details-title-${task.id}`
  const sharedLayoutProps = {
    task,
    client,
    routine,
    department,
    employees,
    model,
    statusConfig,
    titleId,
    viewMode,
    onViewModeChange,
    onStatusChange,
    onAssigneeChange,
    onDueDateChange,
    onAttachmentAdd,
    onNotesChange,
    onClose,
  }

  return (
    <article
      className="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-main)] shadow-[var(--shadow-floating)]"
      aria-labelledby={titleId}
      data-details-view={variant}
    >
      <div
        className={`absolute inset-x-0 top-0 z-20 h-1 ${statusConfig.accentClass}`}
        aria-hidden="true"
      />
      <Layout {...sharedLayoutProps} />
    </article>
  )
}

function RoutineIssueLayout(props) {
  const { task, model, onAttachmentAdd, onNotesChange } = props

  return (
    <>
      <RoutineIdentityHeader {...props} mode="issue" />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0 space-y-5 overflow-y-auto p-4 sm:p-5">
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

          <RoutineAttachmentsPanel
            task={task}
            onAttachmentAdd={onAttachmentAdd}
            variant="list"
            description="Documentos vinculados a esta competência"
          />

          <section aria-labelledby={`activity-title-${task.id}`}>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <SectionHeading
                id={`activity-title-${task.id}`}
                title="Atividade"
                icon={<ActivityIcon />}
              />
              <ExecutionMetrics task={task} compact />
            </div>
            <RoutineNotesPanel
              task={task}
              onNotesChange={onNotesChange}
              variant="callout"
              title="Registro da execução"
              description="Observações operacionais e contexto para a equipe"
              rows={2}
            />
          </section>
        </main>

        <aside className="min-h-0 overflow-y-auto border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4 lg:border-t-0 lg:border-l">
          <DetailsSidebar {...props} />
        </aside>
      </div>
    </>
  )
}

function RoutineContextLayout(props) {
  const { task, model, onAttachmentAdd, onNotesChange, onStatusChange } = props

  return (
    <>
      <RoutineIdentityHeader {...props} mode="context" />
      <OwnershipBand {...props} />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <main className="min-w-0 overflow-y-auto p-3 sm:p-4">
          <section
            className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]"
            aria-labelledby={`context-title-${task.id}`}
          >
            <header className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-2">
              <h3
                id={`context-title-${task.id}`}
                className="text-sm font-bold text-[var(--color-text-strong)]"
              >
                Contexto
              </h3>
              <ExecutionMetrics task={task} compact />
            </header>

            <div className="p-3">
              {model.description && (
                <p className="mb-3 text-xs leading-5 text-[var(--color-text-muted)]">
                  {model.description}
                </p>
              )}
              <RoutineAttachmentsPanel
                task={task}
                onAttachmentAdd={onAttachmentAdd}
                variant="embedded"
              />
              <div className="my-3 h-px bg-[var(--color-divider)]" />
              <RoutineNotesPanel
                task={task}
                onNotesChange={onNotesChange}
                variant="embedded"
                title="Observações"
                rows={2}
              />
            </div>
          </section>
        </main>

        <aside className="min-h-0 space-y-3 overflow-y-auto border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-3 lg:border-t-0 lg:border-l">
          <RoutineStatusControl
            task={task}
            onStatusChange={onStatusChange}
            variant="rail"
          />
          <EntityFacts model={model} compact />
        </aside>
      </div>
    </>
  )
}

function RoutineFlowLayout(props) {
  const {
    task,
    model,
    employees,
    onStatusChange,
    onAssigneeChange,
    onDueDateChange,
    onAttachmentAdd,
    onNotesChange,
  } = props

  return (
    <>
      <RoutineIdentityHeader {...props} mode="flow" />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[12rem_minmax(0,1fr)_16rem]">
        <aside className="min-h-0 overflow-y-auto border-b border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-3 lg:border-r lg:border-b-0">
          <RoutineStatusControl
            task={task}
            onStatusChange={onStatusChange}
            variant="grouped"
          />
        </aside>

        <main className="min-w-0 space-y-3 overflow-y-auto p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                Área principal
              </p>
              <h3 className="mt-0.5 text-base font-bold text-[var(--color-text-strong)]">
                Evidências da execução
              </h3>
            </div>
            <ExecutionMetrics task={task} compact />
          </div>

          {model.description && (
            <p className="text-sm leading-5 text-[var(--color-text-muted)]">
              {model.description}
            </p>
          )}

          <RoutineAttachmentsPanel
            task={task}
            onAttachmentAdd={onAttachmentAdd}
            variant="gallery"
            title="Galeria de anexos"
          />

          <RoutineNotesPanel
            task={task}
            onNotesChange={onNotesChange}
            variant="callout"
            title="Nota de contexto"
            rows={2}
          />
        </main>

        <aside className="min-h-0 space-y-4 overflow-y-auto border-t border-[var(--color-divider)] p-3 lg:border-t-0 lg:border-l">
          <section aria-labelledby={`ownership-title-${task.id}`}>
            <h3
              id={`ownership-title-${task.id}`}
              className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]"
            >
              Responsabilidade
            </h3>
            <div className="mt-2 space-y-1 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] p-1">
              <RoutineEditableFields
                task={task}
                employees={employees}
                onAssigneeChange={onAssigneeChange}
                onDueDateChange={onDueDateChange}
                appearance="row"
                layout="stacked"
              />
            </div>
          </section>
          <EntityFacts model={model} />
        </aside>
      </div>
    </>
  )
}

function RoutineIdentityHeader({
  task,
  model,
  statusConfig,
  titleId,
  viewMode,
  onViewModeChange,
  onStatusChange,
  onAttachmentAdd,
  onClose,
  mode,
}) {
  const isIssue = mode === 'issue'
  const isFlow = mode === 'flow'

  return (
    <header
      className={`shrink-0 border-b border-[var(--color-divider)] ${
        isFlow ? 'px-4 py-3' : 'px-4 pt-4 pb-3 sm:px-5'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
          <span className={`size-2 rounded-full ${statusConfig.dotClass}`} />
          <span className="truncate">{model.reference}</span>
          <span aria-hidden="true">/</span>
          <span className="truncate">{model.breadcrumb}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <RoutineDetailsViewMenu
            selectedView={viewMode}
            onViewChange={onViewModeChange}
          />
          <button
            type="button"
            onClick={onClose}
            data-dialog-close
            className="grid size-8 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
            aria-label="Fechar detalhes"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className={`min-w-0 ${isFlow ? 'mt-1' : 'mt-2'}`}>
        <h2
          id={titleId}
          className={`truncate font-bold tracking-tight text-[var(--color-text-strong)] ${
            isFlow ? 'text-lg' : 'text-xl sm:text-2xl'
          }`}
        >
          {model.title}
        </h2>
      </div>

      {isIssue && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <RoutineAttachmentButton
              task={task}
              onAttachmentAdd={onAttachmentAdd}
              compact
            />
            <HeaderMetric icon={<CommentIcon />}>
              {model.commentCount} comentários
            </HeaderMetric>
            <HeaderMetric>{model.typeLabel}</HeaderMetric>
          </div>
          <RoutineStatusControl
            task={task}
            onStatusChange={onStatusChange}
            variant="menu"
          />
        </div>
      )}
    </header>
  )
}

function OwnershipBand({
  task,
  employees,
  onAssigneeChange,
  onDueDateChange,
  model,
}) {
  return (
    <section className="shrink-0 border-b border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-2 sm:px-4">
      <div className="grid items-center gap-2 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_12rem]">
        <div className="px-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
            Responsabilidade
          </p>
        </div>
        <RoutineAssigneeField
          task={task}
          employees={employees}
          onChange={onAssigneeChange}
          appearance="row"
        />
        <RoutineDueDateField
          task={task}
          onChange={onDueDateChange}
          appearance="row"
        />
        <div className="hidden border-l border-[var(--color-divider)] pl-4 md:block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
            Competência
          </span>
          <span className="mt-0.5 block truncate text-sm font-bold text-[var(--color-text-strong)]">
            {model.periodLabel}
          </span>
        </div>
      </div>
    </section>
  )
}

function DetailsSidebar({
  task,
  employees,
  model,
  onAssigneeChange,
  onDueDateChange,
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
        <DetailsIcon />
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

      <EntityFacts model={model} className="mt-4" />
    </section>
  )
}

function EntityFacts({ model, compact = false, className = '' }) {
  const facts = [
    ['Empresa', model.clientLabel],
    ['Departamento', model.departmentLabel],
    ['Competência', model.periodLabel],
    ['Tipo', model.typeLabel],
    ...(model.completedLabel ? [['Finalizada em', model.completedLabel]] : []),
  ]

  return (
    <section
      className={`${
        compact
          ? 'rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-3'
          : ''
      } ${className}`}
    >
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

function ExecutionMetrics({ task, compact = false }) {
  const metrics = [
    { label: 'anexos', value: getRoutineAttachments(task).length },
    { label: 'comentários', value: Number(task.indicators?.comments) || 0 },
    { label: 'alertas', value: Number(task.indicators?.alerts) || 0 },
  ]

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Indicadores da execução"
    >
      {metrics.map((metric) => (
        <span
          key={metric.label}
          className={`rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] font-bold text-[var(--color-text-muted)] ${
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
          }`}
        >
          {metric.value} {metric.label}
        </span>
      ))}
    </div>
  )
}

function HeaderMetric({ icon, children }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] px-2.5 text-xs font-semibold text-[var(--color-text-muted)]">
      {icon}
      {children}
    </span>
  )
}

function SectionHeading({ id, title, icon }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      <h3 id={id} className="text-sm font-bold text-[var(--color-text-strong)]">
        {title}
      </h3>
    </div>
  )
}

const detailsViewOptions = [
  {
    id: 'document',
    label: 'Ficha detalhada',
    description: 'Estrutura inspirada em registros do Jira',
  },
  {
    id: 'compact',
    label: 'Contexto',
    description: 'Arquivos e observações em um workspace',
  },
  {
    id: 'panel',
    label: 'Fluxo',
    description: 'Estado, evidências e ficha em três áreas',
  },
]

function RoutineDetailsViewMenu({ selectedView, onViewChange }) {
  return (
    <details className="group relative">
      <summary
        className="grid size-8 cursor-pointer list-none place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] transition marker:hidden hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
        aria-label="Visualizar outras apresentações do card"
        title="Alterar visualização"
      >
        <LayoutIcon />
      </summary>

      <div className="absolute right-0 z-40 mt-1 w-64 rounded-[var(--radius-control)] border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] p-1 shadow-[var(--shadow-floating)]">
        {detailsViewOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={(event) => {
              onViewChange?.(option.id)
              event.currentTarget.closest('details')?.removeAttribute('open')
            }}
            className={`block w-full rounded-[var(--radius-control)] px-3 py-2 text-left transition ${
              selectedView === option.id
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]'
            }`}
            aria-current={selectedView === option.id ? 'true' : undefined}
          >
            <span className="block text-xs font-bold">{option.label}</span>
            <span className="mt-0.5 block text-[10px] opacity-80">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </details>
  )
}

function buildDetailsModel({ task, client, routine, department }) {
  const title = task.isLoose ? task.title : (routine?.name ?? task.title)
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
    commentCount: Number(task.indicators?.comments) || 0,
  }
}

function shortenReference(taskId = '') {
  const normalized = taskId.replace(/^task-/, '').replace(/^loose-task-/, '')
  return normalized.length > 28 ? `${normalized.slice(0, 28)}…` : normalized
}

function formatPeriod(period) {
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

function formatDateTime(value) {
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

function LayoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M4 5h16v14H4zM4 10h16M10 10v9"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
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

function ActivityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M4 12h3l2-5 4 10 2-5h5"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M5 5.5h14v12H9l-4 3v-15Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DetailsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 text-[var(--color-text-subtle)]"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M5 7h14M5 12h14M5 17h9"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default RoutineDetailsCard
