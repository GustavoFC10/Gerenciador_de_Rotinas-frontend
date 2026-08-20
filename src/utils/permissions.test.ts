import { describe, expect, it } from 'vitest'

import { adminUserMock, leadUserMock, memberUserMock } from '../constants/roles'
import {
  APP_PERMISSION,
  canAccessDepartment,
  canAssignTask,
  canCreateCompany,
  canCreateEmployee,
  canCreateRoutine,
  getDepartmentAccessRole,
  hasAppPermission,
  isLead,
  isOrganizationAdmin,
} from './permissions'
import type { Task } from '../types/domain'

describe('backend-aligned permissions', () => {
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
      true,
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
    expect(canCreateEmployee(adminUserMock)).toBe(true)
    expect(
      hasAppPermission(adminUserMock, APP_PERMISSION.CREATE_EMPLOYEE),
    ).toBe(true)
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
