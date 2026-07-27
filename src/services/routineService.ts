import { routineControlMock } from '../mocks/routineControl.mock'
import type { EntityId, Routine } from '../types/domain'

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

export async function listRoutines(
  filters: { departmentId?: EntityId } = {},
): Promise<Routine[]> {
  await wait(150)

  let routines = structuredClone(routineControlMock.data.routines)

  if (filters.departmentId) {
    routines = routines.filter(
      (routine) => routine.departmentId === filters.departmentId,
    )
  }

  return routines
}

export async function getRoutine(routineId: EntityId): Promise<Routine | null> {
  const routines = await listRoutines()

  return routines.find((routine) => routine.id === routineId) ?? null
}

export async function saveRoutine(
  routine: Omit<Routine, 'id'> & { id?: EntityId },
): Promise<Routine> {
  await wait(150)

  return {
    id: routine.id ?? `routine-${Date.now()}`,
    ...routine,
  }
}
