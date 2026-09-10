import { describe, expect, it } from 'vitest'

import { buildRoutineListViewData, ROUTINE_LIST_MODE } from './routineListItems'
import type { RoutineControlData, Task } from '../types/domain'

describe('routine list items', () => {
  it('shows only ad-hoc tasks created by the active member', () => {
    const data: RoutineControlData = {
      departments: [],
      clients: [],
      routines: [],
      employees: [],
      screens: [],
      spreadsheetProjections: [],
      tasks: [
        createTask('own-ad-hoc-task', 'ad_hoc', 'membership-1'),
        createTask('own-scheduled-task', 'scheduled', 'membership-1'),
        createTask('other-ad-hoc-task', 'ad_hoc', 'membership-2'),
        createTask('unassigned-ad-hoc-task', 'ad_hoc', null),
      ],
    }

    const result = buildRoutineListViewData({
      data,
      filter: {
        type: ROUTINE_LIST_MODE.MY_TASKS,
        assigneeId: 'membership-1',
      },
    })

    expect(result.items.map((item) => item.id)).toEqual(['own-ad-hoc-task'])
  })

  it('keeps ad-hoc tasks out of the global list', () => {
    const data: RoutineControlData = {
      departments: [],
      clients: [],
      routines: [],
      employees: [],
      screens: [],
      spreadsheetProjections: [],
      tasks: [
        createTask('scheduled-task', 'scheduled', 'membership-1'),
        createTask('personal-task', 'ad_hoc', 'membership-1'),
      ],
    }

    const result = buildRoutineListViewData({
      data,
      filter: { type: ROUTINE_LIST_MODE.GLOBAL },
    })

    expect(result.items.map((item) => item.id)).toEqual(['scheduled-task'])
  })

  it('uses a safe label when a task belongs to a company without a code', () => {
    const task = createTask('scheduled-task', 'scheduled', null)
    task.clientId = 'client-1'

    const result = buildRoutineListViewData({
      data: {
        departments: [],
        clients: [{ id: 'client-1', name: 'Empresa sem código' }],
        routines: [],
        employees: [],
        screens: [],
        spreadsheetProjections: [],
        tasks: [task],
      },
      filter: { type: ROUTINE_LIST_MODE.GLOBAL },
    })

    expect(result.items[0]?.companyCode).toBe('Não informado')
  })
})

function createTask(
  id: string,
  kind: Task['kind'],
  assigneeId: string | null,
): Task {
  return {
    id,
    taskId: id,
    competenceId: 'competence-1',
    kind,
    clientId: null,
    routineId: null,
    departmentId: 'department-1',
    assigneeId,
    status: 'pending',
    period: '2026-08',
    dueDate: '2026-08-10',
    completedAt: null,
    indicators: { attachments: 0 },
  }
}
