import { describe, expect, it } from 'vitest'

import { ROUTINE_LIST_MODE, buildRoutineListViewData } from './routineListItems'
import type { RoutineControlData } from '../types/domain'

const data = {
  clients: [{ id: 'client-1', code: '001', name: 'Alpha Ltda' }],
  routines: [
    {
      id: 'routine-1',
      name: 'Enviar DAS',
      shortName: 'Enviar DAS',
      departmentId: 'dept-fiscal',
    },
    {
      id: 'routine-unlinked',
      name: 'Rotina histórica desvinculada',
      shortName: 'Desvinculada',
      departmentId: 'dept-fiscal',
    },
  ],
  employees: [{ id: 'employee-1', name: 'Ana Souza' }],
  departments: [{ id: 'dept-fiscal', name: 'Fiscal' }],
  clientRoutineLinks: [
    {
      id: 'link-1',
      clientId: 'client-1',
      routineId: 'routine-1',
    },
  ],
  tasks: [
    {
      id: 'task-1',
      clientId: 'client-1',
      routineId: 'routine-1',
      departmentId: 'dept-fiscal',
      assigneeId: 'employee-1',
      period: '2026-06',
      status: 'pending',
      dueDate: '2026-06-20',
      completedAt: null,
      notes: 'Aguardando guia',
      indicators: { attachments: 0, comments: 0 },
    },
    {
      id: 'task-unlinked-history',
      clientId: 'client-1',
      routineId: 'routine-unlinked',
      departmentId: 'dept-fiscal',
      assigneeId: 'employee-1',
      period: '2026-05',
      status: 'completed',
      dueDate: '2026-05-20',
      completedAt: '2026-05-20T12:00:00-03:00',
      notes: 'Histórico preservado após desvinculação',
      indicators: { attachments: 0, comments: 0 },
    },
  ],
} satisfies RoutineControlData

describe('routine list items', () => {
  it('builds list data for a routine page', () => {
    const view = buildRoutineListViewData({
      data,
      filter: { type: ROUTINE_LIST_MODE.ROUTINE, id: 'routine-1' },
    })

    expect(view.title).toBe('Enviar DAS')
    expect(view.items[0]).toMatchObject({
      companyCode: '001',
      routineName: 'Enviar DAS',
      departmentName: 'Fiscal',
      assigneeName: 'Ana Souza',
    })
  })

  it('builds list data for a client page', () => {
    const view = buildRoutineListViewData({
      data,
      filter: { type: ROUTINE_LIST_MODE.CLIENT, id: 'client-1' },
    })

    expect(view.title).toBe('Alpha Ltda')
    expect(view.items[0].title).toBe('Enviar DAS')
  })

  it('shows company and routine for a global task list item', () => {
    const view = buildRoutineListViewData({
      data,
      filter: { type: ROUTINE_LIST_MODE.GLOBAL },
    })

    expect(view.items[0].primaryLabel).toBe('Alpha Ltda - Enviar DAS')
    expect(view.items).toHaveLength(1)
  })

  it('includes routine and loose tasks assigned to the user in my tasks', () => {
    const myTasksData: RoutineControlData = {
      ...data,
      tasks: [
        ...data.tasks,
        {
          id: 'loose-task-1',
          isLoose: true,
          title: 'Conferir certificado',
          clientId: null,
          routineId: null,
          departmentId: 'dept-fiscal',
          assigneeId: 'employee-1',
          period: '2026-06',
          status: 'in_progress',
          dueDate: '2026-06-21',
          completedAt: null,
          indicators: { attachments: 0, comments: 0 },
        },
        {
          id: 'loose-task-other-user',
          isLoose: true,
          title: 'Tarefa de outra pessoa',
          clientId: null,
          routineId: null,
          departmentId: 'dept-fiscal',
          assigneeId: 'employee-2',
          period: '2026-06',
          status: 'pending',
          dueDate: '2026-06-22',
          completedAt: null,
          indicators: { attachments: 0, comments: 0 },
        },
      ],
    }
    const view = buildRoutineListViewData({
      data: myTasksData,
      filter: {
        type: ROUTINE_LIST_MODE.MY_TASKS,
        assigneeId: 'employee-1',
      },
    })

    expect(view.title).toBe('Minhas tarefas')
    expect(view.items.map((item) => item.id)).toEqual([
      'task-1',
      'loose-task-1',
    ])
  })
})
