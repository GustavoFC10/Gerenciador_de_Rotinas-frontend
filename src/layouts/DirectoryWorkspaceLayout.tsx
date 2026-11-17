import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import ModulesReturnLink from '../components/common/ModulesReturnLink'
import SidebarProfileLink from '../components/common/SidebarProfileLink'
import ProcessIcon from '../components/processes/ProcessIcon'
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
  const { activeMembership, session, user } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const navigationRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const title = module === 'companies' ? 'Empresas' : 'Equipe'
  const to = module === 'companies' ? ROUTES.COMPANY_REGISTRY : ROUTES.EMPLOYEES
  const icon = module === 'companies' ? 'building' : 'users'
  const hiddenLabel = collapsed ? 'lg:sr-only' : ''

  useEffect(() => setMobileOpen(false), [location.pathname])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const close = () => {
      if (media.matches) setMobileOpen(false)
    }
    media.addEventListener('change', close)
    return () => media.removeEventListener('change', close)
  }, [])
  useEffect(() => {
    if (!mobileOpen) return
    const sidebar = navigationRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileOpen(false)
      }
      if (event.key !== 'Tab' || !sidebar) return
      const items = [
        ...sidebar.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled])',
        ),
      ].filter((item) => item.getClientRects().length > 0)
      const first = items[0] ?? sidebar
      const last = items.at(-1) ?? sidebar
      if (
        !sidebar.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      menuRef.current?.focus()
    }
  }, [mobileOpen])

  return (
    <div className={`workspace-shell flex min-h-dvh ${appThemeClass.shell}`}>
      <a
        href="#directory-main"
        className={`fixed left-3 top-3 z-[80] -translate-y-20 rounded-[var(--radius-control)] bg-[var(--color-panel-bg)] px-4 py-2 focus:translate-y-0 ${focusRing}`}
      >
        Pular para o conteúdo
      </a>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-[var(--color-overlay-bg)] lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        id="directory-sidebar"
        ref={navigationRef}
        tabIndex={-1}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen || undefined}
        aria-label={mobileOpen ? `Menu de ${title}` : undefined}
        className={`workspace-sidebar fixed inset-y-0 left-0 z-[60] flex h-dvh w-[min(var(--size-sidebar-expanded),calc(100vw-1.5rem))] shrink-0 flex-col border-r transition-[width,transform] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-30 lg:visible lg:translate-x-0 ${mobileOpen ? 'visible translate-x-0 shadow-[var(--shadow-floating)]' : 'invisible -translate-x-full'} ${collapsed ? 'lg:w-[var(--size-sidebar-collapsed)]' : 'lg:w-[var(--size-sidebar-expanded)]'} ${appThemeClass.sidebar}`}
      >
        <div
          className={`flex min-h-[4.5rem] items-center gap-2 border-b border-[var(--color-sidebar-border)] px-3 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
        >
          <Link
            to={to}
            className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-control)] ${collapsed ? 'lg:hidden' : ''} ${focusRing}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-sidebar-icon-bg)] text-[var(--color-sidebar-icon-text)]">
              <ProcessIcon name={icon} />
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
            ref={closeRef}
            type="button"
            aria-label="Fechar navegação"
            onClick={() => setMobileOpen(false)}
            className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] lg:hidden ${focusRing}`}
          >
            <ProcessIcon name="x" />
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
            <span className={collapsed ? '' : 'rotate-180'}>
              <ProcessIcon name="chevr" />
            </span>
          </button>
        </div>
        <nav
          aria-label={`Navegação de ${title}`}
          className={`flex-1 overflow-y-auto p-3 py-4 ${collapsed ? 'lg:px-1.5' : ''}`}
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
            <ProcessIcon name={icon} />
            <span className={hiddenLabel}>
              {module === 'team' ? 'Pessoas' : title}
            </span>
          </NavLink>
        </nav>
        <div
          className={`shrink-0 border-t border-[var(--color-sidebar-border)] p-3 ${collapsed ? 'lg:px-2' : ''}`}
          data-sidebar-profile
        >
          <SidebarProfileLink
            name={activeMembership?.displayName ?? 'Perfil'}
            description={session?.user.email ?? user?.email ?? ''}
            avatar={activeMembership?.avatar}
            isCollapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </aside>
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
            <ProcessIcon name="list" />
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
