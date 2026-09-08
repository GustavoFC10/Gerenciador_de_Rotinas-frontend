export interface OrganizationQueryScope {
  organizationId: string
  membershipId: string
}

function scopeKey({ organizationId, membershipId }: OrganizationQueryScope) {
  return ['organization', organizationId, 'membership', membershipId] as const
}

export const queryKeys = {
  internalOrganizations: () => ['internal', 'organizations'] as const,
  internalOrganization: (organizationId: string) =>
    ['internal', 'organizations', organizationId] as const,
  scope: scopeKey,
  routineControlRoot: (scope: OrganizationQueryScope) =>
    [...scopeKey(scope), 'routine-control'] as const,
  routineControl: (scope: OrganizationQueryScope, period: string) =>
    [...scopeKey(scope), 'routine-control', period] as const,
  navigationScreens: (scope: OrganizationQueryScope) =>
    [...scopeKey(scope), 'navigation-screens'] as const,
  members: (scope: OrganizationQueryScope) =>
    [...scopeKey(scope), 'members'] as const,
  member: (scope: OrganizationQueryScope, memberId: string) =>
    [...scopeKey(scope), 'member', memberId] as const,
  companyRoutineAssignments: (
    scope: OrganizationQueryScope,
    companyId: string,
  ) => [...scopeKey(scope), 'company-routine-assignments', companyId] as const,
  screen: (scope: OrganizationQueryScope, screenId: string) =>
    [...scopeKey(scope), 'screen', screenId] as const,
  screenProjection: (
    scope: OrganizationQueryScope,
    screenId: string,
    period: string,
  ) => [...scopeKey(scope), 'screen-projection', screenId, period] as const,
  taskAssignees: (scope: OrganizationQueryScope, departmentId: string) =>
    [...scopeKey(scope), 'task-assignees', departmentId] as const,
  agendaProjection: (
    scope: OrganizationQueryScope,
    screenId: string,
    period: string,
  ) => [...scopeKey(scope), 'agenda-projection', screenId, period] as const,
}
