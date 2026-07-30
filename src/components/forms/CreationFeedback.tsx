import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

import Button from '../ui/Button'
import Card from '../ui/Card'

export function CreationErrorSummary({
  title = 'Revise os campos destacados',
  messages,
}: {
  title?: string
  messages: string[]
}) {
  const summaryRef = useRef<HTMLDivElement>(null)
  const uniqueMessages = [...new Set(messages)]
  const messageSignature = uniqueMessages.join('\u0000')

  useEffect(() => {
    if (!messageSignature) return

    const frame = window.requestAnimationFrame(() =>
      summaryRef.current?.focus(),
    )

    return () => window.cancelAnimationFrame(frame)
  }, [messageSignature])

  if (uniqueMessages.length === 0) return null

  return (
    <div
      ref={summaryRef}
      className="rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4 text-[var(--status-error-text)]"
      role="alert"
      tabIndex={-1}
    >
      <p className="text-sm font-black">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {uniqueMessages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  )
}

export function FieldError({
  id,
  children,
}: {
  id: string
  children?: string
}) {
  if (!children) return null

  return (
    <p
      id={id}
      className="mt-1.5 text-sm font-semibold text-[var(--status-error-text)]"
    >
      {children}
    </p>
  )
}

interface CreationSuccessProps {
  eyebrow: string
  title: string
  description: string
  detail?: string
  primaryAction?: {
    label: string
    to: string
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function CreationSuccess({
  eyebrow,
  title,
  description,
  detail,
  primaryAction,
  secondaryAction,
}: CreationSuccessProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <div role="status" aria-live="polite">
      <Card className="mx-auto w-full max-w-3xl">
        <div className="border-b border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] px-5 py-5 sm:px-7">
          <span className="grid size-10 place-items-center rounded-full bg-[var(--status-completed-strong-bg)] text-[var(--status-completed-strong-text)]">
            <SuccessIcon />
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-[var(--status-completed-text)]">
            {eyebrow}
          </p>
          <h2
            ref={titleRef}
            className="mt-1 text-xl font-black text-[var(--color-text-strong)] focus:outline-none"
            tabIndex={-1}
          >
            {title}
          </h2>
        </div>
        <div className="px-5 py-5 sm:px-7">
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            {description}
          </p>
          {detail && (
            <p className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] px-3 py-2 text-sm font-semibold text-[var(--color-text-strong)]">
              {detail}
            </p>
          )}
          {(primaryAction || secondaryAction) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {primaryAction && (
                <Link
                  to={primaryAction.to}
                  className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 text-sm font-bold text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
                >
                  {primaryAction.label}
                </Link>
              )}
              {secondaryAction && (
                <Button tone="neutral" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function SuccessIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}
