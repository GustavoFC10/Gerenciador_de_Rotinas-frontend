import { DEPARTMENT_ACCESS_ROLE, ORGANIZATION_ROLE } from '../constants/roles'
import { ROUTINE_STATUS } from '../constants/routineStatus'
import type {
  AppUser,
  DepartmentAccessRole,
  Employee,
  EntityId,
  RoutineStatus,
  Task,
} from '../types/domain'

export const APP_PERMISSION = {
  CREATE_ROUTINE: 'create_routine',
  CREATE_COMPANY: 'create_company',
  CREATE_EMPLOYEE: 'create_employee',
  MANAGE_SCREENS: 'manage_screens',
  MANAGE_ORGANIZATION: 'manage_organization',
  VIEW_EMPLOYEES: 'view_employees',
} as const

export type AppPermission = (typeof APP_PERMISSION)[keyof typeof APP_PERMISSION]

export function isOwner(user?: AppUser | null): boolean {
  return user?.role === ORGANIZATION_ROLE.OWNER
}

export function isAdmin(user?: AppUser | null): boolean {
  return user?.role === ORGANIZATION_ROLE.ADMIN
}

export function isOrganizationAdmin(user?: AppUser | null): boolean {
  return isOwner(user) || isAdmin(user)
}

export function getDepartmentAccessRole(
  user: AppUser | null | undefined,
  departmentId: EntityId,
): DepartmentAccessRole | null {
  return (
    user?.departmentAccesses.find(
      (access) => access.departmentId === departmentId,
    )?.role ?? null
  )
}

export function isLead(
  user: AppUser | null | undefined,
  departmentId?: EntityId,
): boolean {
  return Boolean(
    user?.departmentAccesses.some(
      (access) =>
        access.role === DEPARTMENT_ACCESS_ROLE.LEAD &&
        (!departmentId || access.departmentId === departmentId),
    ),
  )
}

export function canAccessDepartment(
  user: AppUser | null | undefined,
  departmentId: EntityId,
): boolean {
  return (
    isOrganizationAdmin(user) ||
    getDepartmentAccessRole(user, departmentId) !== null
  )
}

export function canEmployeeAccessDepartment(
  employee: Employee,
  departmentId: EntityId,
): boolean {
  if (
    employee.role === ORGANIZATION_ROLE.OWNER ||
    employee.role === ORGANIZATION_ROLE.ADMIN
  ) {
    return true
  }

  if (!employee.role && !employee.departmentAccesses) return true

  return Boolean(
    employee.departmentAccesses?.some(
      (access) => access.departmentId === departmentId,
    ),
  )
}

export function canEditRoutine(
  user: AppUser | null | undefined,
  departmentId: EntityId,
): boolean {
  void departmentId
  return isOrganizationAdmin(user)
}

export function canAssignTask(
  user: AppUser | null | undefined,
  task: Task,
): boolean {
  return isOrganizationAdmin(user) || isLead(user, task.departmentId)
}

const taskTransitionStatuses: RoutineStatus[] = [
  ROUTINE_STATUS.PENDING,
  ROUTINE_STATUS.IN_PROGRESS,
  ROUTINE_STATUS.ERROR,
  ROUTINE_STATUS.NO_MOVEMENT,
  ROUTINE_STATUS.COMPLETED,
]

/**
 * Retorna todos os estados disponíveis para o membro no card atual.
 * A autorização continua respeitando o perfil e o departamento; uma vez
 * autorizado, o membro pode escolher qualquer outro estado.
 */
export function getAllowedTaskTransitionStatuses(
  user: AppUser | null | undefined,
  task: Task,
): RoutineStatus[] {
  const departmentRole = getDepartmentAccessRole(user, task.departmentId)
  const canChangeStatus =
    isOrganizationAdmin(user) ||
    departmentRole === DEPARTMENT_ACCESS_ROLE.LEAD ||
    (departmentRole === DEPARTMENT_ACCESS_ROLE.CONTRIBUTOR &&
      task.assigneeId === user?.membershipId)

  if (!canChangeStatus) return []

  return taskTransitionStatuses.filter((status) => status !== task.status)
}

export function canTransitionTask(
  user: AppUser | null | undefined,
  task: Task,
  nextStatus: RoutineStatus,
): boolean {
  return getAllowedTaskTransitionStatuses(user, task).includes(nextStatus)
}

export function canCreateTask(
  user: AppUser | null | undefined,
  departmentId: EntityId,
): boolean {
  return isOrganizationAdmin(user) || isLead(user, departmentId)
}

export function canManageEmployees(user?: AppUser | null): boolean {
  return isOrganizationAdmin(user)
}

export function canViewEmployees(user?: AppUser | null): boolean {
  return isOrganizationAdmin(user) || isLead(user)
}

export function canCreateRoutine(
  user: AppUser | null | undefined,
  departmentId?: EntityId | null,
): boolean {
  void departmentId
  return isOrganizationAdmin(user)
}

export function canCreateCompany(
  user: AppUser | null | undefined,
  departmentIds: EntityId[] = [],
): boolean {
  void departmentIds
  return isOrganizationAdmin(user)
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

  if (permission === APP_PERMISSION.CREATE_EMPLOYEE) {
    return canCreateEmployee(user)
  }

  if (permission === APP_PERMISSION.MANAGE_SCREENS) {
    return isOrganizationAdmin(user)
  }

  if (permission === APP_PERMISSION.MANAGE_ORGANIZATION) {
    return isOrganizationAdmin(user)
  }

  return canViewEmployees(user)
}
