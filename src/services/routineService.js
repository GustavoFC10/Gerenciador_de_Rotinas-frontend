import { routineControlMock } from '../mocks/routineControl.mock.js'

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export async function listRoutines(filters = {}) {
  await wait(150)

  let routines = structuredClone(routineControlMock.data.routines)

  if (filters.departmentId) {
    routines = routines.filter(
      (routine) => routine.departmentId === filters.departmentId,
    )
  }

  return routines
}

export async function getRoutine(routineId) {
  const routines = await listRoutines()

  return routines.find((routine) => routine.id === routineId) ?? null
}

export async function saveRoutine(routine) {
  await wait(150)

  return {
    id: routine.id ?? `routine-${Date.now()}`,
    ...routine,
  }
}
