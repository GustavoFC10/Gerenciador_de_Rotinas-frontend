import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { focusRing } from '../../constants/designTokens'

interface CatalogListProps {
  title: string
  countLabel: string
  resultLabel: string
  searchLabel: string
  searchPlaceholder: string
  searchValue: string
  onSearchChange: (value: string) => void
  action?: ReactNode
  children: ReactNode
}

export function CatalogList({
  title,
  countLabel,
  resultLabel,
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  action,
  children,
}: CatalogListProps) {
  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <header className="mb-4 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--color-text-strong)] sm:text-2xl">
            {title}
          </h1>
          <span className="text-sm font-semibold text-[var(--color-text-muted)]">
            {countLabel}
          </span>
        </div>
        {action}
      </header>

      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-list-border)] bg-[var(--color-list-bg)] p-3 sm:px-4">
          <CatalogSearchField
            label={searchLabel}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
          <span
            className="ml-auto whitespace-nowrap text-xs font-bold text-[var(--color-text-muted)]"
            aria-live="polite"
          >
            {resultLabel}
          </span>
        </div>
        {children}
      </section>
    </div>
  )
}

export function CatalogSearchField({
  label,
  placeholder,
  value,
  onChange,
  className = '',
  autoFocus = false,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
  autoFocus?: boolean
}) {
  return (
    <label className={`relative min-w-0 flex-1 sm:max-w-xl ${className}`}>
      <span className="sr-only">{label}</span>
      <SearchIcon />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`min-h-10 w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] py-2 pl-10 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)] ${
          value ? 'pr-10' : 'pr-3'
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className={`absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] ${focusRing}`}
          aria-label={`Limpar ${label.toLocaleLowerCase('pt-BR')}`}
        >
          <CloseIcon />
        </button>
      )}
    </label>
  )
}

export function CatalogHeader({
  gridClass,
  children,
}: {
  gridClass: string
  children: ReactNode
}) {
  return (
    <div
      className={`hidden items-center gap-3 border-b border-[var(--color-list-border)] bg-[var(--color-panel-soft-bg)] px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-subtle)] lg:grid ${gridClass}`}
      aria-hidden="true"
    >
      {children}
    </div>
  )
}

export function CatalogRows({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-[var(--color-list-border)]">{children}</ul>
  )
}

export function CatalogRow({
  to,
  onClick,
  ariaLabel,
  gridClass,
  children,
}: {
  to?: string
  onClick?: () => void
  ariaLabel: string
  gridClass: string
  children: ReactNode
}) {
  const rowClass = `group grid w-full min-w-0 items-center gap-x-3 gap-y-2 bg-[var(--color-list-panel-bg)] px-4 py-3 text-left transition hover:bg-[var(--color-table-row-hover-bg)] focus-visible:z-10 focus-visible:bg-[var(--color-table-row-hover-bg)] lg:min-h-16 lg:py-2.5 ${gridClass} ${focusRing}`

  return (
    <li className="relative">
      {to ? (
        <Link to={to} aria-label={ariaLabel} className={rowClass}>
          {children}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className={rowClass}
        >
          {children}
        </button>
      )}
    </li>
  )
}

export function CatalogDatum({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`min-w-0 text-sm text-[var(--color-text-muted)] ${className}`}
    >
      <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--color-text-subtle)] lg:sr-only">
        {label}
      </span>
      {children}
    </span>
  )
}

export function CatalogPrimary({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-extrabold text-[var(--color-text-strong)] group-hover:text-[var(--color-brand)]">
        {title}
      </span>
      {description && (
        <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
          {description}
        </span>
      )}
    </span>
  )
}

export function CatalogChevron() {
  return (
    <span className="hidden justify-self-end text-[var(--color-text-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)] lg:block">
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
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}

export function CatalogEmpty({
  title,
  searchValue,
  onClear,
}: {
  title: string
  searchValue: string
  onClear: () => void
}) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-bold text-[var(--color-text-strong)]">
        {title}
      </p>
      {searchValue && (
        <button
          type="button"
          onClick={onClear}
          className={`mt-2 text-sm font-bold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] ${focusRing}`}
        >
          Limpar busca
        </button>
      )}
    </div>
  )
}

export function CatalogAction({
  to,
  children,
}: {
  to: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 text-sm font-bold text-[var(--color-button-primary-text)] transition hover:bg-[var(--color-button-primary-hover-bg)] ${focusRing}`}
    >
      <PlusIcon />
      {children}
    </Link>
  )
}

export function CatalogSecondaryAction({
  to,
  children,
}: {
  to: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] px-4 text-sm font-bold text-[var(--color-button-neutral-text)] transition hover:bg-[var(--color-button-neutral-hover-bg)] ${focusRing}`}
    >
      {children}
    </Link>
  )
}

export function CatalogStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
        active
          ? 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]'
          : 'border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]'
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          active
            ? 'bg-[var(--status-completed-dot)]'
            : 'bg-[var(--color-text-subtle)]'
        }`}
        aria-hidden="true"
      />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-subtle)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m7 7 10 10M17 7 7 17" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
