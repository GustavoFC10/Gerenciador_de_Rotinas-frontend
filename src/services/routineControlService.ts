import { routineControlMock } from '../mocks/routineControl.mock'
import type { EntityId, RoutineControlResponse } from '../types/domain'
import { scopeRoutineControlData } from '../utils/routineControlScope'

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

export async function getRoutineControl({
  departmentId = null,
  divisionId = null,
}: {
  departmentId?: EntityId | null
  divisionId?: EntityId | null
} = {}): Promise<RoutineControlResponse> {
  await wait(250)

  const response = structuredClone(routineControlMock)

  if (!departmentId && !divisionId) {
    return response
  }

  const resolvedDepartmentId =
    departmentId ??
    response.data.divisions?.find((division) => division.id === divisionId)
      ?.departmentId ??
    null

  if (!resolvedDepartmentId) {
    response.data = {
      ...response.data,
      clients: [],
      routines: [],
      divisionRoutineLinks: [],
      clientRoutineLinks: [],
      tasks: [],
    }
    return response
  }

  if (divisionId) {
    response.data = scopeRoutineControlData(response.data, {
      departmentId: resolvedDepartmentId,
      divisionId,
    })
    return response
  }

  const divisionIds = new Set(
    (response.data.divisions ?? [])
      .filter((division) => division.departmentId === resolvedDepartmentId)
      .map((division) => division.id),
  )
  response.data.divisions = (response.data.divisions ?? []).filter((division) =>
    divisionIds.has(division.id),
  )
  response.data.divisionRoutineLinks = (
    response.data.divisionRoutineLinks ?? []
  ).filter((link) => divisionIds.has(link.divisionId))
  response.data.routines = response.data.routines.filter(
    (routine) => routine.departmentId === resolvedDepartmentId,
  )
  const routineIds = new Set(
    response.data.routines.map((routine) => routine.id),
  )
  response.data.clientRoutineLinks = response.data.clientRoutineLinks.filter(
    (link) => routineIds.has(link.routineId),
  )
  response.data.tasks = response.data.tasks.filter(
    (task) => task.departmentId === resolvedDepartmentId,
  )

  response.data.clients = response.data.clients.filter((client) =>
    client.divisionAssignments?.some(
      (assignment) => assignment.departmentId === resolvedDepartmentId,
    ),
  )
  const clientIds = new Set(response.data.clients.map((client) => client.id))
  response.data.clientRoutineLinks = response.data.clientRoutineLinks.filter(
    (link) => clientIds.has(link.clientId),
  )

  return response
}
