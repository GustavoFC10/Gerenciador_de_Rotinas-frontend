import { useCallback, useEffect, useState } from 'react'

import { getRoutineControl } from '../services/routineControlService'
import type { RoutineControlResponse } from '../types/domain'

export function useRoutineControl(period: string) {
  const [response, setResponse] = useState<RoutineControlResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)

    try {
      const nextResponse = await getRoutineControl({ period })
      setResponse(nextResponse)
      setError(null)
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError
          : new Error('Não foi possível carregar os dados.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    response,
    setResponse,
    data: response?.data ?? null,
    isLoading,
    error,
    reload,
  }
}
