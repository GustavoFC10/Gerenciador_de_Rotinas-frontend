import { useEffect, useState } from 'react'

import { getRoutineControl } from '../services/routineControlService.js'

export function useRoutineControl() {
  const [response, setResponse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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
      .catch((currentError) => {
        if (isMounted) {
          setError(currentError)
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
