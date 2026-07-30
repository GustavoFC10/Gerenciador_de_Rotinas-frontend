/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRoutineControl } from './routineControlService'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

async function loadRoutineControl(
  options: Parameters<typeof getRoutineControl>[0],
) {
  const request = getRoutineControl(options)
  await vi.runAllTimersAsync()
  return request
}

describe('routine control service scopes', () => {
  it('returns only the selected fiscal division', async () => {
    const response = await loadRoutineControl({
      departmentId: 'dept-fiscal',
      divisionId: 'division-fiscal-simples-nacional',
    })

    expect(response.data.clients).toHaveLength(10)
    expect(response.data.routines).toHaveLength(8)
    expect(
      response.data.clients.every((client) =>
        client.divisionAssignments?.some(
          (assignment) =>
            assignment.divisionId === 'division-fiscal-simples-nacional',
        ),
      ),
    ).toBe(true)
    expect(
      response.data.tasks.every(
        (task) =>
          !task.isLoose &&
          task.divisionId === 'division-fiscal-simples-nacional',
      ),
    ).toBe(true)
  })

  it('keeps all three divisions in a department-wide response', async () => {
    const response = await loadRoutineControl({
      departmentId: 'dept-fiscal',
    })

    expect(response.data.divisions).toHaveLength(3)
    expect(response.data.clients).toHaveLength(25)
    expect(response.data.routines).toHaveLength(15)
  })

  it('returns an empty operational response for an unknown division', async () => {
    const response = await loadRoutineControl({
      divisionId: 'division-unknown',
    })

    expect(response.data.clients).toEqual([])
    expect(response.data.routines).toEqual([])
    expect(response.data.clientRoutineLinks).toEqual([])
    expect(response.data.tasks).toEqual([])
  })
})
