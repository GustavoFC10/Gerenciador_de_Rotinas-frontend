import RoutineClosedCardCompact from './RoutineClosedCardCompact.jsx'
import RoutineNotApplicableCard from './RoutineNotApplicableCard.jsx'

function RoutineHeaderButton({ routine, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(routine)}
      className="block min-h-14 w-full px-3 py-3 text-center text-xs font-bold leading-tight text-[var(--color-table-action-text)] transition hover:bg-[var(--color-table-action-hover-bg)] hover:text-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)]"
      aria-label={`Listar empresas da rotina ${routine.name}`}
    >
      <span className="line-clamp-2">{routine.shortName}</span>
    </button>
  )
}

function ClientRowButton({ client, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(client)}
      className="grid min-h-16 w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 px-5 py-3 text-left transition hover:bg-[var(--color-table-action-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)]"
      aria-label={`Listar rotinas da empresa ${client.name}`}
    >
      <span className="text-xs font-bold text-[var(--color-table-client-code)]">
        {client.code}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
          {client.name}
        </span>
      </span>
    </button>
  )
}

function RoutineControlTable({
  title,
  description,
  showHeader = true,
  clients,
  routines,
  tasks,
  onClientOpen,
  onRoutineOpen,
  onTaskOpen,
}) {
  const taskByCell = new Map(
    tasks.map((task) => [`${task.clientId}:${task.routineId}`, task]),
  )

  return (
    <section className="flex h-full min-h-[620px] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-table-border)] bg-[var(--color-table-bg)] shadow-[var(--shadow-panel)]">
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
              <th className="sticky left-0 z-20 min-w-64 border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-header-bg)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-table-heading-text)]">
                Empresas
              </th>
              {routines.map((routine) => (
                <th
                  key={routine.id}
                  className={`border-b border-r border-[var(--color-table-border)] p-0 text-center text-xs font-semibold text-[var(--color-table-heading-text)] last:border-r-0 ${
                    routine.departmentId === 'dept-fiscal'
                      ? 'w-28 min-w-28 max-w-28'
                      : 'w-36 min-w-36 max-w-36'
                  }`}
                  title={routine.name}
                >
                  <RoutineHeaderButton
                    routine={routine}
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
                  <ClientRowButton client={client} onOpen={onClientOpen} />
                </th>

                {routines.map((routine) => {
                  const task = taskByCell.get(`${client.id}:${routine.id}`)
                  return (
                    <td
                      key={routine.id}
                      className="h-16 border-b border-r border-[var(--color-table-border)] bg-[var(--color-table-cell-bg)] p-2 text-center last:border-r-0 group-hover:bg-[var(--color-table-row-hover-bg)]"
                    >
                      {task ? (
                        <RoutineClosedCardCompact
                          task={task}
                          label={`${routine.name} de ${client.name}`}
                          onOpen={onTaskOpen}
                        />
                      ) : (
                        <RoutineNotApplicableCard
                          departmentId={routine.departmentId}
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
