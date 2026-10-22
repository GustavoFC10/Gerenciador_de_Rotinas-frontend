import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { moduleService } from '../services/moduleService'
import { queryKeys } from '../query/queryKeys'
import type { AppModule } from '../types/modules'
import { useAuth } from './useAuth'

export function useModuleAccess() {
  const { activeMembership, refreshSession } = useAuth()
  const queryClient = useQueryClient()
  const refreshedPermissions = useRef('')
  const scope = activeMembership
    ? {
        organizationId: activeMembership.organization.id,
        membershipId: activeMembership.id,
      }
    : null
  const query = useQuery({
    queryKey: scope
      ? [...queryKeys.scope(scope), 'module-permissions']
      : ['module-permissions', 'unauthenticated'],
    queryFn: ({ signal }) => moduleService.permissions(signal),
    enabled: Boolean(scope),
    initialData: activeMembership?.modules
      ? { modules: activeMembership.modules }
      : undefined,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  const modules = query.data?.modules ?? []
  const permissionsFingerprint = query.data
    ? `${activeMembership?.id}:${JSON.stringify(query.data.modules)}`
    : ''
  const membershipFingerprint = activeMembership
    ? `${activeMembership.id}:${JSON.stringify(activeMembership.modules)}`
    : ''

  useEffect(() => {
    if (
      !permissionsFingerprint ||
      permissionsFingerprint === membershipFingerprint ||
      refreshedPermissions.current === permissionsFingerprint
    )
      return
    refreshedPermissions.current = permissionsFingerprint
    // Respostas anteriores podem conter valores que o novo acesso já não permite.
    if (activeMembership) {
      void queryClient.resetQueries({
        queryKey: [
          ...queryKeys.scope({
            organizationId: activeMembership.organization.id,
            membershipId: activeMembership.id,
          }),
          'processes',
        ],
      })
    }
    void refreshSession().catch(() => {
      refreshedPermissions.current = ''
    })
  }, [
    permissionsFingerprint,
    membershipFingerprint,
    refreshSession,
    activeMembership,
    queryClient,
  ])

  return {
    modules,
    getModule: (module: AppModule) =>
      modules.find((item) => item.module === module),
    canAccessModule: (module: AppModule) =>
      modules.some((item) => item.module === module),
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
