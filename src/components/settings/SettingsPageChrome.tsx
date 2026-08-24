import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

import EmptyState from '../common/EmptyState'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { focusRing } from '../../constants/designTokens'
import {
  getSettingsDepartmentPath,
  getSettingsDepartmentPermissionsPath,
  getSettingsDepartmentScreensPath,
  ROUTES,
} from '../../constants/routes'

export interface SettingsBreadcrumbItem {
  label: string
  to?: string
}

export function SettingsPageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  children,
}: {
  breadcrumbs?: SettingsBreadcrumbItem[]
  title: string
  description?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="border-b border-[var(--color-divider)] pb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <SettingsBreadcrumb items={breadcrumbs} />
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
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

export function SettingsBreadcrumb({
  items,
}: {
  items: SettingsBreadcrumbItem[]
}) {
  return (
    <nav aria-label="Caminho de navegação">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--color-text-muted)]">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="text-[var(--color-text-subtle)]">
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

export function DepartmentLocalNavigation({
  departmentId,
}: {
  departmentId: string
}) {
  const generalPath = getSettingsDepartmentPath(departmentId)
  const items = [
    { to: generalPath, label: 'Geral', end: true },
    { to: getSettingsDepartmentScreensPath(departmentId), label: 'Telas' },
    {
      to: getSettingsDepartmentPermissionsPath(departmentId),
      label: 'Permissões',
    },
  ]

  return (
    <nav
      className="mt-5 -mb-5 overflow-x-auto"
      aria-label="Seções do departamento"
    >
      <ul className="flex min-w-max gap-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `inline-flex min-h-10 items-center border-b-2 px-3 text-sm font-bold transition ${focusRing} ${
                  isActive
                    ? 'border-[var(--color-brand)] text-[var(--color-text-strong)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function DepartmentSettingsHeader({
  departmentId,
  departmentName,
  title = departmentName,
  description,
  actions,
  trailingBreadcrumbs = [],
}: {
  departmentId: string
  departmentName: string
  title?: string
  description: string
  actions?: ReactNode
  trailingBreadcrumbs?: SettingsBreadcrumbItem[]
}) {
  return (
    <SettingsPageHeader
      breadcrumbs={[
        { label: 'Configurações', to: ROUTES.SETTINGS },
        { label: 'Departamentos', to: ROUTES.SETTINGS_DEPARTMENTS },
        {
          label: departmentName,
          to:
            trailingBreadcrumbs.length > 0
              ? getSettingsDepartmentPath(departmentId)
              : undefined,
        },
        ...trailingBreadcrumbs,
      ]}
      title={title}
      description={description}
      actions={actions}
    >
      <DepartmentLocalNavigation departmentId={departmentId} />
    </SettingsPageHeader>
  )
}

export function SettingsContentSection({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={`p-5 sm:p-6 ${className}`} variant="flat">
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
    </Card>
  )
}

export function DevelopmentPlaceholder({
  title,
  description,
  actionLabel,
}: {
  title: string
  description: string
  actionLabel: string
}) {
  const [isNoticeVisible, setIsNoticeVisible] = useState(false)

  return (
    <div>
      <EmptyState title={title} description={description} />
      <div className="mt-4 flex flex-col items-center gap-3 text-center">
        <Button tone="neutral" onClick={() => setIsNoticeVisible(true)}>
          {actionLabel}
        </Button>
        {isNoticeVisible && (
          <p
            role="status"
            className="max-w-xl rounded-[var(--radius-control)] border border-[var(--color-brand-border)] bg-[var(--color-brand-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-brand-strong)]"
          >
            Esta funcionalidade está em desenvolvimento e ainda não possui
            suporte no backend.
          </p>
        )}
      </div>
    </div>
  )
}

export function SettingsChevron({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-4 shrink-0 ${className || 'text-[var(--color-text-subtle)]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
