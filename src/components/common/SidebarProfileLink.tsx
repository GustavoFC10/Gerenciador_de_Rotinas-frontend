import { NavLink } from 'react-router'

import { focusRing } from '../../constants/designTokens'
import { ROUTES } from '../../constants/routes'
import type { ImageReference } from '../../types/files'
import UserAvatar from '../ui/UserAvatar'

export default function SidebarProfileLink({
  name,
  description,
  avatar,
  avatarUrl,
  isCollapsed = false,
  onNavigate,
}: {
  name: string
  description: string
  avatar?: ImageReference | null
  avatarUrl?: string
  isCollapsed?: boolean
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={ROUTES.PROFILE}
      onClick={onNavigate}
      title={`Perfil: ${name}`}
      aria-label={`Abrir perfil de ${name}`}
      className={({ isActive }) =>
        `group flex min-h-14 min-w-0 items-center gap-3 rounded-[var(--radius-nav-item)] border p-2 transition motion-reduce:transition-none ${isCollapsed ? 'lg:justify-center lg:p-1' : ''} ${isActive ? 'border-[var(--color-nav-active-border)] bg-[var(--color-nav-item-active-bg)]' : 'border-transparent hover:bg-[var(--color-nav-item-hover-bg)]'} ${focusRing}`
      }
    >
      <UserAvatar name={name} avatar={avatar} avatarUrl={avatarUrl} />
      <span className={`min-w-0 flex-1 ${isCollapsed ? 'lg:sr-only' : ''}`}>
        <span className="app-nav-label block truncate text-[var(--color-text-strong)]">
          {name}
        </span>
        <span className="app-caption mt-0.5 block truncate" title={description}>
          {description}
        </span>
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`size-4 shrink-0 text-[var(--color-text-muted)] ${isCollapsed ? 'lg:hidden' : ''}`}
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </NavLink>
  )
}
