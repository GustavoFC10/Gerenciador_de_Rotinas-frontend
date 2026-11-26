import {
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import Button from './Button'
import './confirmation.css'
import './inline-confirmation.css'

interface InlineConfirmationProps {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  error?: ReactNode
  intent?: 'neutral' | 'warning' | 'destructive'
  cancelLabel: string
  confirmLabel: string
  pendingLabel?: string
  pending?: boolean
  confirmDisabled?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
  onCancel: () => void
  onConfirm: () => void
}

export default function InlineConfirmation({
  title,
  description,
  children,
  error,
  intent = 'neutral',
  cancelLabel,
  confirmLabel,
  pendingLabel = 'Confirmando…',
  pending = false,
  confirmDisabled = false,
  returnFocusRef,
  onCancel,
  onConfirm,
}: InlineConfirmationProps) {
  const titleId = useId()
  const descriptionId = useId()
  const regionRef = useRef<HTMLElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const region = regionRef.current
    const origin = returnFocusRef?.current ?? document.activeElement
    const cancel = actionsRef.current?.querySelector('button')
    if (cancel && !cancel.disabled) cancel.focus({ preventScroll: true })
    else region?.focus({ preventScroll: true })

    return () => {
      const active = document.activeElement
      if (!(origin instanceof HTMLElement)) return
      if (active !== document.body && !region?.contains(active)) return

      // Run after the caller has revealed the original action again.
      queueMicrotask(() => {
        if (origin.isConnected && document.activeElement === document.body) {
          origin.focus({ preventScroll: true })
        }
      })
    }
  }, [returnFocusRef])

  return (
    <section
      ref={regionRef}
      className="ui-inline-confirmation"
      data-intent={intent}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={pending || undefined}
      tabIndex={-1}
    >
      <div>
        <p className="ui-inline-confirmation-title" id={titleId}>
          {title}
        </p>
        {description && (
          <p className="ui-inline-confirmation-description" id={descriptionId}>
            {description}
          </p>
        )}
      </div>
      {children}
      {error && (
        <p className="ui-inline-confirmation-error" role="alert">
          {error}
        </p>
      )}
      <div ref={actionsRef} className="ui-inline-confirmation-actions">
        <Button size="sm" disabled={pending} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          size="sm"
          tone={intent === 'neutral' ? 'primary' : 'neutral'}
          data-confirmation-intent={intent}
          disabled={pending || confirmDisabled}
          onClick={onConfirm}
        >
          {pending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </section>
  )
}
