import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '../query/queryKeys'
import { companyService } from '../services/companyService'
import { useAuth } from './useAuth'

export function useArchivedCompanies() {
  const { activeMembership } = useAuth()
  const scope = useMemo(
    () =>
      activeMembership
        ? {
            organizationId: activeMembership.organization.id,
            membershipId: activeMembership.id,
          }
        : null,
    [activeMembership],
  )

  const query = useQuery({
    queryKey: scope
      ? queryKeys.archivedCompanies(scope)
      : ['archived-companies', 'unauthenticated'],
    queryFn: async () => {
      const companies = await companyService.listAll(true)
      return companies.filter((company) => company.archivedAt !== null)
    },
    enabled: Boolean(scope),
  })

  return {
    companies: query.data ?? [],
    isLoading: query.isPending && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    error: query.error,
    reload: query.refetch,
  }
}
