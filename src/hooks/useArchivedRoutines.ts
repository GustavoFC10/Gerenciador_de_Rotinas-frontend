import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '../query/queryKeys'
import { routineService } from '../services/routineService'
import { useAuth } from './useAuth'

export function useArchivedRoutines() {
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
      ? queryKeys.archivedRoutines(scope)
      : ['archived-routines', 'unauthenticated'],
    queryFn: async () => {
      const routines = await routineService.listAll(true)
      return routines.filter((routine) => routine.archivedAt !== null)
    },
    enabled: Boolean(scope),
  })

  return {
    routines: query.data ?? [],
    isLoading: query.isPending && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    error: query.error,
    reload: query.refetch,
  }
}
