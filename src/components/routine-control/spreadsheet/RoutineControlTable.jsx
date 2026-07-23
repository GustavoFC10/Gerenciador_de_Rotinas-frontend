import RoutineClosedCardCompact from './RoutineClosedCardCompact.jsx'
import RoutineNotApplicableCard from './RoutineNotApplicableCard.jsx'
import { ROUTINE_STATUS } from '../../../constants/routineStatus.js'

const closedStatuses = new Set([
  ROUTINE_STATUS.COMPLETED,
  ROUTINE_STATUS.NO_MOVEMENT,
  ROUTINE_STATUS.NOT_APPLICABLE,
])

function RoutineHeaderButton({ routine, stats, variant, onOpen }) {
  const isDense = variant === 'dense'

  return (
    <button
      type="button"
      onClick={() => onOpen?.(routine)}
      className={`block w-full text-center font-bold leading-tight text-[var(--color-table-action-text)] transition hover:bg-[var(--color-table-action-hover-bg)] hover:text-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)] ${
        isDense
          ? 'min-h-12 px-2 py-1.5 text-[10px]'
          : 'min-h-14 px-3 py-3 text-xs'
      }`}
      aria-label={`Listar empresas da rotina ${routine.name}`}
    >
      <span className={isDense ? 'line-clamp-1' : 'line-clamp-2'}>
        {routine.shortName}
      </span>
      {isDense ? <DenseProgress stats={stats} /> : null}
    </button>
  )
}

function ClientRowButton({ client, stats, variant, onOpen }) {
  const isDense = variant === 'dense'

  return (
    <button
      type="button"
      onClick={() => onOpen?.(client)}
      className={`grid w-full items-center text-left transition hover:bg-[var(--color-table-action-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)] ${
        isDense
          ? 'min-h-11 grid-cols-[34px_minmax(0,1fr)_auto] gap-2 px-3 py-1.5'
          : 'min-h-16 grid-cols-[44px_minmax(0,1fr)] gap-3 px-5 py-3'
      }`}
      aria-label={`Listar rotinas da empresa ${client.name}`}
    >
      <span
        className={`font-bold text-[var(--color-table-client-code)] ${
          isDense ? 'text-[10px]' : 'text-xs'
        }`}
      >
        {client.code}
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate font-bold text-[var(--color-text-strong)] ${
            isDense ? 'text-xs' : 'text-sm'
          }`}
        >
          {client.name}
        </span>
      </span>
      {isDense ? <DenseRowStats stats={stats} /> : null}
    </button>
  )
}

function DenseProgress({ stats }) {
  const progress = stats.total ? (stats.closed / stats.total) * 100 : 0

  return (
    <span
      className="mt-1 block"
      title={`${stats.closed} de ${stats.total} execucoes encerradas${
        stats.errors ? `; ${stats.errors} com erro` : ''
      }`}
    >
      <span className="flex items-center justify-center gap-1 text-[9px] font-semibold text-[var(--color-text-subtle)]">
        <span>
          {stats.closed}/{stats.total} encerr.
        </span>
        {stats.errors ? (
          <span className="text-[var(--status-error-text)]">
            · {stats.errors} erro{stats.errors > 1 ? 's' : ''}
          </span>
        ) : null}
      </span>
      <span className="mx-auto mt-0.5 block h-0.5 w-full overflow-hidden rounded-full bg-[var(--color-list-muted-bg)]">
        <span
          className="block h-full rounded-full bg-[var(--status-completed-dot)]"
          style={{ width: `${progress}%` }}
        />
      </span>
    </span>
  )
}

function DenseRowStats({ stats }) {
  return (
    <span
      className="text-right text-[9px] font-bold leading-tight text-[var(--color-text-subtle)]"
      title={`${stats.closed} de ${stats.total} execucoes encerradas${
        stats.errors ? `; ${stats.errors} com erro` : ''
      }`}
    >
      <span className="block">
        {stats.closed}/{stats.total}
      </span>
      {stats.errors ? (
        <span className="block text-[var(--status-error-text)]">
          {stats.errors} erro{stats.errors > 1 ? 's' : ''}
        </span>
      ) : (
        <span className="block font-medium">encerr.</span>
      )}
    </span>
  )
}

function buildStatsBy(tasks, key) {
  const statsByKey = new Map()

  tasks.forEach((task) => {
    const itemKey = task[key]
    if (!itemKey) return

    const stats = statsByKey.get(itemKey) ?? {
      total: 0,
      closed: 0,
      errors: 0,
    }

    stats.total += 1
    if (closedStatuses.has(task.status)) stats.closed += 1
    if (task.status === ROUTINE_STATUS.ERROR) stats.errors += 1
    statsByKey.set(itemKey, stats)
  })

  return statsByKey
}

const emptyStats = { total: 0, closed: 0, errors: 0 }

function RoutineControlTable({
  title,
  description,
  showHeader = true,
  clients,
  routines,
  tasks,
  variant = 'label',
  onClientOpen,
  onRoutineOpen,
  onTaskOpen,
}) {
  const clientIds = new Set(clients.map((client) => client.id))
  const routineIds = new Set(routines.map((routine) => routine.id))
  const tableTasks = tasks.filter(
    (task) => clientIds.has(task.clientId) && routineIds.has(task.routineId),
  )
  const taskByCell = new Map(
    tableTasks.map((task) => [`${task.clientId}:${task.routineId}`, task]),
  )
  const statsByRoutine = buildStatsBy(tableTasks, 'routineId')
  const statsByClient = buildStatsBy(tableTasks, 'clientId')
  const isDense = variant === 'dense'

  return (
    <section
      className="flex h-full min-h-[620px] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-table-border)] bg-[var(--color-table-bg)] shadow-[var(--shadow-panel)]"
      data-spreadsheet-variant={variant}
    >
      {showHeader && (
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-table-border)] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-main)]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {description}
              </p>
            )}
          </div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">
            {clients.length} clientes - {routines.length} rotinas
          </p>
        </header>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-max border-collapse text-left">
          <thead>
            <tr className="bg-[var(--color-table-header-bg)]">
              <th
                className={`sticky left-0 border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] text-xs font-semibold uppercase tracking-wide text-[var(--color-table-heading-text)] ${
                  isDense
                    ? 'top-0 z-30 min-w-52 px-3 py-2'
                    : 'z-20 min-w-64 px-5 py-3'
                }`}
              >
                Empresas
              </th>
              {routines.map((routine) => (
                <th
                  key={routine.id}
                  className={`border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] p-0 text-center text-xs font-semibold text-[var(--color-table-heading-text)] last:border-r-0 ${
                    variant === 'round'
                      ? 'w-20 min-w-20 max-w-20'
                      : isDense
                        ? 'sticky top-0 z-20 w-28 min-w-28 max-w-28'
                        : routine.departmentId === 'dept-fiscal'
                          ? 'w-28 min-w-28 max-w-28'
                          : 'w-36 min-w-36 max-w-36'
                  }`}
                  title={routine.name}
                >
                  <RoutineHeaderButton
                    routine={routine}
                    stats={statsByRoutine.get(routine.id) ?? emptyStats}
                    variant={variant}
                    onOpen={onRoutineOpen}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="group">
                <th className="sticky left-0 z-10 border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-sticky-bg)] p-0 group-hover:bg-[var(--color-table-row-hover-bg)]">
                  <ClientRowButton
                    client={client}
                    stats={statsByClient.get(client.id) ?? emptyStats}
                    variant={variant}
                    onOpen={onClientOpen}
                  />
                </th>

                {routines.map((routine) => {
                  const task = taskByCell.get(`${client.id}:${routine.id}`)
                  return (
                    <td
                      key={routine.id}
                      className={`border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-cell-bg)] text-center last:border-r-0 group-hover:bg-[var(--color-table-row-hover-bg)] ${
                        variant === 'round'
                          ? 'h-12 p-1.5'
                          : isDense
                            ? 'h-11 p-1'
                            : 'h-16 p-2'
                      }`}
                    >
                      {task ? (
                        <RoutineClosedCardCompact
                          task={task}
                          label={`${routine.name} de ${client.name}`}
                          variant={variant}
                          onOpen={onTaskOpen}
                        />
                      ) : (
                        <RoutineNotApplicableCard
                          departmentId={routine.departmentId}
                          variant={variant}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default RoutineControlTable
