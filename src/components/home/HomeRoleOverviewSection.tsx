import { Link } from 'react-router'

import { focusRing } from '../../constants/designTokens'
import { ROUTES } from '../../constants/routes'
import type { Task } from '../../types/domain'
import type { HomeRoleOverview } from '../../utils/homeOverview'
import { HomePriorityList } from './HomePrioritySection'
import { HomeIcon, HomeProgressBar, HomeSummaryMetric } from './HomePrimitives'

function HomeRoleOverviewSection({
  overview,
  manager,
  referenceDate,
  onTaskOpen,
}: {
  overview: HomeRoleOverview
  manager: boolean
  referenceDate: string
  onTaskOpen: (task: Task) => void
}) {
  const title = manager ? 'Visão da operação' : 'Acompanhamento do departamento'
  const description = manager
    ? 'Exceções das áreas de trabalho que precisam de acompanhamento gerencial.'
    : 'Exceções das rotinas sob responsabilidade da sua equipe.'
  const destination = manager
    ? ROUTES.MANAGER_DASHBOARD
    : ROUTES.DEPARTMENT_DASHBOARD

  return (
    <section
      className="mt-5 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]"
      aria-labelledby="home-role-overview-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-divider)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
            <HomeIcon name="people" className="size-5" />
          </span>
          <div>
            <h2
              id="home-role-overview-title"
              className="text-lg font-extrabold text-[var(--color-text-strong)]"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {description}
            </p>
          </div>
        </div>
        <Link
          to={destination}
          className={`inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] px-3 text-sm font-bold text-[var(--color-button-neutral-text)] hover:bg-[var(--color-button-neutral-hover-bg)] ${focusRing}`}
        >
          Abrir visão completa
          <HomeIcon name="arrow" className="size-4" />
        </Link>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <HomeSummaryMetric
              label="Com erro"
              value={overview.errors}
              tone="error"
            />
            <HomeSummaryMetric
              label="Atrasadas"
              value={overview.overdue}
              tone="error"
            />
            <HomeSummaryMetric
              label="Sem responsável"
              value={overview.unassigned}
              tone="neutral"
            />
            <HomeSummaryMetric
              label="Encerradas"
              value={overview.finalized}
              tone="neutral"
            />
          </dl>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Andamento da operação</span>
              <span>{overview.completionPercentage}%</span>
            </div>
            <HomeProgressBar
              value={overview.completionPercentage}
              label="Andamento das tarefas da operação"
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-extrabold text-[var(--color-text-strong)]">
            Exceções mais urgentes
          </h3>
          {overview.priorities.length > 0 ? (
            <div className="overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-divider)]">
              <HomePriorityList
                priorities={overview.priorities}
                referenceDate={referenceDate}
                onTaskOpen={onTaskOpen}
              />
            </div>
          ) : (
            <p className="rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
              Nenhuma exceção operacional nesta competência.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default HomeRoleOverviewSection
