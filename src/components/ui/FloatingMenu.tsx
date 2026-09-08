import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

interface FloatingMenuProps {
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
  className?: string
  id?: string
  isOpen: boolean
  onDismiss: () => void
  align?: 'start' | 'end'
  ariaLabel?: string
}

interface FloatingPosition {
  left: number
  top: number
}

const viewportMargin = 8
const anchorGap = 4

function FloatingMenu({
  anchorRef,
  children,
  className = '',
  id,
  isOpen,
  onDismiss,
  align = 'end',
  ariaLabel,
}: FloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<FloatingPosition | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setPosition(null)
      return undefined
    }

    function updatePosition() {
      const anchor = anchorRef.current
      const menu = menuRef.current
      if (!anchor || !menu) return

      const anchorBounds = anchor.getBoundingClientRect()
      const menuBounds = menu.getBoundingClientRect()
      const maxLeft = Math.max(
        viewportMargin,
        window.innerWidth - menuBounds.width - viewportMargin,
      )
      const preferredLeft =
        align === 'end'
          ? anchorBounds.right - menuBounds.width
          : anchorBounds.left
      const left = clamp(preferredLeft, viewportMargin, maxLeft)
      const belowTop = anchorBounds.bottom + anchorGap
      const aboveTop = anchorBounds.top - menuBounds.height - anchorGap
      const maxTop = Math.max(
        viewportMargin,
        window.innerHeight - menuBounds.height - viewportMargin,
      )
      const top =
        belowTop + menuBounds.height <= window.innerHeight - viewportMargin ||
        aboveTop < viewportMargin
          ? clamp(belowTop, viewportMargin, maxTop)
          : clamp(aboveTop, viewportMargin, maxTop)

      setPosition({ left, top })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updatePosition)
    if (resizeObserver) {
      if (anchorRef.current) resizeObserver.observe(anchorRef.current)
      if (menuRef.current) resizeObserver.observe(menuRef.current)
    }

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      resizeObserver?.disconnect()
    }
  }, [align, anchorRef, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return

      if (
        menuRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return
      }

      onDismiss()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return

      event.preventDefault()
      onDismiss()
      window.requestAnimationFrame(() => anchorRef.current?.focus())
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchorRef, isOpen, onDismiss])

  if (!isOpen || typeof document === 'undefined') return null

  const style: CSSProperties = position
    ? { left: position.left, top: position.top }
    : { left: 0, top: 0, visibility: 'hidden' }

  return createPortal(
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={ariaLabel}
      className={`fixed z-[130] max-h-[calc(100dvh-1rem)] overflow-y-auto ${className}`}
      style={style}
      data-floating-menu
    >
      {children}
    </div>,
    document.body,
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export default FloatingMenu
