import { routineControlMock } from '../mocks/routineControl.mock'
import type { EntityId, RoutineControlResponse } from '../types/domain'

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

export async function getRoutineControl({
  departmentId = null,
}: { departmentId?: EntityId | null } = {}): Promise<RoutineControlResponse> {
  await wait(250)

  const response = structuredClone(routineControlMock)

  if (!departmentId) {
    return response
  }

  response.data.routines = response.data.routines.filter(
    (routine) => routine.departmentId === departmentId,
  )
  response.data.tasks = response.data.tasks.filter(
    (task) => task.departmentId === departmentId,
  )

  const clientIds = new Set(response.data.tasks.map((task) => task.clientId))
  response.data.clients = response.data.clients.filter((client) =>
    clientIds.has(client.id),
  )

  return response
}
