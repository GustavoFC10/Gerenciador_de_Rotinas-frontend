import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '../query/queryKeys'
import { internalOrganizationService } from '../services/internalOrganizationService'

export function useInternalOrganizations() {
  return useQuery({
    queryKey: queryKeys.internalOrganizations(),
    queryFn: async () => (await internalOrganizationService.list()).data,
  })
}

export function useInternalOrganization(organizationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.internalOrganization(organizationId ?? 'unknown'),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('A organizacao nao foi informada.')
      }

      return (await internalOrganizationService.get(organizationId)).data
    },
    enabled: Boolean(organizationId),
  })
}
