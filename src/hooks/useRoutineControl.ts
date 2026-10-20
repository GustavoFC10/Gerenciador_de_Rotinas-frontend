import { useMemo } from 'react'
import { useMutationState, useQuery } from '@tanstack/react-query'

import type { TaskTransitionVariables } from './mutations/useTaskMutations'
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
  const pendingTransitions = useMutationState<TaskTransitionVariables>({
    filters: {
      mutationKey: queryKeys.taskTransitions(scope, period),
      status: 'pending',
      exact: true,
    },
    select: (mutation) => mutation.state.variables as TaskTransitionVariables,
  })
  // Keep the chosen status visible while attachment updates and refetches
  // continue supplying authoritative task data, versions and attachment counts.
  const response = useMemo(() => {
    if (!query.data || pendingTransitions.length === 0)
      return query.data ?? null

    const statusByTask = new Map(
      pendingTransitions.map(({ taskId, status }) => [taskId, status]),
    )
    return {
      ...query.data,
      data: {
        ...query.data.data,
        tasks: query.data.data.tasks.map((task) => {
          const status = statusByTask.get(task.id)
          return status ? { ...task, status } : task
        }),
      },
    }
  }, [pendingTransitions, query.data])

  const error = query.error
    ? query.error instanceof Error
      ? query.error
      : new Error('Nao foi possivel carregar os dados.')
    : null

  return {
    response,
    data: response?.data ?? null,
    isInitialLoading: query.isPending && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    error,
    refetch: query.refetch,
  }
}
