import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'

import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Select from '../components/ui/Select'
import { appThemeClass, focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import { getErrorPresentation } from '../utils/apiErrors'
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

type IconName =
  | 'modules'
  | 'home'
  | 'calculator'
  | 'quotes'
  | 'clients'
  | 'settings'
  | 'menu'
  | 'close'
  | 'refresh'
  | 'chevron'
  | 'logout'
  | 'plus'

const links: Array<{
  to: string
  label: string
  icon: IconName
  end?: boolean
}> = [
  { to: ROUTES.HONORARIOS, label: 'Painel', icon: 'home', end: true },
  {
    to: `${ROUTES.HONORARIOS}/novo`,
    label: 'Novo orçamento',
    icon: 'calculator',
  },
  {
    to: `${ROUTES.HONORARIOS}/orcamentos`,
    label: 'Orçamentos',
    icon: 'quotes',
  },
  { to: `${ROUTES.HONORARIOS}/clientes`, label: 'Clientes', icon: 'clients' },
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
  const {
    activeMembership,
    memberships,
    session,
    selectActiveMembership,
    logout,
  } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [pending, setPending] = useState<'organization' | 'logout' | null>(null)
  const [error, setError] = useState('')
  const navigationRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLButtonElement>(null)
  const name = activeMembership?.displayName ?? 'Perfil'
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'

  useEffect(() => {
    setNavigationOpen(false)
  }, [location.pathname, location.search])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    function closeOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) setNavigationOpen(false)
    }
    media.addEventListener('change', closeOnDesktop)
    return () => media.removeEventListener('change', closeOnDesktop)
  }, [])
  useEffect(() => {
    if (!navigationOpen) return
    const sidebar = navigationRef.current
    const returnTarget = menuRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setNavigationOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = [
        ...(sidebar?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),select:not([disabled]),[tabindex="0"]',
        ) ?? []),
      ].filter((item) => !item.closest('[hidden],[inert]'))
      const first = items[0] ?? sidebar
      const last = items.at(-1) ?? sidebar
      if (
        !sidebar?.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', keydown)
      if (returnTarget?.isConnected) returnTarget.focus()
    }
  }, [navigationOpen])

  async function changeOrganization(membershipId: string) {
    if (membershipId === activeMembership?.id || pending) return
    setPending('organization')
    setError('')
    try {
      await selectActiveMembership(membershipId)
      navigate(ROUTES.HUB, { replace: true })
    } catch (caught) {
      setError(getErrorPresentation(caught).message)
    } finally {
      setPending(null)
    }
  }
  async function leave() {
    if (pending) return
    setPending('logout')
    setError('')
    try {
      await logout()
    } catch (caught) {
      setError(getErrorPresentation(caught).message)
    } finally {
      setPending(null)
    }
  }

  return (
    <div
      className={`honorarios-workspace min-h-dvh font-[Inter,ui-sans-serif,system-ui,sans-serif] ${appThemeClass.shell}`}
    >
      <a
        href="#honorarios-main"
        className={`fixed left-3 top-3 z-[80] -translate-y-20 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 py-2 text-sm font-bold text-[var(--color-button-primary-text)] focus:translate-y-0 ${focusRing}`}
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-dvh">
        {navigationOpen && (
          <div
            className="fixed inset-0 z-50 bg-[var(--color-overlay-bg)] backdrop-blur-[2px] lg:hidden"
            onClick={() => setNavigationOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          id="honorarios-sidebar"
          ref={navigationRef}
          tabIndex={-1}
          role={navigationOpen ? 'dialog' : undefined}
          aria-modal={navigationOpen || undefined}
          aria-label={navigationOpen ? 'Menu de Honorários' : undefined}
          className={`fixed inset-y-0 left-0 z-[60] flex h-dvh w-[min(var(--size-sidebar-expanded),calc(100vw-1.5rem))] shrink-0 flex-col border-r shadow-[var(--shadow-floating)] transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-30 lg:visible lg:w-[var(--size-sidebar-expanded)] lg:translate-x-0 lg:shadow-none ${navigationOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'} ${appThemeClass.sidebar}`}
        >
          <div className="flex min-h-[4.5rem] items-center gap-2 border-b border-[var(--color-sidebar-border)] px-3">
            <Link
              to={ROUTES.HONORARIOS}
              onClick={() => setNavigationOpen(false)}
              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-control)] ${focusRing}`}
              aria-label="Ir para o painel de Honorários"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <Icon name="calculator" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-extrabold leading-5 text-[var(--color-text-strong)]">
                  Honorários
                </span>
                <span className="mt-0.5 block truncate text-xs font-medium text-[var(--color-text-muted)]">
                  {activeMembership?.organization.name}
                </span>
              </span>
            </Link>
            <IconButton
              ref={closeRef}
              tone="ghost"
              onClick={() => setNavigationOpen(false)}
              label="Fechar navegação"
              className="size-9 shrink-0 px-0 lg:hidden"
            >
              <Icon name="close" />
            </IconButton>
          </div>
          <nav
            aria-label="Navegação de Honorários"
            className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4"
          >
            <Link
              to={ROUTES.HUB}
              onClick={() => setNavigationOpen(false)}
              className={`mb-4 flex min-h-11 items-center gap-3 rounded-[var(--radius-nav-item)] px-3 text-sm font-semibold text-[var(--color-nav-item-text)] hover:bg-[var(--color-nav-item-hover-bg)] ${focusRing}`}
            >
              <Icon name="modules" />
              Voltar aos módulos
            </Link>
            <div className="mb-4 border-t border-[var(--color-sidebar-border)]" />
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-sidebar-section-text)]">
              Gestão de honorários
            </p>
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    onClick={() => setNavigationOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center gap-3 rounded-[var(--radius-nav-item)] border px-3 text-sm font-semibold transition ${focusRing} ${isActive ? 'border-[var(--color-brand-border)] bg-[var(--color-nav-item-active-bg)] text-[var(--color-nav-item-active-text)]' : 'border-transparent text-[var(--color-nav-item-text)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-strong)]'}`
                    }
                  >
                    <Icon name={link.icon} />
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            {memberships.length > 1 && (
              <div className="mt-6 border-t border-[var(--color-sidebar-border)] pt-4">
                <Select
                  label="Organização ativa"
                  value={activeMembership?.id ?? ''}
                  disabled={!!pending}
                  onChange={(event) =>
                    void changeOrganization(event.target.value)
                  }
                >
                  {memberships.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.organization.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </nav>
          <div
            className="shrink-0 space-y-2 border-t border-[var(--color-sidebar-border)] p-3"
            data-sidebar-profile
          >
            <Link
              to={ROUTES.HUB_PROFILE}
              onClick={() => setNavigationOpen(false)}
              aria-label={`Abrir perfil de ${name}`}
              className={`flex min-h-12 items-center gap-3 rounded-[var(--radius-nav-item)] p-2 hover:bg-[var(--color-nav-item-hover-bg)] ${focusRing}`}
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-xs font-extrabold text-[var(--color-brand)]"
              >
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
                  {name}
                </span>
                <span className="block truncate text-xs text-[var(--color-text-muted)]">
                  {session?.user.email || roleLabel}
                </span>
              </span>
              <Icon name="chevron" />
            </Link>
            <Button
              className="w-full justify-start gap-3"
              tone="ghost"
              disabled={!!pending}
              onClick={() => void leave()}
            >
              <Icon name="logout" />
              {pending === 'logout' ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        </aside>
        <div
          className="flex min-h-dvh min-w-0 flex-1 flex-col"
          inert={navigationOpen || undefined}
          aria-hidden={navigationOpen || undefined}
        >
          <header
            className={`sticky top-0 z-40 flex min-h-[4.5rem] flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur sm:px-6 lg:px-8 ${appThemeClass.topbar}`}
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
                <Icon name="menu" />
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
              <Link
                to={ROUTES.HUB}
                aria-label="Voltar aos módulos"
                title="Voltar aos módulos"
                className={`grid size-9 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] sm:hidden ${focusRing}`}
              >
                <Icon name="modules" />
              </Link>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Button
                size="sm"
                aria-label="Atualizar Honorários"
                title="Atualizar Honorários"
                disabled={isRefreshing || !!pending}
                onClick={onRefresh}
                className="gap-2"
              >
                <Icon
                  name="refresh"
                  className={isRefreshing ? 'animate-spin' : ''}
                />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              {canEdit && (
                <Link
                  to={`${ROUTES.HONORARIOS}/novo`}
                  className={`inline-flex min-h-8 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-3 text-xs font-bold text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] ${focusRing}`}
                >
                  <Icon name="plus" />
                  <span>Novo orçamento</span>
                </Link>
              )}
            </div>
          </header>
          <main
            id="honorarios-main"
            tabIndex={-1}
            className="flex-1 px-4 py-4 outline-none sm:px-6 sm:py-5 lg:px-8"
          >
            <WorkspaceBar title={title} meta={<Badge>{roleLabel}</Badge>} />
            {description && (
              <p className="-mt-2 mb-5 text-sm text-[var(--color-text-muted)]">
                {description}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mb-5 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]"
              >
                {error}
              </p>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

function Icon({
  name,
  className = '',
}: {
  name: IconName
  className?: string
}) {
  const paths: Record<IconName, ReactNode> = {
    modules: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
      </>
    ),
    calculator: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M8 6h8M8 10h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2" />
      </>
    ),
    quotes: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 12h8m-8 4h6" />
      </>
    ),
    clients: (
      <>
        <rect x="4" y="3" width="16" height="19" rx="2" />
        <path d="M8 7h2m4 0h2m-8 4h2m4 0h2M9 22v-6h6v6" />
      </>
    ),
    settings: (
      <>
        <path d="m9 3-1 3-3 1v4l3 1 1 3h4l1-3 3-1V7l-3-1-1-3z" />
        <circle cx="11" cy="9" r="2" />
        <path d="m17 15 1 2 3 1v2l-3 1" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6 8a7 7 0 0 1 12-3l2 2M4 17l2 2a7 7 0 0 0 12-3" />
      </>
    ),
    chevron: <path d="m9 6 6 6-6 6" />,
    logout: (
      <>
        <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5m5-13 5 5-5 5m-7-5h12" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-[18px] shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
