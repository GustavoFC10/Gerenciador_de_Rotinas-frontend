import { useQuery } from '@tanstack/react-query'

import { queryKeys, type OrganizationQueryScope } from '../query/queryKeys'
import { getRoutineControl } from '../services/routineControlService'

export function useRoutineControl(
  scope: OrganizationQueryScope,
  period: string,
) {
  const queryKey = queryKeys.routineControl(scope, period)
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getRoutineControl({ period, signal }),
  })

  const error = query.error
    ? query.error instanceof Error
      ? query.error
      : new Error('Nao foi possivel carregar os dados.')
    : null

  return {
    response: query.data ?? null,
    data: query.data?.data ?? null,
    isInitialLoading: query.isPending && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    error,
  }
}
