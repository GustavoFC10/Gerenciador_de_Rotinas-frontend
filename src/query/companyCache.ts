import type { QueryClient } from '@tanstack/react-query'

import { queryKeys, type OrganizationQueryScope } from './queryKeys'

export async function invalidateCompanyQueries(
  client: QueryClient,
  scope: OrganizationQueryScope,
) {
  await Promise.all(
    [
      queryKeys.companies(scope),
      queryKeys.routineControlRoot(scope),
      queryKeys.archivedCompanies(scope),
      queryKeys.honorarios(scope),
    ].map((queryKey) => client.invalidateQueries({ queryKey })),
  )
}
