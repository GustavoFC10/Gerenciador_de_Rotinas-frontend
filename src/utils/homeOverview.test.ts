import { describe, expect, it } from 'vitest'

import { adminUserMock, memberUserMock } from '../constants/roles'
import type { RoutineControlData, RoutineStatus, Task } from '../types/domain'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import { buildHomeOverview } from './homeOverview'

const spreadsheets: SpreadsheetNavigationItem[] = [
  {
    id: 'dept-fiscal',
    departmentId: 'dept-fiscal',
    name: 'Fiscal',
    to: '/planilha?screenId=screen-fiscal',
    screens: [
      {
        id: 'screen-fiscal',
        departmentId: 'dept-fiscal',
        name: 'Planilha fiscal',
        to: '/planilha?screenId=screen-fiscal',
      },
    ],
  },
  {
    id: 'dept-contabil',
    departmentId: 'dept-contabil',
    name: 'Contábil',
    to: '/planilha?screenId=screen-contabil',
    screens: [
      {
        id: 'screen-contabil',
        departmentId: 'dept-contabil',
        name: 'Planilha contábil',
        to: '/planilha?screenId=screen-contabil',
      },
    ],
  },
]

describe('buildHomeOverview', () => {
  it('uses all accessible department work, regardless of individual assignment', () => {
    const overview = buildHomeOverview({
      data: buildData(),
      user: memberUserMock,
      competence: '2026-06',
      referenceDate: '2026-06-15',
      spreadsheets,
    })

    expect(overview.collective).toMatchObject({
      total: 3,
      open: 2,
      finalized: 1,
      errors: 1,
      overdue: 1,
      inProgress: 1,
      attention: 1,
      completionPercentage: 33,
    })
    expect(
      overview.collective.priorities.map((priority) => priority.task.id),
    ).toEqual(['task-fiscal-error', 'task-fiscal-in-progress'])
    expect(overview.spreadsheets).toEqual([
      expect.objectContaining({
        spreadsheet: expect.objectContaining({ id: 'dept-fiscal' }),
        total: 3,
        open: 2,
        finalized: 1,
        attention: 1,
        completionPercentage: 33,
      }),
    ])
  })

  it('includes every department for organization administrators', () => {
    const overview = buildHomeOverview({
      data: buildData(),
      user: adminUserMock,
      competence: '2026-06',
      referenceDate: '2026-06-15',
      spreadsheets,
    })

    expect(overview.collective.total).toBe(4)
    expect(
      overview.spreadsheets.map((summary) => summary.spreadsheet.id),
    ).toEqual(['dept-fiscal', 'dept-contabil'])
  })
})

function buildData(): RoutineControlData {
  return {
    departments: [
      { id: 'dept-fiscal', name: 'Fiscal' },
      { id: 'dept-contabil', name: 'Contábil' },
    ],
    clients: [
      { id: 'client-fiscal', code: '001', name: 'Alpha Ltda' },
      { id: 'client-contabil', code: '002', name: 'Beta Ltda' },
    ],
    routines: [
      {
        id: 'routine-fiscal',
        departmentId: 'dept-fiscal',
        name: 'Apuração fiscal',
        shortName: 'Fiscal',
      },
      {
        id: 'routine-contabil',
        departmentId: 'dept-contabil',
        name: 'Fechamento contábil',
        shortName: 'Contábil',
      },
    ],
    employees: [
      { id: 'employee-other', name: 'Outra pessoa' },
      { id: 'employee-accounting', name: 'Pessoa contábil' },
    ],
    screens: [
      {
        id: 'screen-fiscal',
        name: 'Planilha fiscal',
        type: 'spreadsheet',
        departmentId: 'dept-fiscal',
        departmentName: 'Fiscal',
        position: 1,
        version: 1,
        archivedAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        companies: [
          {
            id: 'client-fiscal',
            code: '001',
            name: 'Alpha Ltda',
            legalName: 'Alpha Ltda',
            position: 1,
          },
        ],
        routines: [
          {
            id: 'routine-fiscal',
            shotname: 'Fiscal',
            name: 'Apuração fiscal',
            departmentId: 'dept-fiscal',
            position: 1,
          },
        ],
      },
      {
        id: 'screen-contabil',
        name: 'Planilha contábil',
        type: 'spreadsheet',
        departmentId: 'dept-contabil',
        departmentName: 'Contábil',
        position: 2,
        version: 1,
        archivedAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        companies: [
          {
            id: 'client-contabil',
            code: '002',
            name: 'Beta Ltda',
            legalName: 'Beta Ltda',
            position: 1,
          },
        ],
        routines: [
          {
            id: 'routine-contabil',
            shotname: 'Contábil',
            name: 'Fechamento contábil',
            departmentId: 'dept-contabil',
            position: 1,
          },
        ],
      },
    ],
    spreadsheetProjections: [],
    tasks: [
      buildTask({
        id: 'task-fiscal-error',
        departmentId: 'dept-fiscal',
        clientId: 'client-fiscal',
        routineId: 'routine-fiscal',
        assigneeId: null,
        status: 'error',
        dueDate: '2026-06-10',
      }),
      buildTask({
        id: 'task-fiscal-in-progress',
        departmentId: 'dept-fiscal',
        clientId: 'client-fiscal',
        routineId: 'routine-fiscal',
        assigneeId: 'employee-other',
        status: 'in_progress',
        dueDate: '2026-06-17',
      }),
      buildTask({
        id: 'task-fiscal-completed',
        departmentId: 'dept-fiscal',
        clientId: 'client-fiscal',
        routineId: 'routine-fiscal',
        assigneeId: 'employee-other',
        status: 'completed',
        dueDate: '2026-06-08',
      }),
      buildTask({
        id: 'task-contabil-pending',
        departmentId: 'dept-contabil',
        clientId: 'client-contabil',
        routineId: 'routine-contabil',
        assigneeId: 'employee-accounting',
        status: 'pending',
        dueDate: '2026-06-10',
      }),
    ],
  }
}

function buildTask({
  id,
  departmentId,
  clientId,
  routineId,
  assigneeId,
  status,
  dueDate,
}: {
  id: string
  departmentId: string
  clientId: string
  routineId: string
  assigneeId: string | null
  status: RoutineStatus
  dueDate: string
}): Task {
  return {
    id,
    kind: 'scheduled',
    clientId,
    routineId,
    departmentId,
    assigneeId,
    status,
    period: '2026-06',
    dueDate,
    completedAt: status === 'completed' ? '2026-06-08T12:00:00Z' : null,
    indicators: { attachments: 0 },
  }
}
