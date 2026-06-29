import { routineControlMock } from '../mocks/routineControl.mock.js'

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function cloneMockData() {
  return structuredClone(routineControlMock.data)
}

export async function listTasks(filters = {}) {
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

export async function updateTask(taskId, changes) {
  await wait(150)

  return {
    id: taskId,
    ...changes,
  }
}

export async function createLooseTask(payload) {
  await wait(150)

  return {
    id: `loose-task-${Date.now()}`,
    routineId: null,
    clientId: null,
    ...payload,
  }
}
