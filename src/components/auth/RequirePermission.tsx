import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth'
import type { EntityId } from '../../types/domain'
import { hasAppPermission, type AppPermission } from '../../utils/permissions'

interface RequirePermissionProps {
  permission: AppPermission
  departmentIds?: EntityId[]
  fallbackPath?: string
  children?: ReactNode
}

function RequirePermission({
  permission,
  departmentIds = [],
  fallbackPath = ROUTES.HOME,
  children,
}: RequirePermissionProps) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    )
  }

  if (!hasAppPermission(user, permission, departmentIds)) {
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{ accessDenied: true, deniedPermission: permission }}
      />
    )
  }

  return children ?? <Outlet />
}

export default RequirePermission
