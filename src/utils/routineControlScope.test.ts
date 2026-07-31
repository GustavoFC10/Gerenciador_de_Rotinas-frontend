import { describe, expect, it } from 'vitest'

import type { RoutineControlData, Task } from '../types/domain'
import { scopeRoutineControlData } from './routineControlScope'

const taskBase = {
  departmentId: 'dept-fiscal',
  assigneeId: 'employee-1',
  status: 'pending',
  period: '2026-07',
  dueDate: '2026-07-20',
  completedAt: null,
  indicators: { attachments: 0 },
} satisfies Partial<Task>

const data: RoutineControlData = {
  departments: [
    { id: 'dept-fiscal', name: 'Fiscal' },
    { id: 'dept-contabil', name: 'Contábil' },
  ],
  divisions: [
    {
      id: 'division-fiscal-simples',
      departmentId: 'dept-fiscal',
      name: 'Simples Nacional',
      slug: 'simples-nacional',
      position: 1,
    },
    {
      id: 'division-fiscal-mei',
      departmentId: 'dept-fiscal',
      name: 'MEI',
      slug: 'mei',
      position: 2,
    },
    {
      id: 'division-contabil-geral',
      departmentId: 'dept-contabil',
      name: 'Geral',
      slug: 'geral',
      position: 1,
    },
  ],
  clients: [
    {
      id: 'client-simples-a',
      code: '0001',
      name: 'Alpha',
      divisionAssignments: [
        {
          id: 'assignment-a-fiscal',
          departmentId: 'dept-fiscal',
          divisionId: 'division-fiscal-simples',
        },
      ],
    },
    {
      id: 'client-simples-sem-rotina',
      code: '0002',
      name: 'Beta',
      divisionAssignments: [
        {
          id: 'assignment-b-fiscal',
          departmentId: 'dept-fiscal',
          divisionId: 'division-fiscal-simples',
        },
      ],
    },
    {
      id: 'client-mei',
      code: '0003',
      name: 'Gamma',
      divisionAssignments: [
        {
          id: 'assignment-c-fiscal',
          departmentId: 'dept-fiscal',
          divisionId: 'division-fiscal-mei',
        },
      ],
    },
  ],
  routines: [
    {
      id: 'routine-shared',
      departmentId: 'dept-fiscal',
      name: 'Importar notas',
      shortName: 'Importar',
    },
    {
      id: 'routine-simples',
      departmentId: 'dept-fiscal',
      name: 'Gerar DAS',
      shortName: 'DAS',
    },
    {
      id: 'routine-mei',
      departmentId: 'dept-fiscal',
      name: 'DASN-SIMEI',
      shortName: 'DASN',
    },
    {
      id: 'routine-accounting',
      departmentId: 'dept-contabil',
      name: 'Conciliação',
      shortName: 'Conciliação',
    },
  ],
  divisionRoutineLinks: [
    {
      id: 'division-routine-shared-simples',
      divisionId: 'division-fiscal-simples',
      routineId: 'routine-shared',
      position: 2,
    },
    {
      id: 'division-routine-simples',
      divisionId: 'division-fiscal-simples',
      routineId: 'routine-simples',
      position: 1,
    },
    {
      id: 'division-routine-shared-mei',
      divisionId: 'division-fiscal-mei',
      routineId: 'routine-shared',
      position: 1,
    },
    {
      id: 'division-routine-mei',
      divisionId: 'division-fiscal-mei',
      routineId: 'routine-mei',
      position: 2,
    },
    {
      id: 'division-routine-cross-department',
      divisionId: 'division-fiscal-simples',
      routineId: 'routine-accounting',
      position: 3,
    },
  ],
  clientRoutineLinks: [
    {
      id: 'client-routine-a-shared',
      clientId: 'client-simples-a',
      routineId: 'routine-shared',
    },
    {
      id: 'client-routine-a-simples',
      clientId: 'client-simples-a',
      routineId: 'routine-simples',
    },
    {
      id: 'client-routine-c-shared',
      clientId: 'client-mei',
      routineId: 'routine-shared',
    },
  ],
  employees: [{ id: 'employee-1', name: 'Ana' }],
  tasks: [
    {
      ...taskBase,
      id: 'task-valid',
      clientId: 'client-simples-a',
      routineId: 'routine-shared',
    },
    {
      ...taskBase,
      id: 'task-valid-specific',
      clientId: 'client-simples-a',
      routineId: 'routine-simples',
    },
    {
      ...taskBase,
      id: 'task-other-client',
      clientId: 'client-mei',
      routineId: 'routine-shared',
    },
    {
      ...taskBase,
      id: 'task-no-active-link',
      clientId: 'client-simples-sem-rotina',
      routineId: 'routine-shared',
    },
    {
      ...taskBase,
      id: 'task-wrong-division-snapshot',
      divisionId: 'division-fiscal-mei',
      clientId: 'client-simples-a',
      routineId: 'routine-shared',
    },
    {
      ...taskBase,
      id: 'loose-selected',
      isLoose: true,
      divisionId: 'division-fiscal-simples',
      clientId: null,
      routineId: null,
    },
    {
      ...taskBase,
      id: 'loose-without-division',
      isLoose: true,
      clientId: null,
      routineId: null,
    },
    {
      ...taskBase,
      id: 'loose-other-division',
      isLoose: true,
      divisionId: 'division-fiscal-mei',
      clientId: null,
      routineId: null,
    },
  ],
}

describe('routine control scope', () => {
  it('uses assignments for rows and division links for ordered columns', () => {
    const result = scopeRoutineControlData(data, {
      departmentId: 'dept-fiscal',
      divisionId: 'division-fiscal-simples',
    })

    expect(result.clients.map((client) => client.id)).toEqual([
      'client-simples-a',
      'client-simples-sem-rotina',
    ])
    expect(result.routines.map((routine) => routine.id)).toEqual([
      'routine-simples',
      'routine-shared',
    ])
    expect(result.clientRoutineLinks.map((link) => link.id)).toEqual([
      'client-routine-a-shared',
      'client-routine-a-simples',
    ])
    expect(result.divisionRoutineLinks?.map((link) => link.id)).not.toContain(
      'division-routine-cross-department',
    )
  })

  it('keeps only tasks backed by the selected intersection and scoped loose tasks', () => {
    const result = scopeRoutineControlData(data, {
      departmentId: 'dept-fiscal',
      divisionId: 'division-fiscal-simples',
    })

    expect(result.tasks.map((task) => task.id)).toEqual([
      'task-valid',
      'task-valid-specific',
      'loose-selected',
    ])
    expect(result.employees).toEqual(data.employees)
    expect(result.departments).toEqual(data.departments)
    expect(result.divisions).toEqual(data.divisions)
  })

  it('returns an empty operational scope for an invalid department-division pair', () => {
    const result = scopeRoutineControlData(data, {
      departmentId: 'dept-contabil',
      divisionId: 'division-fiscal-simples',
    })

    expect(result.departments).toEqual(data.departments)
    expect(result.divisions).toEqual(data.divisions)
    expect(result.clients).toEqual([])
    expect(result.routines).toEqual([])
    expect(result.clientRoutineLinks).toEqual([])
    expect(result.tasks).toEqual([])
  })
})
