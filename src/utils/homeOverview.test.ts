import { describe, expect, it } from 'vitest'

import { USER_ROLE } from '../constants/roles'
import type {
  AppUser,
  RoutineControlData,
  Task,
  UserRole,
} from '../types/domain'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import { buildHomeOverview } from './homeOverview'

const spreadsheets: SpreadsheetNavigationItem[] = [
  {
    id: 'fiscal',
    departmentId: 'dept-fiscal',
    name: 'Fiscal',
    to: '/planilha?sheetId=fiscal',
  },
  {
    id: 'contabil',
    departmentId: 'dept-contabil',
    name: 'Contábil',
    to: '/planilha?sheetId=contabil',
  },
]

const baseTask = {
  clientId: 'client-1',
  routineId: 'routine-fiscal',
  departmentId: 'dept-fiscal',
  assigneeId: 'employee-1',
  period: '2026-06',
  completedAt: null,
  indicators: { attachments: 0, comments: 0 },
} satisfies Partial<Task>

const data: RoutineControlData = {
  departments: [
    { id: 'dept-fiscal', name: 'Fiscal' },
    { id: 'dept-contabil', name: 'Contábil' },
  ],
  clients: [
    { id: 'client-1', code: '001', name: 'Alpha Ltda.' },
    { id: 'client-2', code: '002', name: 'Beta Ltda.' },
  ],
  routines: [
    {
      id: 'routine-fiscal',
      departmentId: 'dept-fiscal',
      name: 'Enviar DAS',
      shortName: 'Enviar DAS',
    },
    {
      id: 'routine-unlinked',
      departmentId: 'dept-fiscal',
      name: 'Rotina desvinculada',
      shortName: 'Desvinculada',
    },
    {
      id: 'routine-contabil',
      departmentId: 'dept-contabil',
      name: 'Conciliação',
      shortName: 'Conciliação',
    },
  ],
  clientRoutineLinks: [
    {
      id: 'link-fiscal',
      clientId: 'client-1',
      routineId: 'routine-fiscal',
    },
    {
      id: 'link-contabil',
      clientId: 'client-2',
      routineId: 'routine-contabil',
    },
  ],
  employees: [
    { id: 'employee-1', name: 'Ana Souza' },
    { id: 'employee-2', name: 'Bruno Lima' },
  ],
  tasks: [
    {
      ...baseTask,
      id: 'task-error',
      status: 'error',
      dueDate: '2026-06-22',
    },
    {
      ...baseTask,
      id: 'task-overdue',
      status: 'pending',
      dueDate: '2026-06-19',
    },
    {
      ...baseTask,
      id: 'task-today',
      status: 'in_progress',
      dueDate: '2026-06-20',
    },
    {
      ...baseTask,
      id: 'task-completed',
      status: 'completed',
      dueDate: '2026-06-18',
      completedAt: '2026-06-18T12:00:00-03:00',
    },
    {
      ...baseTask,
      id: 'task-no-movement',
      status: 'no_movement',
      dueDate: '2026-06-18',
      completedAt: '2026-06-18T12:00:00-03:00',
    },
    {
      ...baseTask,
      id: 'task-unlinked-history',
      routineId: 'routine-unlinked',
      status: 'error',
      dueDate: '2026-06-10',
    },
    {
      ...baseTask,
      id: 'task-unassigned',
      assigneeId: null,
      status: 'error',
      dueDate: '2026-06-18',
    },
    {
      ...baseTask,
      id: 'task-other-period',
      period: '2026-05',
      status: 'error',
      dueDate: '2026-05-18',
    },
    {
      ...baseTask,
      id: 'task-accounting',
      clientId: 'client-2',
      routineId: 'routine-contabil',
      departmentId: 'dept-contabil',
      status: 'pending',
      dueDate: '2026-06-21',
    },
    {
      ...baseTask,
      id: 'loose-task',
      isLoose: true,
      title: 'Conferir certificado',
      clientId: null,
      routineId: null,
      status: 'pending',
      dueDate: '2026-06-28',
    },
  ],
}

function buildUser(role: UserRole): AppUser {
  return {
    id: `user-${role}`,
    employeeId: 'employee-1',
    name: 'Ana Souza',
    email: 'ana@example.com',
    role,
    departmentIds: ['dept-fiscal'],
    avatarUrl: '',
  }
}

describe('home overview', () => {
  it('builds a personal, competence-aware overview from active links', () => {
    const overview = buildHomeOverview({
      data,
      user: buildUser(USER_ROLE.EMPLOYEE),
      competence: '2026-06',
      referenceDate: '2026-06-20',
      spreadsheets,
    })

    expect(overview.personal).toMatchObject({
      total: 6,
      open: 4,
      finalized: 2,
      pending: 2,
      inProgress: 1,
      errors: 1,
      overdue: 1,
      dueToday: 1,
      attention: 3,
      completionPercentage: 33,
    })
    expect(
      overview.personal.priorities.map((priority) => priority.task.id),
    ).toEqual(['task-overdue', 'task-error', 'task-today', 'loose-task'])
    expect(overview.personal.priorities[0]?.kind).toBe('overdue')
    expect(overview.spreadsheets).toHaveLength(1)
    expect(overview.spreadsheets[0]).toMatchObject({
      clients: 1,
      routines: 2,
      personalTotal: 5,
      personalFinalized: 2,
      personalAttention: 3,
      personalCompletionPercentage: 40,
    })
    expect(overview.role).toBeNull()
  })

  it('adds scoped operational exceptions for leaders and global data for managers', () => {
    const leaderOverview = buildHomeOverview({
      data,
      user: buildUser(USER_ROLE.LEADER),
      competence: '2026-06',
      referenceDate: '2026-06-20',
      spreadsheets,
    })
    const managerOverview = buildHomeOverview({
      data,
      user: buildUser(USER_ROLE.MANAGER),
      competence: '2026-06',
      referenceDate: '2026-06-20',
      spreadsheets,
    })

    expect(leaderOverview.role).toMatchObject({
      total: 6,
      open: 4,
      finalized: 2,
      errors: 2,
      overdue: 2,
      unassigned: 1,
      completionPercentage: 33,
    })
    expect(leaderOverview.spreadsheets).toHaveLength(1)
    expect(managerOverview.spreadsheets).toHaveLength(2)
    expect(managerOverview.role).toMatchObject({
      total: 7,
      open: 5,
      finalized: 2,
    })
  })
})
