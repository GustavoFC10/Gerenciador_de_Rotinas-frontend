import { Link } from 'react-router'

import { ROUTES } from '../../constants/routes'

export default function ModulesReturnLink({
  isCollapsed = false,
  onNavigate,
}: {
  isCollapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      to={ROUTES.HUB}
      onClick={onNavigate}
      className={`module-return-link ${isCollapsed ? 'module-return-link--collapsed' : ''}`}
      aria-label="Voltar aos módulos"
      title="Voltar aos módulos"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
      <span>Voltar aos módulos</span>
    </Link>
  )
}
