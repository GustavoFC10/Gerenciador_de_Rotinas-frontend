import { QueryClient } from '@tanstack/react-query'

import { isApiError } from '../services/httpClient'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status < 500) return false

        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
