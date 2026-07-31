import { useEffect, useState } from 'react'

import { getRoutineControl } from '../services/routineControlService'
import type { RoutineControlResponse } from '../types/domain'

export function useRoutineControl() {
  const [response, setResponse] = useState<RoutineControlResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    getRoutineControl()
      .then((data) => {
        if (isMounted) {
          setResponse(data)
          setError(null)
        }
      })
      .catch((currentError: unknown) => {
        if (isMounted) {
          setError(
            currentError instanceof Error
              ? currentError
              : new Error('Unknown routine-control error'),
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return {
    response,
    setResponse,
    data: response?.data ?? null,
    isLoading,
    error,
  }
}
