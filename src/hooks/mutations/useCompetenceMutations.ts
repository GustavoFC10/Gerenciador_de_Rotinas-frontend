import { useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import { competenceService } from '../../services/competenceService'
import { isApiError } from '../../services/httpClient'

interface CompetenceMutationScope extends OrganizationQueryScope {
  period: string
}

export function useCompetenceMutations({
  organizationId,
  membershipId,
  period,
}: CompetenceMutationScope) {
  const queryClient = useQueryClient()
  const scope = { organizationId, membershipId }
  const queryKey = queryKeys.routineControl(scope, period)

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const currentCompetence = await competenceService.getByPeriod(period)

      if (currentCompetence.data.status === 'projected') {
        if (currentCompetence.data.id && !currentCompetence.etag) {
          throw new Error(
            'A API nao informou a versao atual da competencia para finalizacao.',
          )
        }

        try {
          await competenceService.finalizeByPeriod(
            period,
            currentCompetence.data.id
              ? (currentCompetence.etag ?? undefined)
              : undefined,
          )
        } catch (error) {
          if (isApiError(error) && error.status === 412) {
            await queryClient.refetchQueries({ queryKey, exact: true })
            throw new Error(
              'A competência foi alterada por outra pessoa. Os dados mais recentes foram carregados.',
              { cause: error },
            )
          }
          throw error
        }
      }

      await queryClient.refetchQueries({ queryKey, exact: true })
    },
  })

  return {
    finalizeCompetence: finalizeMutation.mutateAsync,
    isFinalizingCompetence: finalizeMutation.isPending,
  }
}
