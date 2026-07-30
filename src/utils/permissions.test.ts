import { describe, expect, it } from 'vitest'

import {
  currentUserMock,
  leaderUserMock,
  managerUserMock,
} from '../constants/roles'
import {
  APP_PERMISSION,
  canCreateCompany,
  canCreateEmployee,
  canCreateRoutine,
  hasAppPermission,
} from './permissions'

describe('creation permissions', () => {
  it('does not grant creation access to an operational employee', () => {
    expect(canCreateRoutine(currentUserMock)).toBe(false)
    expect(canCreateCompany(currentUserMock)).toBe(false)
    expect(canCreateEmployee(currentUserMock)).toBe(false)
  })

  it('limits a leader to routine and company creation in accessible departments', () => {
    expect(canCreateRoutine(leaderUserMock)).toBe(true)
    expect(canCreateRoutine(leaderUserMock, 'dept-fiscal')).toBe(true)
    expect(canCreateRoutine(leaderUserMock, 'dept-contabil')).toBe(false)
    expect(canCreateCompany(leaderUserMock, ['dept-fiscal'])).toBe(true)
    expect(
      canCreateCompany(leaderUserMock, ['dept-fiscal', 'dept-contabil']),
    ).toBe(false)
    expect(canCreateEmployee(leaderUserMock)).toBe(false)
  })

  it('grants all creation capabilities to a manager', () => {
    expect(canCreateRoutine(managerUserMock, 'dept-contabil')).toBe(true)
    expect(
      canCreateCompany(managerUserMock, ['dept-fiscal', 'dept-contabil']),
    ).toBe(true)
    expect(canCreateEmployee(managerUserMock)).toBe(true)
    expect(
      hasAppPermission(managerUserMock, APP_PERMISSION.CREATE_EMPLOYEE),
    ).toBe(true)
  })
})
