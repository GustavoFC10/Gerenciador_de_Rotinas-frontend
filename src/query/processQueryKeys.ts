import { queryKeys, type OrganizationQueryScope } from './queryKeys'

export const processQueryKeys = {
  root: (scope: OrganizationQueryScope) =>
    [...queryKeys.scope(scope), 'processes'] as const,
  catalog: (scope: OrganizationQueryScope) =>
    [...processQueryKeys.root(scope), 'catalog'] as const,
  list: (scope: OrganizationQueryScope) =>
    [...processQueryKeys.root(scope), 'list'] as const,
  indicators: (scope: OrganizationQueryScope) =>
    [...processQueryKeys.root(scope), 'indicators'] as const,
  detail: (scope: OrganizationQueryScope, id: string) =>
    [...processQueryKeys.root(scope), 'detail', id] as const,
  report: (scope: OrganizationQueryScope, month: string) =>
    [...processQueryKeys.root(scope), 'report', month] as const,
}
