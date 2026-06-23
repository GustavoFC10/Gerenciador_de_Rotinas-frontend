import RoutineClosedCard from './RoutineClosedCard.jsx'
import RoutineClosedCardCell from './RoutineClosedCardCell.jsx'
import RoutineClosedCardCompact from './RoutineClosedCardCompact.jsx'
import RoutineNotApplicableCard from './RoutineNotApplicableCard.jsx'

const closedCardByDepartment = {
  'dept-fiscal': RoutineClosedCard,
  'dept-accounting': RoutineClosedCardCompact,
  'dept-personnel': RoutineClosedCardCell,
}

function RoutineControlTable({
  title,
  description,
  clients,
  routines,
  tasks,
  onTaskOpen,
}) {
  const taskByCell = new Map(
    tasks.map((task) => [`${task.clientId}:${task.routineId}`, task]),
  )

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        <p className="text-xs font-medium text-slate-400">
          {clients.length} clientes · {routines.length} rotinas
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-20 min-w-64 border-b border-r border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cliente
              </th>
              {routines.map((routine) => (
                <th
                  key={routine.id}
                  className={`border-b border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-600 last:border-r-0 ${
                    routine.departmentId === 'dept-fiscal'
                      ? 'w-28 max-w-28'
                      : 'w-36 min-w-36 max-w-36'
                  }`}
                  title={routine.name}
                >
                  <span className="line-clamp-2">{routine.shortName}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="group">
                <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-5 py-3 group-hover:bg-slate-50">
                  <span className="block text-xs font-medium text-slate-400">
                    {client.code}
                  </span>
                  <span className="mt-0.5 block max-w-52 truncate text-sm font-semibold text-slate-800">
                    {client.name}
                  </span>
                </th>

                {routines.map((routine) => {
                  const task = taskByCell.get(`${client.id}:${routine.id}`)
                  const ClosedCard =
                    closedCardByDepartment[task?.departmentId] ??
                    RoutineClosedCard

                  return (
                    <td
                      key={routine.id}
                      className="h-16 border-b border-r border-slate-200 bg-slate-50/30 p-2 text-center last:border-r-0 group-hover:bg-slate-50"
                    >
                      {task ? (
                        <ClosedCard
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
