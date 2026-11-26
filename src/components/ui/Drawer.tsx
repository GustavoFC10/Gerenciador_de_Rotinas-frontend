import {
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import NavigationIcon from '../common/NavigationIcon'
import IconButton from './IconButton'
import './drawer.css'

type DrawerHeading =
  | {
      title: ReactNode
      titleId?: string
      description?: ReactNode
      closeLabel?: string
      ariaLabelledBy?: never
    }
  | {
      ariaLabelledBy: string
      title?: never
      titleId?: never
      description?: never
      closeLabel?: never
    }

type DrawerPanelProps = Pick<
  ComponentPropsWithoutRef<'aside'>,
  'id' | 'aria-busy' | 'aria-describedby'
> & { [attribute: `data-${string}`]: string | number | boolean | undefined }

export type DrawerProps = DrawerHeading & {
  open: boolean
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  closeDisabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  bodyClassName?: string
  footerClassName?: string
  overlayClassName?: string
  overlayId?: string
  panelProps?: DrawerPanelProps
}

function DrawerContent({
  title,
  titleId,
  description,
  ariaLabelledBy,
  children,
  footer,
  onClose,
  closeDisabled = false,
  closeLabel = 'Fechar painel',
  size = 'md',
  className = '',
  bodyClassName = '',
  footerClassName = '',
  overlayClassName = '',
  overlayId = '',
  panelProps,
}: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const generatedTitleId = useId()
  const descriptionId = useId()
  const headingId = titleId ?? generatedTitleId

  function close() {
    if (!closeDisabled) onClose()
  }

  useOverlayDialog(panelRef, close)

  return createPortal(
    <div
      className={`ui-drawer-overlay ${overlayClassName}`}
      data-overlay-dialog={overlayId}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <aside
        {...panelProps}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy ?? headingId}
        aria-describedby={
          description ? descriptionId : panelProps?.['aria-describedby']
        }
        tabIndex={-1}
        className={`ui-drawer ui-drawer--${size} ${className}`}
      >
        {!ariaLabelledBy && (
          <header className="ui-drawer-header">
            <div className="min-w-0">
              <h2 id={headingId} className="ui-drawer-title">
                {title}
              </h2>
              {description && (
                <div id={descriptionId} className="ui-drawer-description">
                  {description}
                </div>
              )}
            </div>
            <IconButton
              label={closeLabel}
              tone="ghost"
              onClick={close}
              disabled={closeDisabled}
              data-overlay-close
            >
              <NavigationIcon name="close" className="size-[18px]" />
            </IconButton>
          </header>
        )}
        <div className={`ui-drawer-body ${bodyClassName}`}>{children}</div>
        {footer && (
          <footer className={`ui-drawer-footer ${footerClassName}`}>
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  )
}

export default function Drawer(props: DrawerProps) {
  if (!props.open || typeof document === 'undefined') return null
  return <DrawerContent {...props} />
}
