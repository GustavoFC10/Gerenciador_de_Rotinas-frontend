import { NavLink } from 'react-router'

import { focusRing } from '../../constants/designTokens'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth'
import UserAvatar from '../ui/UserAvatar'
import NavigationIcon from './NavigationIcon'

export default function SidebarProfileLink({
  isCollapsed = false,
  onNavigate,
}: {
  isCollapsed?: boolean
  onNavigate: () => void
}) {
  const { activeMembership, user } = useAuth()
  const name = activeMembership?.displayName ?? user?.name ?? 'Perfil'

  return (
    <div
      className={`shrink-0 border-t border-[var(--color-sidebar-border)] p-3 ${isCollapsed ? 'lg:px-2' : ''}`}
      data-sidebar-profile
    >
      <NavLink
        to={ROUTES.PROFILE}
        onClick={onNavigate}
        title={name}
        aria-label={`Abrir perfil de ${name}`}
        className={({ isActive }) =>
          `flex min-h-14 min-w-0 items-center gap-3 rounded-[var(--radius-nav-item)] border p-2 transition motion-reduce:transition-none ${isCollapsed ? 'lg:justify-center lg:p-1' : ''} ${isActive ? 'border-[var(--color-nav-active-border)] bg-[var(--color-nav-item-active-bg)]' : 'border-transparent hover:bg-[var(--color-nav-item-hover-bg)]'} ${focusRing}`
        }
      >
        <UserAvatar
          name={name}
          avatar={activeMembership?.avatar ?? user?.avatar}
          avatarUrl={user?.avatarUrl}
        />
        <span
          className={`app-nav-label min-w-0 flex-1 truncate text-[var(--color-text-strong)] ${isCollapsed ? 'lg:sr-only' : ''}`}
        >
          {name}
        </span>
        <NavigationIcon
          name="chevron-right"
          className={`size-4 text-[var(--color-text-muted)] ${isCollapsed ? 'lg:hidden' : ''}`}
        />
      </NavLink>
    </div>
  )
}
