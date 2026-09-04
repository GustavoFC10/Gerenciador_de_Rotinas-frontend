import type { ReactNode, RefObject } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { appThemeClass, focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import type { EntityId } from '../types/domain'
import type {
  ScreenNavigationItem,
  SpreadsheetNavigationItem,
} from '../types/navigation'
import {
  canViewEmployees,
  isLead,
  isOrganizationAdmin,
} from '../utils/permissions'

interface SidebarProps {
  spreadsheets: SpreadsheetNavigationItem[]
  agendas: ScreenNavigationItem[]
  isCollapsed: boolean
  isMobileOpen: boolean
  onCollapseToggle: () => void
  onMobileClose: () => void
  navigationRef: RefObject<HTMLElement | null>
  closeButtonRef: RefObject<HTMLButtonElement | null>
}

type NavigationIconName =
  | 'building'
  | 'calendar'
  | 'chart'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'home'
  | 'list'
  | 'people'
  | 'repeat'
  | 'settings'
  | 'spreadsheet'
  | 'tasks'

function Sidebar({
  spreadsheets,
  agendas,
  isCollapsed,
  isMobileOpen,
  onCollapseToggle,
  onMobileClose,
  navigationRef,
  closeButtonRef,
}: SidebarProps) {
  const { user } = useAppState()
  const location = useLocation()
  const selectedSpreadsheetId = getSelectedSpreadsheetId(
    location.pathname,
    location.search,
    spreadsheets,
  )
  const selectedAgendaId = getSelectedAgendaId(
    location.pathname,
    location.search,
    agendas,
  )
  const contextualSpreadsheetId = getAvailableSpreadsheetId(
    location.search,
    spreadsheets,
  )
  const tasksPath = contextualSpreadsheetId
    ? `${ROUTES.TASKS}?${new URLSearchParams({
        screenId: contextualSpreadsheetId,
      }).toString()}`
    : ROUTES.TASKS
  const collapsedLabelClass = isCollapsed ? 'lg:sr-only' : ''

  return (
    <aside
      id="app-sidebar"
      ref={navigationRef}
      className={`fixed inset-y-0 left-0 z-[60] flex h-dvh w-[min(var(--size-sidebar-expanded),calc(100vw-1.5rem))] shrink-0 flex-col border-r shadow-[var(--shadow-floating)] transition-[width,transform] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-30 lg:visible lg:translate-x-0 lg:shadow-none ${
        isMobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
      } ${
        isCollapsed
          ? 'lg:w-[var(--size-sidebar-collapsed)]'
          : 'lg:w-[var(--size-sidebar-expanded)]'
      } ${appThemeClass.sidebar}`}
      tabIndex={-1}
      role={isMobileOpen ? 'dialog' : undefined}
      aria-modal={isMobileOpen || undefined}
      aria-label={isMobileOpen ? 'Menu principal' : undefined}
    >
      <div
        className={`flex min-h-[4.5rem] items-center gap-2 border-b border-[var(--color-sidebar-border)] px-3 ${
          isCollapsed ? 'lg:justify-center lg:px-2' : ''
        }`}
      >
        <Link
          to={ROUTES.HOME}
          onClick={onMobileClose}
          className={`min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-control)] ${
            isCollapsed ? 'flex lg:hidden' : 'flex'
          } ${focusRing}`}
          aria-label="Ir para o início"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-sidebar-icon-bg)] text-[var(--color-sidebar-icon-text)]">
            <NavigationIcon name="spreadsheet" className="size-5" />
          </span>
          <div className={`min-w-0 ${collapsedLabelClass}`}>
            <p className="truncate text-lg font-extrabold leading-5 text-[var(--color-text-strong)]">
              Rotinas
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-[var(--color-text-muted)]">
              Departamentos
            </p>
          </div>
        </Link>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onMobileClose}
          className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-strong)] lg:hidden ${focusRing}`}
          aria-label="Fechar navegação"
        >
          <NavigationIcon name="close" className="size-5" />
        </button>

        <button
          type="button"
          onClick={onCollapseToggle}
          className={`hidden size-8 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-strong)] lg:grid ${focusRing}`}
          aria-label={isCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
          title={isCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
          aria-controls="app-sidebar"
          aria-expanded={!isCollapsed}
        >
          <NavigationIcon
            name={isCollapsed ? 'chevron-right' : 'chevron-left'}
            className="size-5"
          />
        </button>
      </div>

      <nav
        className={`flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 ${
          isCollapsed ? 'lg:px-1.5' : ''
        }`}
        aria-label="Navegação principal"
      >
        <ul
          className={`mb-4 border-b border-[var(--color-sidebar-border)] pb-4 ${
            isCollapsed ? 'lg:mx-0.5' : ''
          }`}
          aria-label="Acesso global"
        >
          <NavigationLink
            to={ROUTES.HOME}
            label="Início"
            icon="home"
            isCollapsed={isCollapsed}
            end
            onNavigate={onMobileClose}
          />
        </ul>

        <NavigationSection
          title="Departamentos"
          isCollapsed={isCollapsed}
          className="mb-5"
        >
          {spreadsheets.length > 0 ? (
            spreadsheets.map((spreadsheet) => (
              <SpreadsheetLink
                key={spreadsheet.id}
                spreadsheet={spreadsheet}
                isActive={spreadsheet.screens.some(
                  (screen) => screen.id === selectedSpreadsheetId,
                )}
                isCollapsed={isCollapsed}
                onNavigate={onMobileClose}
              />
            ))
          ) : (
            <li>
              <p
                className={`px-2 py-3 text-sm text-[var(--color-text-muted)] ${collapsedLabelClass}`}
              >
                Nenhum departamento disponível
              </p>
            </li>
          )}
        </NavigationSection>

        {agendas.length > 0 && (
          <NavigationSection
            title="Agendas"
            isCollapsed={isCollapsed}
            className="mb-5"
          >
            {agendas.map((agenda) => (
              <AgendaLink
                key={agenda.id}
                agenda={agenda}
                isActive={agenda.id === selectedAgendaId}
                isCollapsed={isCollapsed}
                onNavigate={onMobileClose}
              />
            ))}
          </NavigationSection>
        )}

        <NavigationSection
          title="Listagens"
          isCollapsed={isCollapsed}
          className="mb-5"
        >
          <NavigationLink
            to={ROUTES.COMPANIES}
            label="Empresas"
            icon="building"
            end
            isCollapsed={isCollapsed}
            onNavigate={onMobileClose}
          />
          <NavigationLink
            to={ROUTES.ROUTINES}
            label="Rotinas"
            icon="repeat"
            end
            isCollapsed={isCollapsed}
            onNavigate={onMobileClose}
          />
          <NavigationLink
            to={tasksPath}
            label="Tarefas"
            icon="tasks"
            end
            isCollapsed={isCollapsed}
            onNavigate={onMobileClose}
          />
          {canViewEmployees(user) && (
            <NavigationLink
              to={ROUTES.EMPLOYEES}
              label="Funcionários"
              icon="people"
              end
              isCollapsed={isCollapsed}
              onNavigate={onMobileClose}
            />
          )}
        </NavigationSection>

        {(isOrganizationAdmin(user) || isLead(user)) && (
          <>
            <NavigationDivider />
            <NavigationSection title="Gestão" isCollapsed={isCollapsed}>
              {isOrganizationAdmin(user) && (
                <NavigationLink
                  to={ROUTES.ORGANIZATION_DASHBOARD}
                  label="Visão geral"
                  icon="chart"
                  isCollapsed={isCollapsed}
                  onNavigate={onMobileClose}
                />
              )}
              {isOrganizationAdmin(user) && (
                <NavigationLink
                  to={ROUTES.SETTINGS}
                  label="Configurações"
                  icon="settings"
                  isCollapsed={isCollapsed}
                  onNavigate={onMobileClose}
                />
              )}
            </NavigationSection>
          </>
        )}
      </nav>

      <SidebarProfile
        isCollapsed={isCollapsed}
        onNavigate={onMobileClose}
        user={user}
      />
    </aside>
  )
}

function SidebarProfile({
  isCollapsed,
  onNavigate,
  user,
}: {
  isCollapsed: boolean
  onNavigate: () => void
  user: ReturnType<typeof useAppState>['user']
}) {
  const initials = getUserInitials(user.name)

  return (
    <div
      className={`shrink-0 border-t border-[var(--color-sidebar-border)] p-3 ${
        isCollapsed ? 'lg:px-2' : ''
      }`}
      data-sidebar-profile
    >
      <Link
        to={ROUTES.PROFILE}
        onClick={onNavigate}
        title={isCollapsed ? `Perfil: ${user.name}` : undefined}
        aria-label={`Abrir perfil de ${user.name}`}
        className={`group flex min-h-12 items-center gap-3 rounded-[var(--radius-nav-item)] p-2 transition motion-reduce:transition-none hover:bg-[var(--color-nav-item-hover-bg)] ${
          isCollapsed ? 'lg:justify-center lg:p-1' : ''
        } ${focusRing}`}
      >
        <UserAvatar avatarUrl={user.avatarUrl} initials={initials} />
        <span
          className={`min-w-0 flex-1 ${isCollapsed ? 'lg:sr-only' : ''}`}
        >
          <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
            {user.name}
          </span>
          <span className="block truncate text-xs font-medium text-[var(--color-text-muted)]">
            {user.email}
          </span>
        </span>
        <NavigationIcon
          name="chevron-right"
          className={`size-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-text-strong)] motion-reduce:transition-none ${
            isCollapsed ? 'lg:hidden' : ''
          }`}
        />
      </Link>
    </div>
  )
}

function UserAvatar({
  avatarUrl,
  initials,
}: {
  avatarUrl: string
  initials: string
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-[var(--color-control-border)]"
      />
    )
  }

  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-sidebar-icon-bg)] text-xs font-extrabold text-[var(--color-sidebar-icon-text)] ring-1 ring-[var(--color-control-border)]"
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

function getUserInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || 'U'
}

function getSelectedSpreadsheetId(
  pathname: string,
  search: string,
  spreadsheets: SpreadsheetNavigationItem[],
): EntityId | null {
  if (new URLSearchParams(search).get('source') === 'catalog') return null

  const isCreationRoute =
    pathname === ROUTES.COMPANY_CREATE ||
    pathname === ROUTES.ROUTINE_CREATE ||
    pathname === ROUTES.EMPLOYEE_CREATE

  if (isCreationRoute) return null

  const isSpreadsheetFlow =
    pathname === ROUTES.SPREADSHEET ||
    pathname === ROUTES.LIST ||
    pathname.startsWith(`${ROUTES.COMPANIES}/`) ||
    pathname.startsWith(`${ROUTES.ROUTINES}/`)

  if (!isSpreadsheetFlow) return null

  return getAvailableSpreadsheetId(search, spreadsheets)
}

function getAvailableSpreadsheetId(
  search: string,
  spreadsheets: SpreadsheetNavigationItem[],
): EntityId | null {
  const requestedSpreadsheetId = new URLSearchParams(search).get('screenId')
  const availableScreens = spreadsheets.flatMap(
    (spreadsheet) => spreadsheet.screens,
  )
  const requestedSpreadsheetExists = availableScreens.some(
    (screen) => screen.id === requestedSpreadsheetId,
  )

  if (requestedSpreadsheetId && requestedSpreadsheetExists) {
    return requestedSpreadsheetId
  }

  return availableScreens[0]?.id ?? null
}

function getSelectedAgendaId(
  pathname: string,
  search: string,
  agendas: ScreenNavigationItem[],
): EntityId | null {
  if (pathname !== ROUTES.AGENDA) return null

  const requestedAgendaId = new URLSearchParams(search).get('screenId')
  return agendas.some((agenda) => agenda.id === requestedAgendaId)
    ? requestedAgendaId
    : null
}

function NavigationSection({
  title,
  children,
  isCollapsed,
  className = '',
}: {
  title: string
  children: ReactNode
  isCollapsed: boolean
  className?: string
}) {
  return (
    <section className={className} aria-label={title}>
      <h2
        className={`mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-sidebar-section-text)] ${
          isCollapsed ? 'lg:sr-only' : ''
        }`}
      >
        {title}
      </h2>
      <ul className="space-y-1">{children}</ul>
    </section>
  )
}

function SpreadsheetLink({
  spreadsheet,
  isActive,
  isCollapsed,
  onNavigate,
}: {
  spreadsheet: SpreadsheetNavigationItem
  isActive: boolean
  isCollapsed: boolean
  onNavigate: () => void
}) {
  return (
    <li>
      <Link
        to={spreadsheet.to}
        data-navigation-priority="spreadsheet"
        aria-current={isActive ? 'page' : undefined}
        title={isCollapsed ? spreadsheet.name : undefined}
        onClick={onNavigate}
        className={`group flex min-h-[var(--size-nav-primary)] items-center gap-3 rounded-[var(--radius-nav-item)] border px-3 py-2.5 font-semibold transition motion-reduce:transition-none ${
          isCollapsed ? 'lg:justify-center lg:px-1' : ''
        } ${
          isActive
            ? 'border-[var(--color-sidebar-primary-active-border)] bg-[var(--color-sidebar-primary-active-bg)] text-[var(--color-sidebar-primary-text)] shadow-[var(--shadow-panel)]'
            : 'border-[var(--color-sidebar-primary-border)] bg-[var(--color-sidebar-primary-bg)] text-[var(--color-sidebar-primary-text)] hover:border-[var(--color-sidebar-primary-active-border)] hover:bg-[var(--color-sidebar-primary-hover-bg)]'
        } ${focusRing}`}
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-sidebar-icon-bg)] text-[var(--color-sidebar-icon-text)] ${
            isCollapsed ? 'lg:size-8' : ''
          }`}
        >
          <NavigationIcon name="spreadsheet" className="size-[1.35rem]" />
        </span>
        <span className={`min-w-0 flex-1 ${isCollapsed ? 'lg:sr-only' : ''}`}>
          <span className="block truncate text-[1.05rem] font-extrabold leading-5">
            {spreadsheet.name}
          </span>
          {spreadsheet.description && (
            <span className="mt-1 block truncate text-xs font-medium text-[var(--color-sidebar-primary-muted-text)]">
              {spreadsheet.description}
            </span>
          )}
        </span>
        <NavigationIcon
          name="chevron-right"
          className={`size-4 shrink-0 opacity-60 ${
            isCollapsed ? 'lg:hidden' : ''
          }`}
        />
      </Link>
    </li>
  )
}

function AgendaLink({
  agenda,
  isActive,
  isCollapsed,
  onNavigate,
}: {
  agenda: ScreenNavigationItem
  isActive: boolean
  isCollapsed: boolean
  onNavigate: () => void
}) {
  return (
    <li>
      <Link
        to={agenda.to}
        data-navigation-priority="agenda"
        aria-current={isActive ? 'page' : undefined}
        title={isCollapsed ? agenda.name : undefined}
        onClick={onNavigate}
        className={`group flex min-h-[var(--size-nav-primary)] items-center gap-3 rounded-[var(--radius-nav-item)] border px-3 py-2.5 font-semibold transition motion-reduce:transition-none ${
          isCollapsed ? 'lg:justify-center lg:px-1' : ''
        } ${
          isActive
            ? 'border-[var(--color-sidebar-primary-active-border)] bg-[var(--color-sidebar-primary-active-bg)] text-[var(--color-sidebar-primary-text)] shadow-[var(--shadow-panel)]'
            : 'border-[var(--color-sidebar-primary-border)] bg-[var(--color-sidebar-primary-bg)] text-[var(--color-sidebar-primary-text)] hover:border-[var(--color-sidebar-primary-active-border)] hover:bg-[var(--color-sidebar-primary-hover-bg)]'
        } ${focusRing}`}
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-sidebar-icon-bg)] text-[var(--color-sidebar-icon-text)] ${
            isCollapsed ? 'lg:size-8' : ''
          }`}
        >
          <NavigationIcon name="calendar" className="size-[1.35rem]" />
        </span>
        <span className={`min-w-0 flex-1 ${isCollapsed ? 'lg:sr-only' : ''}`}>
          <span className="block truncate text-[1.05rem] font-extrabold leading-5">
            {agenda.name}
          </span>
          {agenda.description && (
            <span className="mt-1 block truncate text-xs font-medium text-[var(--color-sidebar-primary-muted-text)]">
              {agenda.description}
            </span>
          )}
        </span>
        <NavigationIcon
          name="chevron-right"
          className={`size-4 shrink-0 opacity-60 ${
            isCollapsed ? 'lg:hidden' : ''
          }`}
        />
      </Link>
    </li>
  )
}

function NavigationLink({
  to,
  label,
  icon,
  isCollapsed,
  end = false,
  onNavigate,
}: {
  to: string
  label: string
  icon: NavigationIconName
  isCollapsed: boolean
  end?: boolean
  onNavigate: () => void
}) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        title={isCollapsed ? label : undefined}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex min-h-[var(--size-nav-item)] items-center gap-3 rounded-[var(--radius-nav-item)] px-3 text-[0.95rem] font-semibold transition motion-reduce:transition-none ${
            isCollapsed ? 'lg:justify-center lg:px-2' : ''
          } ${
            isActive
              ? 'bg-[var(--color-nav-item-active-bg)] text-[var(--color-nav-item-active-text)] ring-1 ring-inset ring-[var(--color-nav-active-border)]'
              : 'text-[var(--color-nav-item-text)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-nav-item-active-text)]'
          } ${focusRing}`
        }
      >
        <NavigationIcon name={icon} className="size-5 shrink-0" />
        <span className={isCollapsed ? 'lg:sr-only' : ''}>{label}</span>
      </NavLink>
    </li>
  )
}

function NavigationDivider() {
  return (
    <div
      className="my-5 border-t border-[var(--color-sidebar-border)]"
      aria-hidden="true"
    />
  )
}

function NavigationIcon({
  name,
  className,
}: {
  name: NavigationIconName
  className?: string
}) {
  const commonProps = {
    viewBox: '0 0 24 24',
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
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

  if (name === 'calendar') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
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

  if (name === 'list') {
    return (
      <svg {...commonProps}>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2.5" />
      </svg>
    )
  }

  if (name === 'home') {
    return (
      <svg {...commonProps}>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </svg>
    )
  }

  if (name === 'chart') {
    return (
      <svg {...commonProps}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    )
  }

  if (name === 'repeat') {
    return (
      <svg {...commonProps}>
        <path d="m17 2 4 4-4 4" />
        <path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" />
        <path d="M21 13v2a3 3 0 0 1-3 3H3" />
      </svg>
    )
  }

  if (name === 'building') {
    return (
      <svg {...commonProps}>
        <path d="M4 21V4h11v17M15 9h5v12M2 21h20" />
        <path d="M8 8h3M8 12h3M8 16h3M18 13h.01M18 17h.01" />
      </svg>
    )
  }

  if (name === 'people') {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }

  if (name === 'settings') {
    return (
      <svg {...commonProps}>
        <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        <path
          d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 1 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 12a2 2 0 0 1 0-4h.2a2 2 0 0 0 1.4-3.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 9.4.4h.2a2 2 0 1 1 4 0v.2A2 2 0 0 0 17 2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 21.2 8h.2a2 2 0 1 1 0 4h-.2a2 2 0 0 0-1.8 3Z"
          transform="translate(0 3.6) scale(.75)"
        />
      </svg>
    )
  }

  if (name === 'close') {
    return (
      <svg {...commonProps}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    )
  }

  if (name === 'chevron-left') {
    return (
      <svg {...commonProps}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export default Sidebar
