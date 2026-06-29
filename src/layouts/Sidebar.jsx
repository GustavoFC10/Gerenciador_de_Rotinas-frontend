import { NavLink } from 'react-router-dom'

import { appThemeClass } from '../constants/designTokens.js'
import { ROUTES } from '../constants/routes.js'
import { useAppState } from '../contexts/AppStateContext.jsx'
import { canManageEmployees, isLeader, isManager } from '../utils/permissions.js'

const baseNavClass =
  'block border-l-4 px-3 py-2.5 text-sm font-bold transition'

function Sidebar() {
  const { user } = useAppState()

  return (
    <aside className={`hidden w-60 shrink-0 border-r p-3 lg:block ${appThemeClass.sidebar}`}>
      <div className="mb-5 border-b border-[var(--color-divider)] pb-4">
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${appThemeClass.brandText}`}>
          Rotinas
        </p>
        <h1 className={`mt-1 text-lg font-black ${appThemeClass.strongText}`}>
          Operacao
        </h1>
      </div>

      <nav className="space-y-4">
        <NavGroup title="Inicio">
          <NavItem to={ROUTES.HOME}>Home</NavItem>
        </NavGroup>

        <NavGroup title="Operacao">
          <NavItem to={ROUTES.SPREADSHEET}>Planilha - Fiscal</NavItem>
          <NavItem to={ROUTES.MY_TASKS}>Minhas tarefas</NavItem>
          <NavItem to={ROUTES.SEARCH}>Busca</NavItem>
        </NavGroup>

        {isLeader(user) && (
          <NavGroup title="Gestao">
            <NavItem to={ROUTES.DEPARTMENT_DASHBOARD}>Dashboard</NavItem>
            <NavItem to={ROUTES.ROUTINES}>Rotinas</NavItem>
            <NavItem to={ROUTES.COMPANIES}>Empresas</NavItem>
            <NavItem to={ROUTES.EMPLOYEES}>Funcionarios</NavItem>
          </NavGroup>
        )}

        {isManager(user) && (
          <NavGroup title="Administracao">
            <NavItem to={ROUTES.MANAGER_DASHBOARD}>Dashboard geral</NavItem>
            {canManageEmployees(user) && (
              <NavItem to={ROUTES.ROLES}>Cargos</NavItem>
            )}
          </NavGroup>
        )}

      </nav>
    </aside>
  )
}

function NavGroup({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </p>
      <div className="divide-y divide-[var(--color-nav-group-border)] overflow-hidden border border-[var(--color-nav-group-border)] bg-[var(--color-nav-item-bg)] shadow-[var(--shadow-panel)]">
        {children}
      </div>
    </div>
  )
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${baseNavClass} ${
          isActive
            ? 'border-[var(--color-nav-active-border)] bg-[var(--color-nav-item-active-bg)] text-[var(--color-nav-item-active-text)]'
            : 'border-transparent bg-[var(--color-nav-item-bg)] text-[var(--color-nav-item-text)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-nav-item-active-text)]'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default Sidebar
