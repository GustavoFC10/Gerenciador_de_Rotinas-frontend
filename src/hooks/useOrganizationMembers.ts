import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../query/queryKeys'
import {
  organizationMemberService,
  type OrganizationMemberResource,
} from '../services/organizationMemberService'
import { useAuth } from './useAuth'

export function useOrganizationMembers() {
  const { activeMembership } = useAuth()
  const queryClient = useQueryClient()
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
    queryKey: scope ? queryKeys.members(scope) : ['members', 'unauthenticated'],
    queryFn: () => organizationMemberService.listAll(),
    enabled: Boolean(scope),
  })

  const replaceMember = useCallback(
    (member: OrganizationMemberResource) => {
      if (!scope) return

      queryClient.setQueryData<OrganizationMemberResource[]>(
        queryKeys.members(scope),
        (current) => {
          if (!current) return current

          const exists = current.some((item) => item.id === member.id)
          return exists
            ? current.map((item) => (item.id === member.id ? member : item))
            : [...current, member]
        },
      )
      queryClient.setQueryData(queryKeys.member(scope, member.id), member)
    },
    [queryClient, scope],
  )

  return {
    members: query.data ?? [],
    isInitialLoading: query.isPending && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    error: query.error,
    reloadMembers: query.refetch,
    replaceMember,
    scope,
  }
}
