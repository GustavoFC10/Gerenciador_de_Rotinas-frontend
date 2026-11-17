import { useLayoutEffect } from 'react'

const positions = new Map<string, number>()

export function useDirectoryScroll(key: string, ready: boolean) {
  useLayoutEffect(() => {
    if (!ready) return
    const top = positions.get(key) ?? 0
    const remember = () => positions.set(key, window.scrollY)
    window.addEventListener('scroll', remember, { passive: true })
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top, behavior: 'instant' }),
    )
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', remember)
    }
  }, [key, ready])
}
