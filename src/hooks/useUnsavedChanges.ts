import { useEffect } from 'react'

export function confirmDiscard(dirty: boolean) {
  return !dirty || window.confirm('Descartar alterações não salvas?')
}

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    function beforeNavigate(event: MouseEvent) {
      if (!(event.target instanceof Element)) return
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]')
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        anchor.href === window.location.href
      )
        return
      if (!confirmDiscard(true)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', beforeNavigate, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', beforeNavigate, true)
    }
  }, [dirty])
}
