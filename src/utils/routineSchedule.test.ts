import { describe, expect, it } from 'vitest'

import type { Routine } from '../types/domain'
import {
  formatRoutineSchedule,
  getCycleOptions,
  getRoutineScheduleError,
  isRoutineScheduledForPeriod,
  normalizeRoutineSchedule,
} from './routineSchedule'

describe('routineSchedule', () => {
  it('uses days after creation only for on-demand routines', () => {
    expect(
      getRoutineScheduleError('on_demand', { defaultDueDays: 5 }),
    ).toBeNull()
    expect(
      normalizeRoutineSchedule('on_demand', {
        defaultDueDays: 5,
        defaultDueDay: 20,
        recurrenceMonths: [1],
      }),
    ).toEqual({
      defaultDueDays: 5,
      defaultDueDay: undefined,
      recurrenceMonths: undefined,
    })
    expect(
      formatRoutineSchedule({
        recurrence: 'on_demand',
        defaultDueDays: 5,
      }),
    ).toBe('5 dias após criar a tarefa')
  })

  it('offers only evenly spaced quarterly and semiannual cycles', () => {
    expect(getCycleOptions('quarterly').map((option) => option.months)).toEqual(
      [
        [1, 4, 7, 10],
        [2, 5, 8, 11],
        [3, 6, 9, 12],
      ],
    )
    expect(
      getCycleOptions('semiannual').map((option) => option.months),
    ).toEqual([
      [1, 7],
      [2, 8],
      [3, 9],
      [4, 10],
      [5, 11],
      [6, 12],
    ])
    expect(
      getRoutineScheduleError('quarterly', {
        defaultDueDay: 10,
        recurrenceMonths: [1, 2, 3, 4],
      }),
    ).toBe('Selecione um ciclo trimestral.')
  })

  it('uses the selected months to decide whether a routine belongs to a period', () => {
    const routine: Routine = {
      id: 'routine-quarterly',
      departmentId: 'dept-fiscal',
      name: 'Trimestral',
      shortName: 'Trimestral',
      recurrence: 'quarterly',
      recurrenceMonths: [1, 4, 7, 10],
      defaultDueDay: 15,
    }

    expect(isRoutineScheduledForPeriod(routine, '2026-04')).toBe(true)
    expect(isRoutineScheduledForPeriod(routine, '2026-05')).toBe(false)
    expect(formatRoutineSchedule(routine)).toBe('Jan, Abr, Jul, Out · dia 15')
  })
})
