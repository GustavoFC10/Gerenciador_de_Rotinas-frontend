import { useEffect, useRef, type RefObject } from 'react'

/** A user-opened overlay temporarily owns focus, including above a task dialog. */
export function useOverlayDialog(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const dialog: HTMLElement = element
    const returnTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const root = document.getElementById('root')
    const previousInert = root?.inert ?? false
    const previousOverflow = document.body.style.overflow
    const otherDialogs = [
      ...document.querySelectorAll<HTMLElement>(
        '[role="dialog"][aria-modal="true"]',
      ),
    ]
      .filter((element) => element !== dialog && !element.contains(dialog))
      .map((element) => ({ element, inert: element.inert }))
    if (root) root.inert = true
    otherDialogs.forEach(({ element }) => {
      element.inert = true
    })
    document.body.style.overflow = 'hidden'
    const focusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (element) =>
          !element.closest('[hidden],[inert]') &&
          element.getClientRects().length > 0,
      )
    ;(
      dialog.querySelector<HTMLElement>('[data-overlay-close]') ?? dialog
    ).focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeRef.current()
      } else if (event.key === 'Tab') {
        const items = focusable()
        const first = items[0] ?? dialog
        const last = items.at(-1) ?? dialog
        if (
          !dialog.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)
        ) {
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        }
        event.stopImmediatePropagation()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (root) root.inert = previousInert
      otherDialogs.forEach(({ element, inert }) => {
        element.inert = inert
      })
      if (returnTarget?.isConnected && !returnTarget.closest('[inert]'))
        returnTarget.focus()
    }
  }, [ref])
}
