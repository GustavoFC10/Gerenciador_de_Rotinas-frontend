import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import Badge from '../components/ui/Badge'
import { appThemeClass, focusRing } from '../constants/designTokens'
import { useAuth } from '../hooks/useAuth'

const internalOrganizationsPath = '/internal/organizations'

/**
 * Casca exclusiva do backoffice da plataforma. Não depende da organização
 * ativa, da competência ou da navegação operacional do cliente.
 */
function InternalAdminLayout() {
  const { logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className={`min-h-screen ${appThemeClass.shell}`}>
      <a
        href="#internal-main-content"
        className={`fixed left-3 top-3 z-[80] -translate-y-20 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 py-2 text-sm font-bold text-[var(--color-button-primary-text)] transition-transform focus:translate-y-0 ${focusRing}`}
      >
        Pular para o conteúdo
      </a>

      <header
        className={`sticky top-0 z-40 flex min-h-14 items-center justify-between gap-4 border-b px-4 backdrop-blur sm:px-6 ${appThemeClass.topbar}`}
      >
        <Link
          to={internalOrganizationsPath}
          className={`flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] ${focusRing}`}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
            <PlatformIcon />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-[var(--color-text-strong)] sm:text-base">
              Administração da plataforma
            </span>
            <span className="hidden text-xs font-medium text-[var(--color-text-muted)] sm:block">
              Operações internas
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <Badge variant="brand">INTERNO</Badge>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className={`inline-flex min-h-9 items-center justify-center rounded-[var(--radius-control)] px-3 text-sm font-bold text-[var(--color-brand)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-brand-strong)] disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
          >
            {isLoggingOut ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex min-h-[calc(100vh-6.5rem)] flex-1 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)] md:grid md:grid-cols-[12.5rem_minmax(0,1fr)]">
          <aside
            aria-label="Navegação da administração da plataforma"
            className="border-b border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-3 md:border-b-0 md:border-r md:px-4 md:py-5"
          >
            <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
              Plataforma
            </p>
            <nav>
              <ul className="flex gap-1 md:block md:space-y-1">
                <li className="min-w-0 flex-1 md:w-full">
                  <NavLink
                    to={internalOrganizationsPath}
                    className={({ isActive }) =>
                      `flex min-h-10 w-full min-w-0 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-bold transition ${focusRing} ${
                        isActive
                          ? 'bg-[var(--color-panel-bg)] text-[var(--color-text-strong)] shadow-sm ring-1 ring-[var(--color-panel-border)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]'
                      }`
                    }
                  >
                    <OrganizationsIcon />
                    <span className="truncate">Organizações</span>
                  </NavLink>
                </li>
              </ul>
            </nav>
            <p className="mt-4 hidden border-t border-[var(--color-divider)] px-2 pt-4 text-xs leading-5 text-[var(--color-text-muted)] md:block">
              Área exclusiva para operações de suporte e onboarding.
            </p>
          </aside>

          <main
            id="internal-main-content"
            tabIndex={-1}
            className="min-w-0 px-5 py-6 outline-none sm:px-7 sm:py-7"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

function PlatformIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

function OrganizationsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 21V4h11v17M15 9h5v12M2 21h20" />
      <path d="M8 8h3M8 12h3M8 16h3M18 13h.01M18 17h.01" />
    </svg>
  )
}

export default InternalAdminLayout
