import { Link } from 'react-router'

import { focusRing } from '../../constants/designTokens'
import { ROUTES } from '../../constants/routes'
import type { HomeDepartmentOverview } from '../../utils/homeOverview'
import { HomeIcon, HomeProgressBar, HomeSummaryMetric } from './HomePrimitives'

function HomeDepartmentPeriodCard({
  overview,
}: {
  overview: HomeDepartmentOverview
}) {
  return (
    <aside
      className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)]"
      aria-labelledby="home-period-title"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
          <HomeIcon name="people" className="size-5" />
        </span>
        <div>
          <h2
            id="home-period-title"
            className="text-lg font-extrabold text-[var(--color-text-strong)]"
          >
            Competência da equipe
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Visão conjunta dos departamentos aos quais você tem acesso.
          </p>
        </div>
      </div>

      {overview.total > 0 ? (
        <>
          <div className="mt-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-black text-[var(--color-text-strong)]">
                  {overview.finalized}
                  <span className="text-base font-bold text-[var(--color-text-muted)]">
                    {' '}
                    de {overview.total}
                  </span>
                </p>
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                  tarefas encerradas
                </p>
              </div>
              <span className="text-sm font-extrabold text-[var(--color-brand)]">
                {overview.completionPercentage}%
              </span>
            </div>
            <HomeProgressBar
              value={overview.completionPercentage}
              label="Andamento das tarefas da equipe na competência"
            />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-2">
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
              label="Em andamento"
              value={overview.inProgress}
              tone="progress"
            />
            <HomeSummaryMetric
              label="Pendentes"
              value={overview.pending}
              tone="neutral"
            />
          </dl>
        </>
      ) : (
        <p className="mt-5 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
          Não há tarefas nos departamentos aos quais você tem acesso nesta
          competência.
        </p>
      )}

      <div className="mt-5 border-t border-[var(--color-divider)] pt-4">
        <Link
          to={ROUTES.TASKS}
          className={`inline-flex items-center gap-2 rounded-[var(--radius-control)] text-sm font-bold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] ${focusRing}`}
        >
          Ver todas as tarefas
          <HomeIcon name="arrow" className="size-4" />
        </Link>
      </div>
    </aside>
  )
}

export default HomeDepartmentPeriodCard
