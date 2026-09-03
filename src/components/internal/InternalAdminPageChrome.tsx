import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { focusRing } from '../../constants/designTokens'

export interface InternalBreadcrumbItem {
  label: string
  to?: string
}

export function InternalPageHeader({
  breadcrumbs,
  title,
  description,
  actions,
}: {
  breadcrumbs?: InternalBreadcrumbItem[]
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="border-b border-[var(--color-divider)] pb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <InternalBreadcrumb items={breadcrumbs} />
      )}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-[var(--color-text-strong)] sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        )}
      </div>
    </header>
  )
}

export function InternalBreadcrumb({
  items,
}: {
  items: InternalBreadcrumbItem[]
}) {
  return (
    <nav aria-label="Caminho de navegacao">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--color-text-muted)]">
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className="text-[var(--color-text-subtle)]"
              >
                /
              </span>
            )}
            {item.to ? (
              <Link
                to={item.to}
                className={`rounded-sm text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] ${focusRing}`}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function InternalSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-divider)] pb-4">
        <div>
          <h2 className="text-base font-black text-[var(--color-text-strong)]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  )
}
