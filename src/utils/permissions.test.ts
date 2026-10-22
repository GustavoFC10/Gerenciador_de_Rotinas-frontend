import { describe, expect, it } from 'vitest'

import { adminUserMock, leadUserMock, memberUserMock } from '../constants/roles'
import {
  APP_PERMISSION,
  canAccessDepartment,
  canAssignTask,
  canCreateCompany,
  canCreateEmployee,
  canCreateRoutine,
  getAllowedTaskTransitionStatuses,
  getDepartmentAccessRole,
  hasAppPermission,
  isLead,
  isOrganizationAdmin,
} from './permissions'
import type { Task } from '../types/domain'

describe('module and organization permissions', () => {
  it('reserves Equipe administration for organization owners', () => {
    expect(canCreateEmployee({ ...adminUserMock, role: 'owner' })).toBe(true)
    expect(
      hasAppPermission(
        { ...adminUserMock, role: 'owner' },
        APP_PERMISSION.VIEW_EMPLOYEES,
      ),
    ).toBe(true)
    expect(hasAppPermission(adminUserMock, APP_PERMISSION.VIEW_EMPLOYEES)).toBe(
      false,
    )
  })

  it('separates module administration from organization administration', () => {
    const moduleAdmin = {
      ...memberUserMock,
      modules: [
        {
          module: 'routines' as const,
          globalAccess: true,
          actions: [],
          sectors: [],
        },
      ],
    }
    expect(canCreateRoutine(moduleAdmin)).toBe(true)
    expect(canAccessDepartment(moduleAdmin, 'any-department')).toBe(true)
    expect(canCreateEmployee(moduleAdmin)).toBe(false)
    expect(canCreateCompany(moduleAdmin)).toBe(false)
    const restrictedAdmin = {
      ...adminUserMock,
      modules: [],
      departmentAccesses: [],
    }
    expect(canCreateRoutine(restrictedAdmin)).toBe(false)
    expect(canAccessDepartment(restrictedAdmin, 'any-department')).toBe(false)
    expect(canCreateEmployee(restrictedAdmin)).toBe(false)
  })

  it('applies contributor access only to its configured department', () => {
    expect(isOrganizationAdmin(memberUserMock)).toBe(false)
    expect(isLead(memberUserMock)).toBe(false)
    expect(canAccessDepartment(memberUserMock, 'dept-fiscal')).toBe(true)
    expect(canAccessDepartment(memberUserMock, 'dept-contabil')).toBe(false)
    expect(getDepartmentAccessRole(memberUserMock, 'dept-fiscal')).toBe(
      'contributor',
    )
    expect(canCreateRoutine(memberUserMock)).toBe(false)
    expect(canCreateCompany(memberUserMock)).toBe(false)
    expect(canCreateEmployee(memberUserMock)).toBe(false)
  })

  it('keeps lead as a departmental role of a member', () => {
    expect(leadUserMock.role).toBe('member')
    expect(isLead(leadUserMock, 'dept-fiscal')).toBe(true)
    expect(isLead(leadUserMock, 'dept-contabil')).toBe(false)
    expect(canCreateRoutine(leadUserMock, 'dept-fiscal')).toBe(false)
    expect(canCreateCompany(leadUserMock, ['dept-fiscal'])).toBe(false)
    expect(canCreateEmployee(leadUserMock)).toBe(false)
    expect(hasAppPermission(leadUserMock, APP_PERMISSION.VIEW_EMPLOYEES)).toBe(
      false,
    )
    expect(canAssignTask(leadUserMock, buildTask('dept-fiscal'))).toBe(true)
    expect(canAssignTask(leadUserMock, buildTask('dept-contabil'))).toBe(false)
  })

  it('grants organization-wide management to owner/admin', () => {
    expect(isOrganizationAdmin(adminUserMock)).toBe(true)
    expect(canAccessDepartment(adminUserMock, 'dept-contabil')).toBe(true)
    expect(canCreateRoutine(adminUserMock, 'dept-contabil')).toBe(true)
    expect(
      canCreateCompany(adminUserMock, ['dept-fiscal', 'dept-contabil']),
    ).toBe(true)
    expect(canCreateEmployee(adminUserMock)).toBe(false)
    expect(
      hasAppPermission(adminUserMock, APP_PERMISSION.CREATE_EMPLOYEE),
    ).toBe(false)
  })

  it('allows every other status for members authorized to operate a task', () => {
    const statuses = [
      'pending',
      'in_progress',
      'error',
      'no_movement',
      'completed',
    ] as const

    statuses.forEach((currentStatus) => {
      const task = {
        ...buildTask('dept-fiscal'),
        status: currentStatus,
      }

      expect(getAllowedTaskTransitionStatuses(adminUserMock, task)).toEqual(
        statuses.filter((status) => status !== currentStatus),
      )
    })
  })
})

function buildTask(departmentId: string): Task {
  return {
    id: 'task-1',
    kind: 'scheduled',
    clientId: null,
    routineId: null,
    departmentId,
    assigneeId: null,
    status: 'pending',
    period: '2026-06',
    dueDate: '2026-06-30',
    completedAt: null,
    indicators: { attachments: 0 },
  }
}
