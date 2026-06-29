import { USER_ROLE } from '../constants/roles.js'

export function isManager(user) {
  return user?.role === USER_ROLE.MANAGER
}

export function isLeader(user) {
  return user?.role === USER_ROLE.LEADER || isManager(user)
}

export function canAccessDepartment(user, departmentId) {
  if (isManager(user)) return true

  return user?.departmentIds?.includes(departmentId)
}

export function canEditRoutine(user, departmentId) {
  return isManager(user) || (user?.role === USER_ROLE.LEADER && canAccessDepartment(user, departmentId))
}

export function canAssignTask(user, task) {
  return isManager(user) || (user?.role === USER_ROLE.LEADER && canAccessDepartment(user, task.departmentId))
}

export function canManageEmployees(user) {
  return isManager(user)
}
