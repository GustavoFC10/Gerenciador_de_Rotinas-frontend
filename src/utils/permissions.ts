import { USER_ROLE } from '../constants/roles'
import type { AppUser, EntityId, Task } from '../types/domain'

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
