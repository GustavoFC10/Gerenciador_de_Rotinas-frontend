import { useQuery } from '@tanstack/react-query'

import { queryKeys, type OrganizationQueryScope } from '../query/queryKeys'
import { screenService } from '../services/screenService'

/**
 * Catálogo de telas usado exclusivamente pela sidebar. Não depende da
 * competência, pois telas são configurações de navegação do vínculo ativo.
 */
export function useNavigationScreens(scope: OrganizationQueryScope) {
  return useQuery({
    queryKey: queryKeys.navigationScreens(scope),
    queryFn: ({ signal }) => screenService.listVisible(signal),
  })
}
