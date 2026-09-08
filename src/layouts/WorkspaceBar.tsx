import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { appThemeClass, focusRing } from '../constants/designTokens'

interface WorkspaceContext {
  label: string
  to?: string
  onBack?: () => void
}

interface WorkspaceBarProps {
  title: string
  context?: WorkspaceContext
  label?: string
  meta?: ReactNode
  actions?: ReactNode
}

function WorkspaceBar({
  title,
  context,
  label,
  meta,
  actions,
}: WorkspaceBarProps) {
  return (
    <header className="mb-4 flex min-h-12 flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {(context || label) && (
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
            {context &&
              (context.onBack ? (
                <button
                  type="button"
                  onClick={context.onBack}
                  className={`inline-flex items-center gap-1 rounded-sm text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] ${focusRing}`}
                >
                  <BackIcon />
                  {context.label}
                </button>
              ) : context.to ? (
                <Link
                  to={context.to}
                  className={`inline-flex items-center gap-1 rounded-sm text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] ${focusRing}`}
                >
                  <BackIcon />
                  {context.label}
                </Link>
              ) : (
                <span className={appThemeClass.mutedText}>{context.label}</span>
              ))}
            {context && label && (
              <span
                className="text-[var(--color-text-subtle)]"
                aria-hidden="true"
              >
                /
              </span>
            )}
            {label && (
              <span className="text-[var(--color-text-muted)]">{label}</span>
            )}
          </div>
        )}
        <h1
          className={`truncate text-xl font-extrabold leading-7 tracking-tight sm:text-2xl ${appThemeClass.strongText}`}
          aria-label={label ? `${label} ${title}` : undefined}
        >
          {title}
        </h1>
      </div>

      {(meta || actions) && (
        <div className="flex flex-wrap items-center gap-3">
          {meta && (
            <div className="text-sm font-medium text-[var(--color-text-muted)]">
              {meta}
            </div>
          )}
          {actions}
        </div>
      )}
    </header>
  )
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export default WorkspaceBar
