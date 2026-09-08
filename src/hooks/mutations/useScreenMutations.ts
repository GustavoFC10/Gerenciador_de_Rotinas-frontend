import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { upsertScreenInOperationalContexts } from '../../query/routineControlCache'
import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import { isApiError } from '../../services/httpClient'
import {
  screenService,
  type ScreenInput,
  type ScreenPatch,
} from '../../services/screenService'
import type { Screen, ScreenSummary } from '../../types/domain'

interface ScreenMutationScope extends OrganizationQueryScope {
  period: string
}

export function useScreenMutations({
  organizationId,
  membershipId,
  period,
}: ScreenMutationScope) {
  const queryClient = useQueryClient()
  const scope = { organizationId, membershipId }

  const createMutation = useMutation({
    mutationFn: async (input: ScreenInput): Promise<Screen> => {
      const response = await screenService.create(input)
      upsertScreenInOperationalContexts(queryClient, scope, response.data)
      upsertScreenInNavigation(queryClient, scope, response.data)
      return response.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      screenId,
      changes,
      etag,
    }: {
      screenId: string
      changes: ScreenPatch
      etag: string
    }): Promise<Screen> => {
      let response
      try {
        response = await screenService.update(screenId, changes, etag)
      } catch (error) {
        if (isApiError(error) && error.status === 412) {
          const current = await screenService.get(screenId)
          upsertScreenInOperationalContexts(queryClient, scope, current.data)
          upsertScreenInNavigation(queryClient, scope, current.data)
          queryClient.setQueryData(queryKeys.screen(scope, screenId), current)
          throw new Error(
            'Esta tela foi alterada por outra pessoa. Os dados mais recentes foram carregados.',
            { cause: error },
          )
        }
        throw error
      }
      upsertScreenInOperationalContexts(queryClient, scope, response.data)
      upsertScreenInNavigation(queryClient, scope, response.data)
      queryClient.setQueryData(queryKeys.screen(scope, screenId), response)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.screenProjection(scope, screenId, period),
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agendaProjection(scope, screenId, period),
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routineControl(scope, period),
        exact: true,
      })
      return response.data
    },
  })

  return {
    createScreen: createMutation.mutateAsync,
    updateScreen: useCallback(
      (screenId: string, changes: ScreenPatch, etag: string) =>
        updateMutation.mutateAsync({ screenId, changes, etag }),
      [updateMutation],
    ),
  }
}

function upsertScreenInNavigation(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: OrganizationQueryScope,
  screen: ScreenSummary,
): void {
  queryClient.setQueryData<ScreenSummary[]>(
    queryKeys.navigationScreens(scope),
    (current) => {
      if (!current) return current

      const existingIndex = current.findIndex((item) => item.id === screen.id)

      if (existingIndex === -1) return [...current, screen]

      return current.map((item) => (item.id === screen.id ? screen : item))
    },
  )
  void queryClient.invalidateQueries({
    queryKey: queryKeys.navigationScreens(scope),
    exact: true,
  })
}
