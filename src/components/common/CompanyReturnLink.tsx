import { Link, useLocation } from 'react-router'
import { ROUTES } from '../../constants/routes'
import { focusRing } from '../../constants/designTokens'

export default function CompanyReturnLink() {
  const location = useLocation()
  const requested = new URLSearchParams(location.search).get('retorno')
  if (!requested?.startsWith(ROUTES.COMPANY_REGISTRY + '/')) return null
  const target = new URL(requested, 'https://local.invalid')
  if (
    target.origin !== 'https://local.invalid' ||
    !target.pathname.startsWith(ROUTES.COMPANY_REGISTRY + '/')
  )
    return null
  return (
    <Link
      to={target.pathname + target.search}
      className={`mb-4 inline-flex min-h-10 items-center rounded-[var(--radius-control)] text-sm font-semibold text-[var(--color-brand)] ${focusRing}`}
    >
      ← Voltar ao cadastro da empresa
    </Link>
  )
}
