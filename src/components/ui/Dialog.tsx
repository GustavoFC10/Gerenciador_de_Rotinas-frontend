import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import IconButton from './IconButton'
import './dialog.css'

export interface DialogProps {
  open: boolean
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function DialogContent({
  title,
  description,
  children,
  footer,
  onClose,
  size = 'md',
  className = '',
}: Omit<DialogProps, 'open'>) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useOverlayDialog(ref, onClose)

  return createPortal(
    <div
      className="ui-dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-overlay-dialog
        className={`ui-dialog ui-dialog--${size} ${className}`}
      >
        <header className="ui-dialog-header">
          <div className="min-w-0">
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <IconButton
            label="Fechar diálogo"
            onClick={onClose}
            data-overlay-close
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </IconButton>
        </header>
        <div className="ui-dialog-body">{children}</div>
        {footer && <footer className="ui-dialog-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export default function Dialog({ open, ...props }: DialogProps) {
  if (!open || typeof document === 'undefined') return null
  return <DialogContent {...props} />
}
