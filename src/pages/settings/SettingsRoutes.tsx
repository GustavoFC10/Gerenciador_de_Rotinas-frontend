import { Navigate, Route, Routes } from 'react-router'

import SettingsLayout from '../../components/settings/SettingsLayout'
import { ROUTES } from '../../constants/routes'
import type { DepartmentInput } from '../../services/departmentService'
import type { ScreenInput, ScreenPatch } from '../../services/screenService'
import type { RoutineControlData } from '../../types/domain'
import {
  DepartmentScreenCreateSettingsPage,
  DepartmentScreenDetailSettingsPage,
} from './DepartmentScreenSettingsPages'
import {
  DepartmentGeneralSettingsPage,
  DepartmentPermissionsSettingsPage,
  DepartmentScreensSettingsPage,
} from './DepartmentSettingsPages'
import DepartmentsSettingsPage from './DepartmentsSettingsPage'
import IntegrationSettingsPages, {
  IntegrationDetailSettingsPage,
} from './IntegrationSettingsPages'
import OrganizationSettingsPage from './OrganizationSettingsPage'
import SettingsOverviewPage from './SettingsOverviewPage'
import WorkflowsSettingsPage, {
  WorkflowDevelopmentPage,
} from './WorkflowSettingsPages'

interface SettingsRoutesProps {
  data: Pick<
    RoutineControlData,
    'departments' | 'screens' | 'clients' | 'routines'
  >
  onDepartmentCreate: (
    input: DepartmentInput,
  ) => Promise<RoutineControlData['departments'][number]>
  onScreenCreate: (
    input: ScreenInput,
  ) => Promise<RoutineControlData['screens'][number]>
  onScreenUpdate: (
    screenId: string,
    changes: ScreenPatch,
    etag: string,
  ) => Promise<RoutineControlData['screens'][number]>
}

/**
 * Mantém a composição de rotas e as responsabilidades de Configurações fora
 * de App.tsx. O App apenas fornece os dados já carregados e a atualização
 * global depois de uma mutação real.
 */
function SettingsRoutes({
  data,
  onDepartmentCreate,
  onScreenCreate,
  onScreenUpdate,
}: SettingsRoutesProps) {
  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<SettingsOverviewPage />} />
        <Route path="organizacao" element={<OrganizationSettingsPage />} />
        <Route
          path="departamentos"
          element={
            <DepartmentsSettingsPage
              departments={data.departments}
              screens={data.screens}
              onDepartmentCreate={onDepartmentCreate}
            />
          }
        />
        <Route
          path="departamentos/:departmentId"
          element={
            <DepartmentGeneralSettingsPage departments={data.departments} />
          }
        />
        <Route
          path="departamentos/:departmentId/telas"
          element={
            <DepartmentScreensSettingsPage
              departments={data.departments}
              screens={data.screens}
            />
          }
        />
        <Route
          path="departamentos/:departmentId/telas/nova"
          element={
            <DepartmentScreenCreateSettingsPage
              departments={data.departments}
              clients={data.clients}
              routines={data.routines}
              onScreenCreate={onScreenCreate}
            />
          }
        />
        <Route
          path="departamentos/:departmentId/telas/:screenId"
          element={
            <DepartmentScreenDetailSettingsPage
              departments={data.departments}
              clients={data.clients}
              routines={data.routines}
              screens={data.screens}
              onScreenUpdate={onScreenUpdate}
            />
          }
        />
        <Route
          path="departamentos/:departmentId/permissoes"
          element={
            <DepartmentPermissionsSettingsPage departments={data.departments} />
          }
        />
        <Route path="fluxos" element={<WorkflowsSettingsPage />} />
        <Route
          path="fluxos/automacoes"
          element={<WorkflowDevelopmentPage kind="automations" />}
        />
        <Route
          path="fluxos/atalhos"
          element={<WorkflowDevelopmentPage kind="shortcuts" />}
        />
        <Route path="integracoes" element={<IntegrationSettingsPages />} />
        <Route
          path="integracoes/:integrationId"
          element={<IntegrationDetailSettingsPage />}
        />

        <Route path="*" element={<Navigate to={ROUTES.SETTINGS} replace />} />
      </Route>
    </Routes>
  )
}

export default SettingsRoutes
