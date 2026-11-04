import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrganizationQueryScope } from '../query/queryKeys'
import { processQueryKeys } from '../query/processQueryKeys'
import { processService } from '../services/processService'
import { ProcessContractError } from '../services/processContract'
import type {
  ProcessCatalog,
  ProcessFilters,
  ProcessIndicators,
  ProcessPage,
  ProcessResource,
  ProcessSummary,
} from '../types/processes'

// Metadata follows the in-memory snapshot; it never becomes part of a DTO or
// browser storage, and disappears when the cached object is collected.
const summaryRequestIds = new WeakMap<ProcessSummary, string | null>()

// Incompatible responses and HTTP failures are never retried as empty collections.
// Poll only successful queries; Retry-After is handled by the service and retry UI.
const options = {
  retry: false as const,
  refetchOnWindowFocus: false,
  refetchInterval: (query: { state: { error: unknown } }) =>
    query.state.error ? (false as const) : 60_000,
}

export function useProcessCatalog(
  scope: OrganizationQueryScope,
  enabled = true,
) {
  return useQuery<ProcessCatalog, Error>({
    ...options,
    enabled,
    refetchInterval: false,
    refetchOnWindowFocus: (query) => !query.state.error,
    queryKey: processQueryKeys.catalog(scope),
    queryFn: ({ signal }) =>
      processService.catalog(signal).then((response) => response.data),
  })
}

export function useProcessList(
  scope: OrganizationQueryScope,
  filters: ProcessFilters,
  enabled: boolean,
) {
  return useQuery<ProcessPage, Error>({
    ...options,
    enabled,
    queryKey: processQueryKeys.list(scope, filters),
    queryFn: async ({ signal }) => {
      const response = await processService.list(filters, signal)
      response.data.results.forEach((summary, index) => {
        if (summary.organizationId !== scope.organizationId) {
          throw new ProcessContractError(
            `response.results[${index}].organizationId (organização diferente do contexto ativo)`,
            response.requestId,
          )
        }
      })
      for (const summary of response.data.results)
        summaryRequestIds.set(summary, response.requestId)
      return response.data
    },
  })
}

export function useProcessIndicators(
  scope: OrganizationQueryScope,
  filters: ProcessFilters,
  enabled: boolean,
) {
  return useQuery<ProcessIndicators, Error>({
    ...options,
    enabled,
    queryKey: processQueryKeys.indicators(scope, filters),
    queryFn: ({ signal }) =>
      processService
        .indicators(filters, signal)
        .then((response) => response.data),
  })
}

export function useProcessDetail(
  scope: OrganizationQueryScope,
  id: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient()
  return useQuery<ProcessResource, Error>({
    ...options,
    refetchOnWindowFocus: (query) => !query.state.error,
    enabled: enabled && !!id,
    queryKey: processQueryKeys.detail(scope, id),
    queryFn: async ({ signal }) => {
      const response = await processService.get(id, signal)
      const detail = response.data
      if (detail.id !== id) {
        throw new ProcessContractError(
          'response.id (processo diferente do solicitado)',
          response.requestId,
        )
      }
      if (detail.organizationId !== scope.organizationId) {
        throw new ProcessContractError(
          'response.organizationId (organização diferente do contexto ativo)',
          response.requestId,
        )
      }
      const pages = queryClient.getQueriesData<ProcessPage>({
        queryKey: processQueryKeys.list(scope),
      })
      for (const [, page] of pages) {
        for (const summary of page?.results ?? []) {
          if (
            summary.id !== detail.id ||
            summary.version !== detail.version ||
            summary.status === detail.status
          )
            continue
          const listRequestId = summaryRequestIds.get(summary)
          throw new ProcessContractError(
            `response.status (lista e detalhe divergem na mesma versão ${detail.version}${listRequestId ? `; requisição da lista: ${listRequestId}` : ''})`,
            response.requestId,
          )
        }
      }
      return detail
    },
  })
}
