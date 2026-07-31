import type {
  DivisionRoutineLink,
  EntityId,
  Routine,
  RoutineControlData,
  Task,
} from '../types/domain'

export interface RoutineControlScope {
  departmentId: EntityId
  divisionId: EntityId
}

export function scopeRoutineControlData(
  data: RoutineControlData,
  scope: RoutineControlScope,
): RoutineControlData {
  const division = (data.divisions ?? []).find(
    (item) =>
      item.id === scope.divisionId &&
      item.departmentId === scope.departmentId &&
      item.active !== false,
  )

  if (!division) {
    return buildEmptyScope(data)
  }

  const clients = data.clients.filter((client) =>
    client.divisionAssignments?.some(
      (assignment) =>
        assignment.departmentId === scope.departmentId &&
        assignment.divisionId === scope.divisionId,
    ),
  )
  const clientIds = new Set(clients.map((client) => client.id))
  const scopedDivisionRoutineLinks = (data.divisionRoutineLinks ?? [])
    .filter((link) => link.divisionId === scope.divisionId)
    .sort(compareDivisionRoutineLinks)
  const routinesById = new Map(
    data.routines
      .filter((routine) => routine.departmentId === scope.departmentId)
      .map((routine) => [routine.id, routine]),
  )
  const routines = selectRoutines(scopedDivisionRoutineLinks, routinesById)
  const routineIds = new Set(routines.map((routine) => routine.id))
  const divisionRoutineLinks = scopedDivisionRoutineLinks.filter((link) =>
    routineIds.has(link.routineId),
  )
  const clientRoutineLinks = data.clientRoutineLinks.filter(
    (link) => clientIds.has(link.clientId) && routineIds.has(link.routineId),
  )
  const linkedCells = new Set(
    clientRoutineLinks.map((link) => `${link.clientId}:${link.routineId}`),
  )
  const tasks = data.tasks.filter((task) =>
    isTaskInScope(task, scope, clientIds, routineIds, linkedCells),
  )

  return {
    ...data,
    clients,
    routines,
    divisionRoutineLinks,
    clientRoutineLinks,
    tasks,
  }
}

function selectRoutines(
  links: DivisionRoutineLink[],
  routinesById: Map<EntityId, Routine>,
): Routine[] {
  const selectedRoutineIds = new Set<EntityId>()

  return links.flatMap((link) => {
    if (selectedRoutineIds.has(link.routineId)) return []

    const routine = routinesById.get(link.routineId)
    if (!routine) return []

    selectedRoutineIds.add(link.routineId)
    return [routine]
  })
}

function isTaskInScope(
  task: Task,
  scope: RoutineControlScope,
  clientIds: Set<EntityId>,
  routineIds: Set<EntityId>,
  linkedCells: Set<string>,
): boolean {
  if (task.departmentId !== scope.departmentId) return false

  if (task.isLoose) {
    return task.divisionId === scope.divisionId
  }

  if (task.divisionId && task.divisionId !== scope.divisionId) return false
  if (!task.clientId || !task.routineId) return false
  if (!clientIds.has(task.clientId) || !routineIds.has(task.routineId)) {
    return false
  }

  return linkedCells.has(`${task.clientId}:${task.routineId}`)
}

function compareDivisionRoutineLinks(
  left: DivisionRoutineLink,
  right: DivisionRoutineLink,
): number {
  return (
    left.position - right.position ||
    left.routineId.localeCompare(right.routineId)
  )
}

function buildEmptyScope(data: RoutineControlData): RoutineControlData {
  return {
    ...data,
    clients: [],
    routines: [],
    divisionRoutineLinks: [],
    clientRoutineLinks: [],
    tasks: [],
  }
}
