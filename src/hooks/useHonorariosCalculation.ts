import { useEffect, useState } from 'react'
import { honorariosService } from '../services/honorariosService'
import type {
  HonorariosCalculateResponse,
  HonorariosProfile,
} from '../types/honorarios'

/** Both cancellation and input identity protect against responses from an older profile. */
export function useHonorariosCalculation(
  profile: HonorariosProfile,
  paramsVersion: number,
  onDenied?: (error: unknown) => void,
) {
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([profile, paramsVersion, attempt])
  const [result, setResult] = useState<{
    key: string
    data?: HonorariosCalculateResponse
    error?: unknown
  } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void honorariosService
        .calculate(profile, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setResult({ key, data })
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            setResult({ key, error })
            onDenied?.(error)
          }
        })
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [profile, paramsVersion, key, onDenied])
  const current = result?.key === key ? result : null
  return {
    data: current?.data,
    error: current?.error,
    isPending: !current,
    retry: () => setAttempt((previous) => previous + 1),
  }
}
