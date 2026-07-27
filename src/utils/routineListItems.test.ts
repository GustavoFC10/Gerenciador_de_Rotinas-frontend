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
  ],
  employees: [{ id: 'employee-1', name: 'Ana Souza' }],
  departments: [{ id: 'dept-fiscal', name: 'Fiscal' }],
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
  })
})
