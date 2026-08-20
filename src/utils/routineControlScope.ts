import type { EntityId, RoutineControlData } from '../types/domain'

export function selectScreenData(
  data: RoutineControlData,
  screenId: EntityId,
): RoutineControlData | null {
  const screen = data.screens.find(
    (item) =>
      item.id === screenId && item.type === 'spreadsheet' && !item.archivedAt,
  )
  const projection = data.spreadsheetProjections.find(
    (item) => item.screen.id === screenId,
  )

  if (!screen || !projection) return null

  const clientIds = new Set(screen.companies.map((company) => company.id))
  const routineIds = new Set(screen.routines.map((routine) => routine.id))
  const taskIds = new Set(
    projection.cells.flatMap((cell) =>
      cell.tasks.map((task) => task.occurrenceKey),
    ),
  )

  return {
    ...data,
    clients: data.clients.filter((client) => clientIds.has(client.id)),
    routines: data.routines.filter((routine) => routineIds.has(routine.id)),
    tasks: data.tasks.filter((task) => taskIds.has(task.id)),
    screens: [screen],
    spreadsheetProjections: [projection],
  }
}
