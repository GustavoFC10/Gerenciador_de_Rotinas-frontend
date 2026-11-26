import { Link } from 'react-router'

import NavigationIcon from './NavigationIcon'
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
      <NavigationIcon name="modules" />
      <span>Voltar aos módulos</span>
    </Link>
  )
}
