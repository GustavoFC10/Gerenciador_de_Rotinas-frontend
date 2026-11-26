import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import './navigationDrawer.css'

const desktopMediaQuery = '(min-width: 1024px)'

interface NavigationDrawerProps {
  id: string
  label: string
  open: boolean
  onClose: () => void
  returnFocusRef: RefObject<HTMLElement | null>
  className?: string
  children: ReactNode
}

/** The persistent desktop sidebar becomes a modal only while open on mobile. */
export default function NavigationDrawer({
  id,
  label,
  open,
  onClose,
  returnFocusRef,
  className,
  children,
}: NavigationDrawerProps) {
  const ref = useRef<HTMLElement>(null)
  useOverlayDialog(ref, onClose, {
    active: open,
    lockRoot: false,
    returnFocusRef,
  })

  useEffect(() => {
    if (!open) return

    const media = window.matchMedia(desktopMediaQuery)
    function handleDesktop(event: MediaQueryListEvent) {
      if (event.matches) onClose()
    }

    media.addEventListener('change', handleDesktop)
    return () => media.removeEventListener('change', handleDesktop)
  }, [open, onClose])

  return (
    <>
      {open && (
        <div
          className="ui-navigation-drawer-scrim"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        id={id}
        ref={ref}
        className={`ui-navigation-drawer ${className ?? ''}`}
        tabIndex={-1}
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label={label}
        data-open={open || undefined}
        data-overlay-dialog={open ? 'navigation' : undefined}
      >
        {children}
      </aside>
    </>
  )
}
