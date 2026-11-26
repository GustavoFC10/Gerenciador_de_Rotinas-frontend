import type { ReactNode, RefObject } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import SidebarProfileLink from '../components/common/SidebarProfileLink'
import NavigationIcon, {
  type NavigationIconName,
} from '../components/common/NavigationIcon'
import ModulesReturnLink from '../components/common/ModulesReturnLink'
import NavigationDrawer from '../components/ui/NavigationDrawer'
import type { EntityId } from '../types/domain'
import type {
  ScreenNavigationItem,
  SpreadsheetNavigationItem,
} from '../types/navigation'
import { isLead, isOrganizationAdmin } from '../utils/permissions'

interface SidebarProps {
  spreadsheets: SpreadsheetNavigationItem[]
  agendas: ScreenNavigationItem[]
  isCollapsed: boolean
  isMobileOpen: boolean
  onCollapseToggle: () => void
  onMobileClose: () => void
  menuButtonRef: RefObject<HTMLButtonElement | null>
}

function Sidebar({
  spreadsheets,
  agendas,
  isCollapsed,
  isMobileOpen,
  onCollapseToggle,
  onMobileClose,
  menuButtonRef,
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
    <NavigationDrawer
      id="app-sidebar"
      label="Menu principal"
      open={isMobileOpen}
      onClose={onMobileClose}
      returnFocusRef={menuButtonRef}
      className={`workspace-sidebar ${isCollapsed ? 'lg:w-[var(--size-sidebar-collapsed)]' : ''}`}
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
            <p className="truncate text-lg font-bold leading-5 text-[var(--color-text-strong)]">
              Rotinas
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-[var(--color-text-muted)]">
              Departamentos
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={onMobileClose}
          data-overlay-close
          className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-strong)] lg:hidden ${focusRing}`}
          aria-label="Fechar navegação"
        >
          <NavigationIcon name="close" className="size-5" />
        </button>

        <button
          type="button"
          onClick={onCollapseToggle}
          className={`hidden size-10 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-strong)] lg:grid ${focusRing}`}
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
        <div className="mb-4 border-b border-[var(--color-sidebar-border)] pb-4">
          <ModulesReturnLink
            isCollapsed={isCollapsed}
            onNavigate={onMobileClose}
          />
        </div>
        <ul
          className={`mb-4 space-y-1 border-b border-[var(--color-sidebar-border)] pb-4 ${
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
          <NavigationLink
            to={ROUTES.MY_TASKS}
            label="Minhas tarefas"
            icon="tasks"
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

      <SidebarProfileLink
        isCollapsed={isCollapsed}
        onNavigate={onMobileClose}
      />
    </NavigationDrawer>
  )
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
        className={`app-nav-section mb-2 px-3 ${
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
          <NavigationIcon name="spreadsheet" className="size-5" />
        </span>
        <span className={`min-w-0 flex-1 ${isCollapsed ? 'lg:sr-only' : ''}`}>
          <span className="app-nav-label block truncate">
            {spreadsheet.name}
          </span>
          {spreadsheet.description && (
            <span className="app-caption mt-1 block truncate text-[var(--color-sidebar-primary-muted-text)]">
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
          <NavigationIcon name="calendar" className="size-5" />
        </span>
        <span className={`min-w-0 flex-1 ${isCollapsed ? 'lg:sr-only' : ''}`}>
          <span className="app-nav-label block truncate">{agenda.name}</span>
          {agenda.description && (
            <span className="app-caption mt-1 block truncate text-[var(--color-sidebar-primary-muted-text)]">
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
          `flex min-h-[var(--size-nav-item)] items-center gap-3 rounded-[var(--radius-nav-item)] app-nav-label px-3 transition motion-reduce:transition-none ${
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

export default Sidebar
