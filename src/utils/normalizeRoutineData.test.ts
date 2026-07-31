import { describe, expect, it } from 'vitest'

import type { RoutineControlData } from '../types/domain'
import { normalizeRoutineData } from './normalizeRoutineData'

describe('normalize routine data', () => {
  it('indexes department divisions when the collection is available', () => {
    const data: RoutineControlData = {
      departments: [{ id: 'dept-fiscal', name: 'Fiscal' }],
      divisions: [
        {
          id: 'division-fiscal-mei',
          departmentId: 'dept-fiscal',
          name: 'MEI',
          slug: 'mei',
          position: 1,
        },
      ],
      clients: [],
      routines: [],
      clientRoutineLinks: [],
      employees: [],
      tasks: [],
    }

    const normalized = normalizeRoutineData(data)

    expect(normalized.divisionsById.get('division-fiscal-mei')?.name).toBe(
      'MEI',
    )
  })

  it('creates an empty division index for legacy data', () => {
    const data: RoutineControlData = {
      departments: [],
      clients: [],
      routines: [],
      clientRoutineLinks: [],
      employees: [],
      tasks: [],
    }

    expect(normalizeRoutineData(data).divisionsById.size).toBe(0)
  })
})
