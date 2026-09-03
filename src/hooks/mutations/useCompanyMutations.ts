import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  markClientInactiveInOperationalContexts,
  upsertClientInOperationalContexts,
  upsertScreenInOperationalContexts,
} from '../../query/routineControlCache'
import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import { toClientFromResource } from '../../query/routineControlMappers'
import { isApiError } from '../../services/httpClient'
import {
  companyService,
  type ClientCompanyPatch,
  type ClientRoutineAssignmentResource,
} from '../../services/companyService'
import { screenService } from '../../services/screenService'
import {
  CompanySetupError,
  type CompanySetupInput,
  type CreateCompanyResult,
} from '../../types/companySetup'

interface CompanyMutationScope extends OrganizationQueryScope {
  period: string
}

export function useCompanyMutations({
  organizationId,
  membershipId,
  period,
}: CompanyMutationScope) {
  const queryClient = useQueryClient()
  const scope = { organizationId, membershipId }

  const createCompanyMutation = useMutation({
    mutationFn: async (
      input: CompanySetupInput,
    ): Promise<CreateCompanyResult> => {
      let company: { id: string; name: string } | null = null
      let linkedRoutineCount = 0
      let screenLinked = false
      let screenName: string | undefined

      try {
        const createdCompany = await companyService.create(input.company)
        const client = toClientFromResource(createdCompany.data)
        const createdCompanySummary = { id: client.id, name: client.name }
        company = createdCompanySummary
        upsertClientInOperationalContexts(queryClient, scope, client)

        for (const routineId of input.routineIds) {
          const assignment = await companyService.createRoutineAssignment(
            createdCompanySummary.id,
            {
              routineId,
              startsOn: input.startsOn,
              endsOn: null,
            },
          )
          queryClient.setQueryData(
            queryKeys.companyRoutineAssignments(scope, createdCompanySummary.id),
            (current: ClientRoutineAssignmentResource[] | undefined) =>
              current ? [...current, assignment.data] : current,
          )
          linkedRoutineCount += 1
        }

        if (input.screenId) {
          const screenSnapshot = await screenService.get(input.screenId)

          if (!screenSnapshot.etag) {
            throw new Error(
              'A API nao informou a versao da tela para atualizar sua visualizacao.',
            )
          }

          screenName = screenSnapshot.data.name
          const companyIds = screenSnapshot.data.companies.map(
            (item) => item.id,
          )

          if (!companyIds.includes(createdCompanySummary.id)) {
            const response = await screenService.update(
              input.screenId,
              { companyIds: [...companyIds, createdCompanySummary.id] },
              screenSnapshot.etag,
            )
            upsertScreenInOperationalContexts(queryClient, scope, response.data)
            queryClient.setQueryData(
              queryKeys.screen(scope, input.screenId),
              response,
            )
            void queryClient.invalidateQueries({
              queryKey: queryKeys.screenProjection(
                scope,
                input.screenId,
                period,
              ),
              exact: true,
            })
            void queryClient.invalidateQueries({
              queryKey: queryKeys.agendaProjection(
                scope,
                input.screenId,
                period,
              ),
              exact: true,
            })
          }
          screenLinked = true
        }

        void queryClient.invalidateQueries({
          queryKey: queryKeys.routineControl(scope, period),
          exact: true,
        })

        return { company, linkedRoutineCount, screenName }
      } catch (error) {
        if (!company) throw error

        void queryClient.invalidateQueries({
          queryKey: queryKeys.routineControlRoot(scope),
        })

        const nextStep =
          linkedRoutineCount < input.routineIds.length
            ? 'Abra a empresa e conclua os vinculos de rotina restantes.'
            : input.screenId && !screenLinked
              ? 'Abra a tela escolhida e inclua a empresa na composicao visual.'
              : 'Abra a empresa criada para confirmar a configuracao concluida.'

        throw new CompanySetupError(
          error instanceof Error
            ? error.message
            : 'A sequencia de configuracao da empresa foi interrompida.',
          {
            company,
            linkedRoutineCount,
            requestedRoutineCount: input.routineIds.length,
            screenLinked,
            nextStep,
          },
        )
      }
    },
  })

  const updateCompanyMutation = useMutation({
    mutationFn: async ({
      companyId,
      changes,
    }: {
      companyId: string
      changes: ClientCompanyPatch
    }) => {
      const snapshot = await companyService.get(companyId)

      if (!snapshot.etag) {
        throw new Error(
          'A API nao informou a versao atual da empresa para salvar as alteracoes.',
        )
      }

      let response
      try {
        response = await companyService.update(
          companyId,
          changes,
          snapshot.etag,
        )
      } catch (error) {
        if (isApiError(error) && error.status === 412) {
          const current = await companyService.get(companyId)
          upsertClientInOperationalContexts(
            queryClient,
            scope,
            toClientFromResource(current.data),
          )
          throw new Error(
            'Esta empresa foi alterada por outra pessoa. Os dados mais recentes foram carregados.',
            { cause: error },
          )
        }
        throw error
      }
      const client = toClientFromResource(response.data)
      upsertClientInOperationalContexts(queryClient, scope, client)
      return client
    },
  })

  const archiveCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const snapshot = await companyService.get(companyId)

      if (!snapshot.etag) {
        throw new Error(
          'A API nao informou a versao atual da empresa para arquiva-la.',
        )
      }

      try {
        await companyService.archive(companyId, snapshot.etag)
      } catch (error) {
        if (isApiError(error) && error.status === 412) {
          const current = await companyService.get(companyId)
          upsertClientInOperationalContexts(
            queryClient,
            scope,
            toClientFromResource(current.data),
          )
          throw new Error(
            'Esta empresa foi alterada por outra pessoa. Os dados mais recentes foram carregados.',
            { cause: error },
          )
        }
        throw error
      }
      markClientInactiveInOperationalContexts(queryClient, scope, companyId)
      queryClient.removeQueries({
        queryKey: queryKeys.companyRoutineAssignments(scope, companyId),
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.routineControlRoot(scope),
      })
    },
  })

  return {
    createCompany: createCompanyMutation.mutateAsync,
    updateCompany: useCallback(
      (companyId: string, changes: ClientCompanyPatch) =>
        updateCompanyMutation.mutateAsync({ companyId, changes }),
      [updateCompanyMutation],
    ),
    archiveCompany: archiveCompanyMutation.mutateAsync,
  }
}
