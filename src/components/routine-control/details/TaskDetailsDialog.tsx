import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { Task } from '../../../types/domain'
import RoutineDetailsCard, {
  type RoutineDetailsCardProps,
} from './RoutineDetailsCard'

interface TaskDetailsDialogProps extends Omit<
  RoutineDetailsCardProps,
  'task' | 'onClose'
> {
  task: Task
  onClose: () => void
}

function TaskDetailsDialog({
  task,
  onClose,
  ...cardProps
}: TaskDetailsDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    const dialogElement: HTMLDivElement = dialog

    const applicationRoot = document.getElementById('root')
    const previousOverflow = document.body.style.overflow
    const previousAriaHidden =
      applicationRoot?.getAttribute('aria-hidden') ?? null
    const previousInert = applicationRoot?.inert
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const focusableSelector = [
      'button:not([disabled])',
      'select:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'summary',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    function getFocusableElements(): HTMLElement[] {
      return [
        ...dialogElement.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter(
        (element) =>
          element.getClientRects().length > 0 &&
          (!element.matches('input[type="radio"]') ||
            !(element instanceof HTMLInputElement) ||
            element.checked),
      )
    }

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialogElement.focus()
        return
      }

      const firstElement = focusableElements[0]!
      const lastElement = focusableElements.at(-1)!

      if (!dialogElement.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? lastElement : firstElement).focus()
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    const initialFocus =
      dialogElement.querySelector<HTMLElement>('[data-dialog-close]') ??
      getFocusableElements()[0] ??
      dialogElement

    document.body.style.overflow = 'hidden'
    if (applicationRoot) {
      applicationRoot.inert = true
      applicationRoot.setAttribute('aria-hidden', 'true')
    }
    initialFocus.focus()
    document.addEventListener('keydown', handleDialogKeyDown)

    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown)
      document.body.style.overflow = previousOverflow
      if (applicationRoot) {
        applicationRoot.inert = previousInert ?? false
        if (previousAriaHidden === null) {
          applicationRoot.removeAttribute('aria-hidden')
        } else {
          applicationRoot.setAttribute('aria-hidden', previousAriaHidden)
        }
      }
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus()
    }
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--color-overlay-bg)] p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-[var(--radius-panel)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`routine-details-title-${task.id}`}
        tabIndex={-1}
      >
        <RoutineDetailsCard task={task} {...cardProps} onClose={onClose} />
      </div>
    </div>,
    document.body,
  )
}

export default TaskDetailsDialog
