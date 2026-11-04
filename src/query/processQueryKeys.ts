import { queryKeys, type OrganizationQueryScope } from './queryKeys'
import type {
  ProcessEntriesFilters,
  ProcessFilters,
  ProcessFollowUpFilters,
  ProcessAlertFilters,
  ProcessAlertRecipientFilters,
  ProcessCompanyOptionsFilters,
} from '../types/processes'
import { PROCESS_CONTRACT_VERSION } from '../types/processes'
import {
  normalizeProcessEntriesFilters,
  normalizeProcessFilters,
} from '../services/processContract'

export { normalizeProcessFilters } from '../services/processContract'

export const processQueryKeys = {
  root: (scope: OrganizationQueryScope) =>
    [...queryKeys.scope(scope), 'processes', PROCESS_CONTRACT_VERSION] as const,
  catalog: (scope: OrganizationQueryScope) =>
    [...processQueryKeys.root(scope), 'catalog'] as const,
  companyOptions: (
    scope: OrganizationQueryScope,
    filters?: ProcessCompanyOptionsFilters,
  ) =>
    [
      ...processQueryKeys.root(scope),
      'company-options',
      ...(filters === undefined
        ? []
        : [
            {
              ...filters,
              search: filters.search?.trim() ?? '',
              page: filters.page ?? 1,
              pageSize: filters.pageSize ?? 20,
            },
          ]),
    ] as const,
  list: (scope: OrganizationQueryScope, filters?: ProcessFilters) =>
    [
      ...processQueryKeys.root(scope),
      'list',
      ...(filters === undefined ? [] : [normalizeProcessFilters(filters)]),
    ] as const,
  indicators: (scope: OrganizationQueryScope, filters?: ProcessFilters) =>
    [
      ...processQueryKeys.root(scope),
      'indicators',
      ...(filters === undefined ? [] : [normalizeProcessFilters(filters)]),
    ] as const,
  detail: (scope: OrganizationQueryScope, id: string) =>
    [...processQueryKeys.root(scope), 'detail', id] as const,
  entries: (
    scope: OrganizationQueryScope,
    id: string,
    filters?: ProcessEntriesFilters,
  ) =>
    [
      ...processQueryKeys.root(scope),
      'entries',
      id,
      ...(filters === undefined
        ? []
        : [normalizeProcessEntriesFilters(filters)]),
    ] as const,
  report: (scope: OrganizationQueryScope, month: string) =>
    [...processQueryKeys.root(scope), 'report', month] as const,
  followUps: (
    scope: OrganizationQueryScope,
    filters?: ProcessFollowUpFilters,
  ) =>
    [
      ...processQueryKeys.root(scope),
      'follow-ups',
      ...(filters === undefined
        ? []
        : [
            {
              ...filters,
              page: filters.page ?? 1,
              pageSize: filters.pageSize ?? 50,
            },
          ]),
    ] as const,
  followUp: (scope: OrganizationQueryScope, id: string) =>
    [...processQueryKeys.root(scope), 'follow-up', id] as const,
  alerts: (scope: OrganizationQueryScope, filters?: ProcessAlertFilters) =>
    [
      ...processQueryKeys.root(scope),
      'alerts',
      ...(filters === undefined
        ? []
        : [
            {
              ...filters,
              page: filters.page ?? 1,
              pageSize: filters.pageSize ?? 50,
            },
          ]),
    ] as const,
  alert: (scope: OrganizationQueryScope, id: string) =>
    [...processQueryKeys.root(scope), 'alert', id] as const,
  alertRecipients: (
    scope: OrganizationQueryScope,
    filters?: ProcessAlertRecipientFilters,
  ) =>
    [
      ...processQueryKeys.root(scope),
      'alert-recipients',
      ...(filters === undefined
        ? []
        : [
            {
              ...filters,
              page: filters.page ?? 1,
              pageSize: filters.pageSize ?? 50,
            },
          ]),
    ] as const,
}
