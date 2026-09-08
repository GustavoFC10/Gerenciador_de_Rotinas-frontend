export const ROUTES = {
  LOGIN: '/login',
  ACCEPT_INVITATION: '/accept-invitation',
  INTERNAL: '/internal',
  INTERNAL_ORGANIZATIONS: '/internal/organizations',
  INTERNAL_ORGANIZATION_CREATE: '/internal/organizations/new',
  INTERNAL_ORGANIZATION_DETAILS: '/internal/organizations/:organizationId',
  HOME: '/',
  SPREADSHEET: '/planilha',
  AGENDA: '/agenda',
  LIST: '/lista',
  TASKS: '/tarefas-fiscal',
  MY_TASKS: '/minhas-tarefas',
  DEPARTMENT_DASHBOARD: '/dashboard-departamento',
  ORGANIZATION_DASHBOARD: '/dashboard-geral',
  ROUTINES: '/rotinas',
  ROUTINE_CREATE: '/rotinas/nova',
  ROUTINE_DETAILS: '/rotinas/:routineId',
  COMPANIES: '/empresas',
  COMPANY_CREATE: '/empresas/nova',
  COMPANY_DETAILS: '/empresas/:clientId',
  EMPLOYEES: '/funcionarios',
  EMPLOYEE_CREATE: '/funcionarios/novo',
  SCREENS: '/telas',
  SCREEN_CREATE: '/telas/nova',
  ROLES: '/cargos',
  SETTINGS: '/configuracoes',
  SETTINGS_ORGANIZATION: '/configuracoes/organizacao',
  SETTINGS_ARCHIVED_COMPANIES: '/configuracoes/empresas-arquivadas',
  SETTINGS_DEPARTMENTS: '/configuracoes/departamentos',
  SETTINGS_WORKFLOWS: '/configuracoes/fluxos',
  SETTINGS_WORKFLOW_AUTOMATIONS: '/configuracoes/fluxos/automacoes',
  SETTINGS_WORKFLOW_SHORTCUTS: '/configuracoes/fluxos/atalhos',
  SETTINGS_INTEGRATIONS: '/configuracoes/integracoes',
  PROFILE: '/perfil',
} as const

export function isInternalRoute(pathname: string): boolean {
  return (
    pathname === ROUTES.INTERNAL || pathname.startsWith(`${ROUTES.INTERNAL}/`)
  )
}

export function getInternalOrganizationPath(organizationId: string): string {
  return `${ROUTES.INTERNAL_ORGANIZATIONS}/${encodeURIComponent(organizationId)}`
}

export function getSettingsDepartmentPath(departmentId: string): string {
  return `${ROUTES.SETTINGS_DEPARTMENTS}/${encodeURIComponent(departmentId)}`
}

export function getSettingsDepartmentScreensPath(departmentId: string): string {
  return `${getSettingsDepartmentPath(departmentId)}/telas`
}

export function getSettingsDepartmentScreenCreatePath(
  departmentId: string,
): string {
  return `${getSettingsDepartmentScreensPath(departmentId)}/nova`
}

export function getSettingsDepartmentScreenPath(
  departmentId: string,
  screenId: string,
): string {
  return `${getSettingsDepartmentScreensPath(departmentId)}/${encodeURIComponent(screenId)}`
}

export function getSettingsDepartmentPermissionsPath(
  departmentId: string,
): string {
  return `${getSettingsDepartmentPath(departmentId)}/permissoes`
}
