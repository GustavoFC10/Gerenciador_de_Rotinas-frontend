import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type {
  Notification,
  NotificationTone,
} from '../../contexts/notificationContextDefinition'
import { useNotifications } from '../../hooks/useNotifications'
import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'

const tones: Record<NotificationTone, string> = {
  success: 'border-l-[var(--status-completed-dot)]',
  error: 'border-l-[var(--status-error-dot)]',
  warning: 'border-l-[var(--status-progress-dot)]',
  info: 'border-l-[var(--color-brand)]',
}
const icons: Record<NotificationTone, string> = {
  success:
    'text-[var(--status-completed-text)] bg-[var(--status-completed-bg)]',
  error: 'text-[var(--status-error-text)] bg-[var(--status-error-bg)]',
  warning: 'text-[var(--status-progress-text)] bg-[var(--status-progress-bg)]',
  info: 'text-[var(--color-brand)] bg-[var(--color-brand-soft)]',
}
const priority: Record<NotificationTone, number> = {
  error: 3,
  warning: 2,
  success: 1,
  info: 0,
}

function NotificationViewport() {
  const { notifications, historyOpen } = useNotifications()
  const [modalActive, setModalActive] = useState(false)
  const [uploadsPanelOpen, setUploadsPanelOpen] = useState(false)

  useEffect(() => {
    const update = () => {
      setModalActive(
        Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')),
      )
      setUploadsPanelOpen(
        Boolean(document.querySelector('[data-overlay-dialog="uploads"]')),
      )
    }
    const observer = new MutationObserver(update)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal'],
    })
    update()
    return () => observer.disconnect()
  }, [])

  if (typeof document === 'undefined') return null
  const sorted = [...notifications].sort(
    (left, right) =>
      priority[right.tone] - priority[left.tone] ||
      left.createdAt - right.createdAt,
  )
  const suppressed = uploadsPanelOpen
    ? sorted.filter((item) => item.category === 'uploads')
    : []
  const visible = sorted
    .filter((item) => !uploadsPanelOpen || item.category !== 'uploads')
    .slice(0, 2)

  return createPortal(
    <>
      <div
        className="pointer-events-none fixed right-4 bottom-4 left-4 z-[150] flex flex-col gap-2 sm:left-auto sm:w-[22rem]"
        aria-label="Avisos recentes"
      >
        {[...visible, ...suppressed].map((notification) => (
          <NotificationToast
            key={`${notification.id}:${notification.revision}`}
            notification={notification}
            interactive={!modalActive}
            suppressed={uploadsPanelOpen && notification.category === 'uploads'}
          />
        ))}
      </div>
      {historyOpen && <NotificationHistory />}
    </>,
    document.body,
  )
}

function NotificationToast({
  notification,
  interactive,
  suppressed,
}: {
  notification: Notification
  interactive: boolean
  suppressed: boolean
}) {
  const { dismiss, openHistory } = useNotifications()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(
    () => document.visibilityState === 'hidden',
  )
  const remaining = useRef(
    notification.duration ??
      (notification.tone === 'error' || notification.tone === 'warning'
        ? 8000
        : 4000),
  )

  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    if (
      hovered ||
      focused ||
      hidden ||
      suppressed ||
      notification.duration === 0
    )
      return
    const started = Date.now()
    const timer = window.setTimeout(
      () => dismiss(notification.id),
      Math.max(0, remaining.current),
    )
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [
    dismiss,
    notification.id,
    notification.duration,
    hovered,
    focused,
    hidden,
    suppressed,
  ])

  const recoverable =
    notification.tone === 'error' || notification.tone === 'warning'

  return (
    <div
      role={notification.tone === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      aria-hidden={suppressed || undefined}
      className={`${interactive ? 'pointer-events-auto' : 'pointer-events-none'} ${suppressed ? 'hidden' : 'flex'} items-start gap-2.5 rounded-[var(--radius-panel)] border border-l-[3px] border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-3 shadow-[var(--shadow-floating)] ${tones[notification.tone]}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false)
      }}
    >
      <NotificationIcon tone={notification.tone} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-xs font-extrabold leading-5 text-[var(--color-text-strong)]">
          {notification.title}
        </p>
        {notification.message && (
          <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-[var(--color-text-muted)]">
            {notification.message}
          </p>
        )}
        {interactive && (notification.action || recoverable) && (
          <button
            type="button"
            onClick={() => {
              if (notification.action) notification.action.onClick()
              else openHistory()
              dismiss(notification.id)
            }}
            className="mt-1 text-xs font-bold text-[var(--color-brand)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--color-control-focus)]"
          >
            {notification.action?.label ?? 'Ver detalhes'}
          </button>
        )}
      </div>
      {interactive && (
        <IconButton
          label="Fechar aviso"
          tone="ghost"
          className="-mt-1 -mr-1 size-7 shrink-0"
          onClick={() => dismiss(notification.id)}
        >
          <CloseIcon />
        </IconButton>
      )}
    </div>
  )
}

function NotificationHistory() {
  const { history, activities, closeHistory, removeHistory } =
    useNotifications()
  const panelRef = useRef<HTMLElement>(null)
  useOverlayDialog(panelRef, closeHistory)

  return (
    <div
      className="fixed inset-0 z-[160] flex justify-end bg-[var(--color-overlay-bg)] backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeHistory()
      }}
    >
      <section
        ref={panelRef}
        id="notification-history"
        data-overlay-dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-history-title"
        tabIndex={-1}
        className="flex h-dvh w-full max-w-md flex-col border-l border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)] outline-none"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] px-5 py-4">
          <div>
            <h2
              id="notification-history-title"
              className="text-base font-black text-[var(--color-text-strong)]"
            >
              Avisos
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Atenções e falhas desta sessão.
            </p>
          </div>
          <IconButton
            label="Fechar painel de avisos"
            data-overlay-close
            tone="ghost"
            onClick={closeHistory}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
          {Object.entries(activities).map(([id, label]) => (
            <p
              key={id}
              role="status"
              className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]"
            >
              <span
                aria-hidden="true"
                className="size-3 animate-spin rounded-full border-2 border-[var(--color-divider)] border-t-[var(--color-brand)] motion-reduce:animate-none"
              />
              {label}
            </p>
          ))}
          {history.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
              Nenhum aviso precisa de atenção.
            </p>
          )}
          {history.map((item) => (
            <article
              key={item.id}
              className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-3"
            >
              <div className="flex items-start gap-2.5">
                <NotificationIcon tone={item.tone} />
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-bold text-[var(--color-text-strong)]">
                    {item.title}
                  </h3>
                  {item.message && (
                    <p className="mt-1 break-words text-xs leading-5 text-[var(--color-text-muted)]">
                      {item.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {item.action && (
                  <Button
                    size="sm"
                    onClick={() => {
                      closeHistory()
                      item.action?.onClick()
                    }}
                  >
                    {item.action.label}
                  </Button>
                )}
                <Button
                  size="sm"
                  tone="ghost"
                  onClick={() => removeHistory(item.id)}
                >
                  Dispensar
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function NotificationIcon({ tone }: { tone: NotificationTone }) {
  return (
    <span
      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${icons[tone]}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {tone === 'success' ? (
          <path d="m5 12 4 4L19 6" />
        ) : (
          <>
            <path d="M12 7v6" />
            <circle cx="12" cy="17" r=".5" fill="currentColor" />
          </>
        )}
      </svg>
    </span>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  )
}

export default NotificationViewport
