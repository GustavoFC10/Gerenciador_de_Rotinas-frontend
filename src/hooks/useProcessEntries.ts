import { useQuery } from '@tanstack/react-query'

import { processQueryKeys } from '../query/processQueryKeys'
import type { OrganizationQueryScope } from '../query/queryKeys'
import { processService } from '../services/processService'
import type { ProcessEntriesFilters } from '../types/processes'

export function useProcessEntries(
  scope: OrganizationQueryScope,
  processId: string,
  filters: ProcessEntriesFilters,
) {
  return useQuery({
    queryKey: processQueryKeys.entries(scope, processId, filters),
    queryFn: async ({ signal }) =>
      (await processService.entries(processId, filters, signal)).data,
    retry: false,
  })
}
