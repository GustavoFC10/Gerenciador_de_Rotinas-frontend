import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { upsertRoutineInOperationalContexts } from '../../query/routineControlCache'
import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import { toRoutineFromResource } from '../../query/routineControlMappers'
import { isApiError } from '../../services/httpClient'
import {
  routineService,
  type RoutineInput,
  type RoutineResource,
} from '../../services/routineService'
import type { RoutineEditInput } from '../../types/routine'

export function useRoutineMutations(scope: OrganizationQueryScope) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (input: RoutineInput): Promise<RoutineResource> => {
      const response = await routineService.create(input)
      upsertRoutineInOperationalContexts(
        queryClient,
        scope,
        toRoutineFromResource(response.data),
      )
      return response.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      routineId,
      changes,
    }: {
      routineId: string
      changes: RoutineEditInput
    }) => {
      let currentRoutine = await routineService.get(routineId)

      if (!currentRoutine.etag) {
        throw new Error(
          'A API nao informou a versao atual da rotina para salvar as alteracoes.',
        )
      }

      const identityChanged =
        currentRoutine.data.name !== changes.name ||
        currentRoutine.data.shotname !== changes.shotname

      if (identityChanged) {
        try {
          currentRoutine = await routineService.updateIdentity(
            routineId,
            { name: changes.name, shotname: changes.shotname },
            currentRoutine.etag,
          )
        } catch (error) {
          if (await refreshRoutineAfterConflict(error, routineId)) {
            throw new Error(
              'Esta rotina foi alterada por outra pessoa. Os dados mais recentes foram carregados.',
              { cause: error },
            )
          }
          throw error
        }
        upsertRoutineInOperationalContexts(
          queryClient,
          scope,
          toRoutineFromResource(currentRoutine.data),
        )
      }

      const currentVersion = currentRoutine.data.currentVersion
      const versionChanged =
        currentVersion.description !== changes.description ||
        currentVersion.recurrence !== changes.recurrence ||
        currentVersion.defaultDueDays !== changes.defaultDueDays ||
        (currentVersion.defaultAssigneeMemberId ?? null) !==
          (changes.defaultAssigneeMemberId ?? null) ||
        currentVersion.recurrenceMonths.join(',') !==
          changes.recurrenceMonths.join(',')

      if (!versionChanged) return currentRoutine.data

      if (!currentRoutine.etag) {
        throw new Error(
          'A API nao informou a versao necessaria para publicar a nova regra da rotina.',
        )
      }

      let response
      try {
        response = await routineService.publishVersion(
          routineId,
          {
            description: changes.description,
            recurrence: changes.recurrence,
            defaultDueDays: changes.defaultDueDays,
            recurrenceMonths: changes.recurrenceMonths,
            defaultAssigneeMemberId: changes.defaultAssigneeMemberId ?? null,
          },
          currentRoutine.etag,
        )
      } catch (error) {
        if (await refreshRoutineAfterConflict(error, routineId)) {
          throw new Error(
            'Esta rotina foi alterada por outra pessoa. Os dados mais recentes foram carregados.',
            { cause: error },
          )
        }
        throw error
      }
      upsertRoutineInOperationalContexts(
        queryClient,
        scope,
        toRoutineFromResource(response.data),
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routineControlRoot(scope),
      })
      return response.data
    },
  })

  return {
    createRoutine: createMutation.mutateAsync,
    updateRoutine: useCallback(
      (routineId: string, changes: RoutineEditInput) =>
        updateMutation.mutateAsync({ routineId, changes }),
      [updateMutation],
    ),
  }

  async function refreshRoutineAfterConflict(
    error: unknown,
    routineId: string,
  ): Promise<boolean> {
    if (!isApiError(error) || error.status !== 412) return false

    const current = await routineService.get(routineId)
    upsertRoutineInOperationalContexts(
      queryClient,
      scope,
      toRoutineFromResource(current.data),
    )
    return true
  }
}
