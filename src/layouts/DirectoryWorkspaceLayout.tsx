import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import ModulesReturnLink from '../components/common/ModulesReturnLink'
import SidebarProfileLink from '../components/common/SidebarProfileLink'
import NavigationIcon from '../components/common/NavigationIcon'
import NavigationDrawer from '../components/ui/NavigationDrawer'
import { appThemeClass, focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'

export default function DirectoryWorkspaceLayout({
  module,
  children,
}: {
  module: 'companies' | 'team'
  children: ReactNode
}) {
  const { activeMembership } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)
  const title = module === 'companies' ? 'Empresas' : 'Equipe'
  const to = module === 'companies' ? ROUTES.COMPANY_REGISTRY : ROUTES.EMPLOYEES
  const icon = module === 'companies' ? 'building' : 'people'
  const hiddenLabel = collapsed ? 'lg:sr-only' : ''

  useEffect(() => setMobileOpen(false), [location.pathname])

  return (
    <div className={`workspace-shell flex min-h-dvh ${appThemeClass.shell}`}>
      <a
        href="#directory-main"
        inert={mobileOpen || undefined}
        className={`fixed left-3 top-3 z-[80] -translate-y-20 rounded-[var(--radius-control)] bg-[var(--color-panel-bg)] px-4 py-2 focus:translate-y-0 ${focusRing}`}
      >
        Pular para o conteúdo
      </a>
      <NavigationDrawer
        id="directory-sidebar"
        label={`Menu de ${title}`}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        returnFocusRef={menuRef}
        className={`workspace-sidebar ${collapsed ? 'lg:w-[var(--size-sidebar-collapsed)]' : ''}`}
      >
        <div
          className={`flex min-h-[4.5rem] items-center gap-2 border-b border-[var(--color-sidebar-border)] px-3 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
        >
          <Link
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-control)] ${collapsed ? 'lg:hidden' : ''} ${focusRing}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-sidebar-icon-bg)] text-[var(--color-sidebar-icon-text)]">
              <NavigationIcon name={icon} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-bold text-[var(--color-text-strong)]">
                {title}
              </span>
              <span className="app-caption block truncate">
                {activeMembership?.organization.name}
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Fechar navegação"
            data-overlay-close
            onClick={() => setMobileOpen(false)}
            className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] lg:hidden ${focusRing}`}
          >
            <NavigationIcon name="close" />
          </button>
          <button
            type="button"
            aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'}
            title={collapsed ? 'Expandir navegação' : 'Recolher navegação'}
            aria-expanded={!collapsed}
            aria-controls="directory-sidebar"
            onClick={() => setCollapsed((value) => !value)}
            className={`hidden size-10 shrink-0 place-items-center rounded-[var(--radius-control)] hover:bg-[var(--color-nav-item-hover-bg)] lg:grid ${focusRing}`}
          >
            <NavigationIcon
              name={collapsed ? 'chevron-right' : 'chevron-left'}
            />
          </button>
        </div>
        <nav
          aria-label={`Navegação de ${title}`}
          className={`flex-1 overflow-y-auto overscroll-contain p-3 py-4 ${collapsed ? 'lg:px-1.5' : ''}`}
        >
          <div className="mb-4 border-b border-[var(--color-sidebar-border)] pb-4">
            <ModulesReturnLink
              isCollapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
          <p className={`app-nav-section mb-2 px-3 ${hiddenLabel}`}>{title}</p>
          <NavLink
            to={to}
            title={title}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `app-nav-label flex min-h-[var(--size-nav-item)] items-center gap-3 rounded-[var(--radius-nav-item)] px-3 ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? 'bg-[var(--color-nav-item-active-bg)] text-[var(--color-nav-item-active-text)] ring-1 ring-inset ring-[var(--color-nav-active-border)]' : 'text-[var(--color-nav-item-text)] hover:bg-[var(--color-nav-item-hover-bg)]'} ${focusRing}`
            }
          >
            <NavigationIcon name={icon} />
            <span className={hiddenLabel}>
              {module === 'team' ? 'Pessoas' : title}
            </span>
          </NavLink>
        </nav>
        <SidebarProfileLink
          isCollapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
        />
      </NavigationDrawer>
      <div
        className="flex min-h-dvh min-w-0 flex-1 flex-col"
        inert={mobileOpen || undefined}
        aria-hidden={mobileOpen || undefined}
      >
        <header
          className={`workspace-header sticky top-0 z-40 flex min-h-[4.5rem] items-center gap-3 border-b px-4 sm:px-6 lg:px-8 ${appThemeClass.topbar}`}
        >
          <button
            ref={menuRef}
            type="button"
            aria-label="Abrir navegação"
            aria-expanded={mobileOpen}
            aria-controls="directory-sidebar"
            onClick={() => setMobileOpen(true)}
            className={`grid size-9 place-items-center rounded-[var(--radius-control)] lg:hidden ${focusRing}`}
          >
            <NavigationIcon name="menu" />
          </button>
          <span className="min-w-0 truncate text-sm font-medium">
            {activeMembership?.organization.name}
          </span>
          <span className="app-caption ml-auto hidden sm:block">{title}</span>
        </header>
        <main
          id="directory-main"
          tabIndex={-1}
          className="workspace-main min-w-0 flex-1 px-4 py-4 outline-none sm:px-6 sm:py-5 lg:px-8"
        >
          <div className="mx-auto w-full max-w-[90rem]">{children}</div>
        </main>
      </div>
    </div>
  )
}
