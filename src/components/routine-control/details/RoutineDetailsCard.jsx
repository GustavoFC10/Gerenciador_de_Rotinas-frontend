import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus.js'
import {
  RoutineAttachmentsPanel,
  RoutineNotesPanel,
  RoutineStatusControl,
} from '../shared/RoutineCardActions.jsx'
import RoutineEditableFields, {
  RoutineAssigneeField,
  RoutineDueDateField,
} from '../shared/RoutineEditableFields.jsx'
import ViewStyleSwitcher from '../../ui/ViewStyleSwitcher.jsx'
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
  onAttachmentRemove,
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
  const isPanel = variant === 'panel'
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
    onAttachmentRemove,
    onNotesChange,
    onClose,
  }

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-main)] shadow-[var(--shadow-floating)] ${
        isPanel ? 'h-[calc(100dvh-2rem)]' : 'max-h-[calc(100dvh-2rem)]'
      }`}
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
  const { task, model, onAttachmentAdd, onAttachmentRemove, onNotesChange } =
    props

  return (
    <>
      <RoutineIdentityHeader {...props} mode="issue" />
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
            aria-label="Anexos e registro da execução"
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
          <DetailsSidebar {...props} />
        </aside>
      </div>
    </>
  )
}

function RoutineContextLayout(props) {
  const {
    task,
    model,
    onAttachmentAdd,
    onAttachmentRemove,
    onNotesChange,
    onStatusChange,
  } = props

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
                onAttachmentRemove={onAttachmentRemove}
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
    onAttachmentRemove,
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

        <main
          className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden p-3 sm:p-4"
          data-flow-main
        >
          <div className="flex shrink-0 items-start justify-between gap-3">
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
            <p className="shrink-0 text-sm leading-5 text-[var(--color-text-muted)]">
              {model.description}
            </p>
          )}

          <RoutineAttachmentsPanel
            task={task}
            onAttachmentAdd={onAttachmentAdd}
            onAttachmentRemove={onAttachmentRemove}
            variant="gallery"
            title="Galeria de anexos"
            className="min-h-0 flex-1"
          />

          <RoutineNotesPanel
            task={task}
            onNotesChange={onNotesChange}
            variant="callout"
            title="Nota de contexto"
            rows={2}
            className="shrink-0"
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
  model,
  statusConfig,
  titleId,
  viewMode,
  onViewModeChange,
  onClose,
  mode,
}) {
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
  onStatusChange,
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
    label: 'Opção 1',
  },
  {
    id: 'compact',
    label: 'Opção 2',
  },
  {
    id: 'panel',
    label: 'Opção 3',
  },
]

function RoutineDetailsViewMenu({ selectedView, onViewChange }) {
  return (
    <ViewStyleSwitcher
      value={selectedView}
      options={detailsViewOptions}
      onChange={onViewChange}
      ariaLabel="Trocar visualização do card"
      title="Visualização do card"
    />
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
