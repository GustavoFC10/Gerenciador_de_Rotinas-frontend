import { useRef, useState, type ReactNode } from 'react'
import { getErrorPresentation, type ErrorPresentation } from '../../utils/apiErrors'
import Button from './Button'
import Dialog from './Dialog'
import './confirmation.css'

interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  description?: ReactNode
  cancelLabel?: string
  confirmLabel: string
  pendingLabel?: string
  errorFallback?: string
  intent?: 'neutral' | 'warning' | 'destructive'
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

function ConfirmDialogContent({
  title,
  description,
  cancelLabel = 'Cancelar',
  confirmLabel,
  pendingLabel = 'Aguarde…',
  errorFallback = 'Não foi possível concluir a operação. Tente novamente.',
  intent = 'neutral',
  onClose,
  onConfirm,
}: Omit<ConfirmDialogProps, 'open'>) {
  const running = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ErrorPresentation | null>(null)

  async function confirm() {
    if (running.current) return
    running.current = true
    setPending(true)
    setError(null)
    try {
      await onConfirm()
    } catch (caught) {
      setError(getErrorPresentation(caught, errorFallback))
      return
    } finally {
      running.current = false
      setPending(false)
    }
    onClose()
  }

  function close() {
    if (!running.current) onClose()
  }

  return (
    <Dialog
      open
      size="sm"
      title={title}
      description={description}
      showCloseButton={false}
      closeOnBackdrop={false}
      closeDisabled={pending}
      onClose={close}
      footer={
        <>
          <Button onClick={close} disabled={pending} data-overlay-initial-focus>
            {cancelLabel}
          </Button>
          <Button
            tone={intent === 'neutral' ? 'primary' : 'neutral'}
            data-confirmation-intent={intent}
            onClick={() => void confirm()}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
          {pending && <span className="sr-only" role="status">{pendingLabel}</span>}
        </>
      }
    >
      {error && (
        <div className="text-sm text-[var(--status-error-text)]" role="alert">
          <p>{error.message}</p>
          {error.supportReference && <p>{error.supportReference}</p>}
        </div>
      )}
    </Dialog>
  )
}

export default function ConfirmDialog({ open, ...props }: ConfirmDialogProps) {
  return open ? <ConfirmDialogContent {...props} /> : null
}
