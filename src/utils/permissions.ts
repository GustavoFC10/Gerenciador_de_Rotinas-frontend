import { USER_ROLE } from '../constants/roles'
import type { AppUser, EntityId, Task } from '../types/domain'

export const APP_PERMISSION = {
  CREATE_ROUTINE: 'create_routine',
  CREATE_COMPANY: 'create_company',
  CREATE_EMPLOYEE: 'create_employee',
} as const

export type AppPermission = (typeof APP_PERMISSION)[keyof typeof APP_PERMISSION]

export function isManager(user?: AppUser | null): boolean {
  return user?.role === USER_ROLE.MANAGER
}

export function isLeader(user?: AppUser | null): boolean {
  return user?.role === USER_ROLE.LEADER || isManager(user)
}

export function canAccessDepartment(
  user: AppUser | null | undefined,
  departmentId: EntityId,
): boolean {
  if (isManager(user)) return true

  return Boolean(user?.departmentIds?.includes(departmentId))
}

export function canEditRoutine(
  user: AppUser | null | undefined,
  departmentId: EntityId,
): boolean {
  return (
    isManager(user) ||
    (user?.role === USER_ROLE.LEADER && canAccessDepartment(user, departmentId))
  )
}

export function canAssignTask(
  user: AppUser | null | undefined,
  task: Task,
): boolean {
  return (
    isManager(user) ||
    (user?.role === USER_ROLE.LEADER &&
      canAccessDepartment(user, task.departmentId))
  )
}

export function canManageEmployees(user?: AppUser | null): boolean {
  return isManager(user)
}

export function canCreateRoutine(
  user: AppUser | null | undefined,
  departmentId?: EntityId | null,
): boolean {
  if (!isLeader(user)) return false
  return !departmentId || canAccessDepartment(user, departmentId)
}

export function canCreateCompany(
  user: AppUser | null | undefined,
  departmentIds: EntityId[] = [],
): boolean {
  if (!isLeader(user)) return false
  return departmentIds.every((departmentId) =>
    canAccessDepartment(user, departmentId),
  )
}

export function canCreateEmployee(user?: AppUser | null): boolean {
  return canManageEmployees(user)
}

export function hasAppPermission(
  user: AppUser | null | undefined,
  permission: AppPermission,
  departmentIds: EntityId[] = [],
): boolean {
  if (permission === APP_PERMISSION.CREATE_ROUTINE) {
    return canCreateRoutine(user, departmentIds[0])
  }

  if (permission === APP_PERMISSION.CREATE_COMPANY) {
    return canCreateCompany(user, departmentIds)
  }

  return canCreateEmployee(user)
}
