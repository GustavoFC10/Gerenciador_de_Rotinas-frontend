import { useQuery } from '@tanstack/react-query'
import { processQueryKeys } from '../query/processQueryKeys'
import type { OrganizationQueryScope } from '../query/queryKeys'
import { processService } from '../services/processService'
import { ProcessContractError } from '../services/processContract'
import type {
  ProcessFollowUpFilters,
  ProcessAlertFilters,
  ProcessAlertRecipientFilters,
} from '../types/processes'

// The server creates and closes situations. These queries only refresh persisted
// resources, while visible, and stop automatic retries after an HTTP failure.
const options = {
  retry: false as const,
  refetchOnWindowFocus: (query: { state: { error: unknown } }) =>
    !query.state.error,
  refetchInterval: (query: { state: { error: unknown } }) =>
    query.state.error ? (false as const) : 60_000,
  refetchIntervalInBackground: false,
}

export function useProcessFollowUps(
  scope: OrganizationQueryScope,
  filters: ProcessFollowUpFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    enabled,
    queryKey: processQueryKeys.followUps(scope, filters),
    queryFn: async ({ signal }) => {
      const response = await processService.followUps(filters, signal)
      if (
        filters.processId &&
        response.data.results.some(
          (item) => item.processId !== filters.processId,
        )
      )
        throw new ProcessContractError(
          'response.results.processId (processo diferente do solicitado)',
          response.requestId,
        )
      return response.data
    },
  })
}

export function useProcessAlerts(
  scope: OrganizationQueryScope,
  filters: ProcessAlertFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    enabled,
    queryKey: processQueryKeys.alerts(scope, filters),
    queryFn: async ({ signal }) => {
      const response = await processService.alerts(filters, signal)
      if (
        filters.processId &&
        response.data.results.some(
          (item) => item.processId !== filters.processId,
        )
      )
        throw new ProcessContractError(
          'response.results.processId (processo diferente do solicitado)',
          response.requestId,
        )
      return response.data
    },
  })
}

export function useProcessAlert(
  scope: OrganizationQueryScope,
  id: string,
  enabled = true,
) {
  return useQuery({
    ...options,
    enabled: enabled && !!id,
    queryKey: processQueryKeys.alert(scope, id),
    queryFn: async ({ signal }) => {
      const response = await processService.alert(id, signal)
      if (response.data.id !== id)
        throw new ProcessContractError(
          'response.id (aviso diferente do solicitado)',
          response.requestId,
        )
      return response.data
    },
  })
}

export function useProcessAlertRecipientOptions(
  scope: OrganizationQueryScope,
  filters: ProcessAlertRecipientFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    enabled,
    queryKey: processQueryKeys.alertRecipients(scope, filters),
    queryFn: async ({ signal }) =>
      (await processService.alertRecipientOptions(filters, signal)).data,
  })
}
