import { useCallback, useEffect, useState } from 'react'

import {
  organizationMemberService,
  type OrganizationMemberResource,
} from '../services/organizationMemberService'

export function useOrganizationMembers() {
  const [members, setMembers] = useState<OrganizationMemberResource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)

    try {
      const nextMembers = await organizationMemberService.listAll()
      setMembers(nextMembers)
      setError(null)
    } catch (caughtError) {
      setError(caughtError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { members, isLoading, error, reload }
}
