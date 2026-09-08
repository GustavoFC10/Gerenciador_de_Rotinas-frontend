import { Navigate, Route, Routes } from 'react-router'

import { ROUTES } from '../constants/routes'
import InternalAdminLayout from '../layouts/InternalAdminLayout'
import CreateInternalOrganizationPage from '../pages/internal/CreateInternalOrganizationPage'
import InternalOrganizationDetailPage from '../pages/internal/InternalOrganizationDetailPage'
import InternalOrganizationsPage from '../pages/internal/InternalOrganizationsPage'

function InternalAdminRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.INTERNAL} element={<InternalAdminLayout />}>
        <Route
          index
          element={<Navigate to={ROUTES.INTERNAL_ORGANIZATIONS} replace />}
        />
        <Route path="organizations" element={<InternalOrganizationsPage />} />
        <Route
          path="organizations/new"
          element={<CreateInternalOrganizationPage />}
        />
        <Route
          path="organizations/:organizationId"
          element={<InternalOrganizationDetailPage />}
        />
        <Route
          path="*"
          element={<Navigate to={ROUTES.INTERNAL_ORGANIZATIONS} replace />}
        />
      </Route>
    </Routes>
  )
}

export default InternalAdminRoutes
