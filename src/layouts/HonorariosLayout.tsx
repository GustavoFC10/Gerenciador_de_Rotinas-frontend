import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import Badge from '../components/ui/Badge'
import SidebarProfileLink from '../components/common/SidebarProfileLink'
import ModulesReturnLink from '../components/common/ModulesReturnLink'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import NavigationDrawer from '../components/ui/NavigationDrawer'
import { appThemeClass, focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import NavigationIcon, {
  type NavigationIconName,
} from '../components/common/NavigationIcon'
import WorkspaceBar from './WorkspaceBar'

interface HonorariosLayoutProps {
  children: ReactNode
  title: string
  description?: string
  roleLabel: string
  canEdit: boolean
  isRefreshing?: boolean
  onRefresh: () => void
}

const links: Array<{
  to: string
  label: string
  icon: NavigationIconName
  end?: boolean
}> = [
  { to: ROUTES.HONORARIOS, label: 'Home', icon: 'home', end: true },
  {
    to: `${ROUTES.HONORARIOS}/orcamentos`,
    label: 'Orçamentos',
    icon: 'quotes',
  },
  { to: `${ROUTES.HONORARIOS}/clientes`, label: 'Clientes', icon: 'building' },
  {
    to: `${ROUTES.HONORARIOS}/parametros`,
    label: 'Parâmetros',
    icon: 'settings',
  },
]

/** The operational module uses the same sidebar, topbar dimensions and theme as Rotinas. */
export default function HonorariosLayout({
  children,
  title,
  description,
  roleLabel,
  canEdit,
  isRefreshing,
  onRefresh,
}: HonorariosLayoutProps) {
  const { activeMembership } = useAuth()
  const location = useLocation()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setNavigationOpen(false)
  }, [location.pathname, location.search])

  return (
    <div
      className={`workspace-shell honorarios-workspace min-h-dvh ${appThemeClass.shell}`}
    >
      <a
        href="#honorarios-main"
        inert={navigationOpen || undefined}
        className={`fixed left-3 top-3 z-[80] -translate-y-20 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-button-primary-text)] focus:translate-y-0 ${focusRing}`}
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-dvh">
        <NavigationDrawer
          id="honorarios-sidebar"
          label="Menu de Honorários"
          open={navigationOpen}
          onClose={() => setNavigationOpen(false)}
          returnFocusRef={menuRef}
          className="workspace-sidebar"
        >
          <div className="flex min-h-[4.5rem] items-center gap-2 border-b border-[var(--color-sidebar-border)] px-3">
            <Link
              to={ROUTES.HONORARIOS}
              onClick={() => setNavigationOpen(false)}
              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-control)] ${focusRing}`}
              aria-label="Ir para o painel de Honorários"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <NavigationIcon name="calculator" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-5 text-[var(--color-text-strong)]">
                  Honorários
                </span>
                <span className="mt-0.5 block truncate text-xs font-medium text-[var(--color-text-muted)]">
                  {activeMembership?.organization.name}
                </span>
              </span>
            </Link>
            <IconButton
              tone="ghost"
              onClick={() => setNavigationOpen(false)}
              data-overlay-close
              label="Fechar navegação"
              className="size-9 shrink-0 px-0 lg:hidden"
            >
              <NavigationIcon name="close" />
            </IconButton>
          </div>
          <nav
            aria-label="Navegação de Honorários"
            className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4"
          >
            <div className="mb-4 border-b border-[var(--color-sidebar-border)] pb-4">
              <ModulesReturnLink onNavigate={() => setNavigationOpen(false)} />
            </div>
            <p className="app-nav-section mb-2 px-3">Gestão de honorários</p>
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.to}>
                  {link.to.endsWith('/orcamentos') &&
                  location.pathname === '/honorarios/novo' ? (
                    <Link
                      to={link.to}
                      aria-current="page"
                      onClick={() => setNavigationOpen(false)}
                      className={`app-nav-label flex min-h-[var(--size-nav-item)] items-center gap-3 rounded-[var(--radius-nav-item)] border border-[var(--color-brand-border)] bg-[var(--color-nav-item-active-bg)] px-3 text-sm font-semibold text-[var(--color-nav-item-active-text)] ${focusRing}`}
                    >
                      <NavigationIcon name={link.icon} />
                      {link.label}
                    </Link>
                  ) : (
                    <NavLink
                      to={link.to}
                      end={link.end}
                      aria-current={
                        link.to.endsWith('/orcamentos') &&
                        location.pathname === '/honorarios/novo'
                          ? 'page'
                          : undefined
                      }
                      onClick={() => setNavigationOpen(false)}
                      className={({ isActive }) =>
                        `app-nav-label flex min-h-[var(--size-nav-item)] items-center gap-3 rounded-[var(--radius-nav-item)] border px-3 text-sm font-semibold transition ${focusRing} ${isActive || (link.to.endsWith('/orcamentos') && location.pathname === '/honorarios/novo') ? 'border-[var(--color-brand-border)] bg-[var(--color-nav-item-active-bg)] text-[var(--color-nav-item-active-text)]' : 'border-transparent text-[var(--color-nav-item-text)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-strong)]'}`
                      }
                    >
                      <NavigationIcon name={link.icon} />
                      {link.label}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <SidebarProfileLink onNavigate={() => setNavigationOpen(false)} />
        </NavigationDrawer>
        <div
          className="flex min-h-dvh min-w-0 flex-1 flex-col"
          inert={navigationOpen || undefined}
          aria-hidden={navigationOpen || undefined}
        >
          <header
            className={`workspace-header sticky top-0 z-40 flex min-h-[4.5rem] flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur sm:px-6 lg:px-8 ${appThemeClass.topbar}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <IconButton
                ref={menuRef}
                tone="ghost"
                className="size-9 px-0 lg:hidden"
                label="Abrir navegação"
                aria-controls="honorarios-sidebar"
                aria-expanded={navigationOpen}
                onClick={() => setNavigationOpen(true)}
              >
                <NavigationIcon name="menu" />
              </IconButton>
              <span className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
                <Link
                  to={ROUTES.HONORARIOS}
                  className={`font-semibold text-[var(--color-text-muted)] ${focusRing}`}
                >
                  Honorários
                </Link>
                <span
                  className="text-[var(--color-text-subtle)]"
                  aria-hidden="true"
                >
                  /
                </span>
                <span className="truncate font-bold text-[var(--color-text-strong)]">
                  {title}
                </span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Button
                aria-label="Atualizar Honorários"
                title="Atualizar Honorários"
                disabled={isRefreshing}
                onClick={onRefresh}
                className="gap-2"
              >
                <NavigationIcon
                  name="refresh"
                  className={isRefreshing ? 'animate-spin' : ''}
                />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              {canEdit &&
                location.pathname === `${ROUTES.HONORARIOS}/orcamentos` && (
                  <Link
                    to={`${ROUTES.HONORARIOS}/novo`}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-3 text-sm font-semibold text-[var(--color-button-primary-text)] transition hover:bg-[var(--color-button-primary-hover-bg)] ${focusRing}`}
                  >
                    <NavigationIcon name="plus" />
                    <span>Novo orçamento</span>
                  </Link>
                )}
            </div>
          </header>
          <main
            id="honorarios-main"
            tabIndex={-1}
            className="honorarios-workspace workspace-main flex-1 px-4 py-4 outline-none sm:px-6 sm:py-5 lg:px-8"
          >
            <WorkspaceBar
              title={title}
              meta={<Badge>{roleLabel}</Badge>}
              actions={<div id="honorarios-page-actions" />}
            />
            {description && (
              <p className="-mt-2 mb-5 text-sm text-[var(--color-text-muted)]">
                {description}
              </p>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
