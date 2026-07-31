import type { ReactNode } from 'react'

export function HomeProgressBar({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-[var(--color-panel-soft-bg)] ring-1 ring-inset ring-[var(--color-panel-border)]"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span
        className="block h-full rounded-full bg-[var(--color-brand)]"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function HomeSummaryMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'error' | 'progress' | 'neutral'
}) {
  const toneClass =
    tone === 'error'
      ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)]'
      : tone === 'progress'
        ? 'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)]'
        : 'border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)]'
  const valueClass =
    tone === 'error'
      ? 'text-[var(--status-error-text)]'
      : tone === 'progress'
        ? 'text-[var(--status-progress-text)]'
        : 'text-[var(--color-text-strong)]'

  return (
    <div className={`rounded-[var(--radius-control)] border p-3 ${toneClass}`}>
      <dt className="text-xs font-semibold text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className={`mt-1 text-xl font-black ${valueClass}`}>{value}</dd>
    </div>
  )
}

export function HomeSectionHeading({
  title,
  titleId,
  description,
  meta,
}: {
  title: string
  titleId: string
  description: string
  meta?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2
          id={titleId}
          className="text-lg font-extrabold text-[var(--color-text-strong)]"
        >
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
      {meta}
    </div>
  )
}

export type HomeIconName =
  'alert' | 'arrow' | 'check' | 'people' | 'spreadsheet' | 'tasks'

export function HomeIcon({
  name,
  className,
}: {
  name: HomeIconName
  className?: string
}) {
  const commonProps = {
    viewBox: '0 0 24 24',
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (name === 'spreadsheet') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18M15 9v12M9 15h12" />
      </svg>
    )
  }

  if (name === 'alert') {
    return (
      <svg {...commonProps}>
        <path d="M12 3 22 20H2L12 3Z" />
        <path d="M12 9v5M12 17h.01" strokeWidth="2.2" />
      </svg>
    )
  }

  if (name === 'check') {
    return (
      <svg {...commonProps}>
        <path d="m5 12.5 4.2 4.2L19 7" strokeWidth="2.2" />
      </svg>
    )
  }

  if (name === 'people') {
    return (
      <svg {...commonProps}>
        <path d="M15 20v-1.5A3.5 3.5 0 0 0 11.5 15h-5A3.5 3.5 0 0 0 3 18.5V20" />
        <circle cx="9" cy="8" r="3.5" />
        <path d="M16 11a3 3 0 1 0 0-6M21 20v-1.5a3.5 3.5 0 0 0-2.6-3.38" />
      </svg>
    )
  }

  if (name === 'tasks') {
    return (
      <svg {...commonProps}>
        <path d="M9 6h11M9 12h11M9 18h7" />
        <path d="m3.5 6 1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
