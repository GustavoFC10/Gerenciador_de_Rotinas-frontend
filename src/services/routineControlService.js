import { routineControlMock } from '../mocks/routineControl.mock.js'

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export async function getRoutineControl({ departmentId = null } = {}) {
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
