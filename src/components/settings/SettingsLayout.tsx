import { NavLink, Outlet } from 'react-router'

import { focusRing } from '../../constants/designTokens'
import { ROUTES } from '../../constants/routes'

const navigationItems = [
  { to: ROUTES.SETTINGS, label: 'Visão geral', end: true },
  { to: ROUTES.SETTINGS_ORGANIZATION, label: 'Organização' },
  { to: ROUTES.SETTINGS_ARCHIVED, label: 'Arquivados' },
  { to: ROUTES.SETTINGS_DEPARTMENTS, label: 'Departamentos' },
  { to: ROUTES.SETTINGS_WORKFLOWS, label: 'Fluxos de trabalho' },
  { to: ROUTES.SETTINGS_INTEGRATIONS, label: 'Integrações' },
]

/**
 * Casca compartilhada da área administrativa da organização.
 * Há somente esta navegação contextual; os níveis internos usam rotas e
 * breadcrumb, nunca painéis laterais adicionais.
 */
function SettingsLayout() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-1 flex-col">
      <div className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)] xl:grid xl:min-h-[42rem] xl:grid-cols-[12.5rem_minmax(0,1fr)]">
        <aside
          aria-label="Navegação de configurações"
          className="rounded-t-[var(--radius-panel)] border-b border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-4 xl:rounded-l-[var(--radius-panel)] xl:rounded-tr-none xl:border-b-0 xl:border-r xl:px-4 xl:py-5"
        >
          <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            Configurações
          </p>
          <nav>
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-1">
              {navigationItems.map((item) => (
                <li key={item.to} className="min-w-0">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex h-full min-h-10 w-full min-w-0 items-center rounded-[var(--radius-control)] px-3 py-2 text-sm font-bold leading-5 transition ${focusRing} ${
                        isActive
                          ? 'bg-[var(--color-panel-bg)] text-[var(--color-text-strong)] shadow-sm ring-1 ring-[var(--color-panel-border)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]'
                      }`
                    }
                  >
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="@container/settings min-w-0 px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default SettingsLayout
