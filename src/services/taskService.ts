import { routineControlMock } from '../mocks/routineControl.mock'
import type { EntityId, RoutineStatus, Task } from '../types/domain'

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

function cloneMockData() {
  return structuredClone(routineControlMock.data)
}

export async function listTasks(
  filters: {
    clientId?: EntityId
    routineId?: EntityId
    assigneeId?: EntityId
    status?: RoutineStatus
  } = {},
): Promise<Task[]> {
  await wait(150)

  let tasks = cloneMockData().tasks

  if (filters.clientId) {
    tasks = tasks.filter((task) => task.clientId === filters.clientId)
  }

  if (filters.routineId) {
    tasks = tasks.filter((task) => task.routineId === filters.routineId)
  }

  if (filters.assigneeId) {
    tasks = tasks.filter((task) => task.assigneeId === filters.assigneeId)
  }

  if (filters.status) {
    tasks = tasks.filter((task) => task.status === filters.status)
  }

  return tasks
}

export async function updateTask(
  taskId: EntityId,
  changes: Partial<Task>,
): Promise<Partial<Task> & Pick<Task, 'id'>> {
  await wait(150)

  return {
    id: taskId,
    ...changes,
  }
}

export async function createLooseTask(
  payload: Partial<Task>,
): Promise<Partial<Task> & Pick<Task, 'id' | 'routineId' | 'clientId'>> {
  await wait(150)

  return {
    id: `loose-task-${Date.now()}`,
    routineId: null,
    clientId: null,
    ...payload,
  }
}
