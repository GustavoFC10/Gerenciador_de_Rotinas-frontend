import { focusRing } from '../../constants/designTokens'
import type { Task } from '../../types/domain'
import type {
  HomePriorityItem,
  HomePriorityKind,
} from '../../utils/homeOverview'
import { HomeIcon } from './HomePrimitives'

const priorityPresentation: Record<
  HomePriorityKind,
  { label: string; className: string }
> = {
  error: {
    label: 'Com erro',
    className:
      'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
  },
  overdue: {
    label: 'Atrasada',
    className:
      'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
  },
  today: {
    label: 'Vence hoje',
    className:
      'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]',
  },
  soon: {
    label: 'Prazo próximo',
    className:
      'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]',
  },
  in_progress: {
    label: 'Em andamento',
    className:
      'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]',
  },
  pending: {
    label: 'Pendente',
    className:
      'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]',
  },
}

function HomePrioritySection({
  priorities,
  openCount,
  referenceDate,
  onTaskOpen,
}: {
  priorities: HomePriorityItem[]
  openCount: number
  referenceDate: string
  onTaskOpen: (task: Task) => void
}) {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]"
      aria-labelledby="home-priorities-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-divider)] px-5 py-4">
        <h2
          id="home-priorities-title"
          className="text-lg font-extrabold text-[var(--color-text-strong)]"
        >
          Prioridades da equipe
        </h2>
        <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--color-panel-soft-bg)] px-2.5 text-xs font-bold text-[var(--color-text-muted)] ring-1 ring-[var(--color-panel-border)]">
          {openCount} {openCount === 1 ? 'tarefa aberta' : 'tarefas abertas'}
        </span>
      </div>

      {priorities.length > 0 ? (
        <HomePriorityList
          priorities={priorities}
          referenceDate={referenceDate}
          onTaskOpen={onTaskOpen}
        />
      ) : (
        <div className="px-5 py-9 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]">
            <HomeIcon name="check" className="size-6" />
          </span>
          <p className="mt-3 text-sm font-bold text-[var(--color-text-strong)]">
            Tudo em dia nesta competência
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Não há tarefas abertas nos departamentos aos quais você tem acesso.
          </p>
        </div>
      )}
    </section>
  )
}

export function HomePriorityList({
  priorities,
  referenceDate,
  onTaskOpen,
}: {
  priorities: HomePriorityItem[]
  referenceDate: string
  onTaskOpen: (task: Task) => void
}) {
  return (
    <ul className="divide-y divide-[var(--color-divider)]">
      {priorities.map((priority) => {
        const presentation = priorityPresentation[priority.kind]

        return (
          <li key={priority.task.id}>
            <button
              type="button"
              onClick={() => onTaskOpen(priority.task)}
              className={`group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[var(--color-panel-soft-bg)] ${focusRing}`}
              aria-label={`Abrir ${priority.title}`}
            >
              <span
                className={`hidden min-w-[7.25rem] shrink-0 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold sm:inline-flex ${presentation.className}`}
              >
                {presentation.label}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 sm:hidden">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${presentation.className}`}
                  >
                    {presentation.label}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm font-bold text-[var(--color-text-strong)] sm:mt-0">
                  {priority.title}
                </span>
                <span className="mt-0.5 block truncate text-xs font-medium text-[var(--color-text-muted)]">
                  {priority.context}
                </span>
              </span>

              <span
                className={`hidden shrink-0 text-right text-xs font-semibold md:block ${
                  priority.isOverdue
                    ? 'text-[var(--status-error-text)]'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {formatDueLabel(priority.item.dueDate, referenceDate)}
              </span>

              <HomeIcon
                name="arrow"
                className="size-4 shrink-0 text-[var(--color-text-subtle)] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function formatDueLabel(dueDate: string, referenceDate: string): string {
  if (dueDate === referenceDate) return 'Vence hoje'

  const difference = getDateDifference(referenceDate, dueDate)
  if (difference === 1) return 'Vence amanhã'

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${dueDate}T00:00:00Z`))

  return difference < 0 ? `Venceu ${formattedDate}` : `Vence ${formattedDate}`
}

function getDateDifference(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)
  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)
}

export default HomePrioritySection
