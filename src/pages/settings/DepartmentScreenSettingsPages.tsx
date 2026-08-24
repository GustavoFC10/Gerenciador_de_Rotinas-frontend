import { Navigate, useNavigate, useParams } from 'react-router'

import { DepartmentSettingsHeader } from '../../components/settings/SettingsPageChrome'
import {
  getSettingsDepartmentPath,
  getSettingsDepartmentScreensPath,
  ROUTES,
} from '../../constants/routes'
import CreateScreenPage from '../CreateScreenPage'
import { ScreenEditDrawer } from '../ScreensPage'
import { screenService } from '../../services/screenService'
import type {
  Client,
  Department,
  Routine,
  Screen,
} from '../../types/domain'

interface DepartmentScreenSettingsPageProps {
  departments: Department[]
  clients: Client[]
  routines: Routine[]
  screens: Screen[]
  onReload: () => Promise<void>
}

export function DepartmentScreenCreateSettingsPage({
  departments,
  clients,
  routines,
  onReload,
}: Omit<DepartmentScreenSettingsPageProps, 'screens'>) {
  const navigate = useNavigate()
  const { departmentId } = useParams()
  const department = departments.find((item) => item.id === departmentId)

  if (!department) {
    return <Navigate to={ROUTES.SETTINGS_DEPARTMENTS} replace />
  }

  return (
    <CreateScreenPage
      departments={departments}
      clients={clients}
      routines={routines}
      fixedDepartmentId={department.id}
      onCreate={async (input) => {
        const { data: screen } = await screenService.create(input)
        await onReload()
        return screen
      }}
      onCancel={() => navigate(getSettingsDepartmentScreensPath(department.id))}
      header={
        <DepartmentSettingsHeader
          departmentId={department.id}
          departmentName={department.name}
          title="Nova tela"
          description="Crie uma visualização para organizar o trabalho deste departamento."
          trailingBreadcrumbs={[
            {
              label: 'Telas',
              to: getSettingsDepartmentScreensPath(department.id),
            },
            { label: 'Nova tela' },
          ]}
        />
      }
    />
  )
}

export function DepartmentScreenDetailSettingsPage({
  departments,
  clients,
  routines,
  screens,
  onReload,
}: DepartmentScreenSettingsPageProps) {
  const navigate = useNavigate()
  const { departmentId, screenId } = useParams()
  const department = departments.find((item) => item.id === departmentId)
  const screen = screens.find((item) => item.id === screenId && !item.archivedAt)

  if (!department) {
    return <Navigate to={ROUTES.SETTINGS_DEPARTMENTS} replace />
  }

  if (!screen) {
    return (
      <Navigate
        to={getSettingsDepartmentScreensPath(department.id)}
        replace
      />
    )
  }

  if (screen.departmentId !== department.id) {
    return (
      <Navigate
        to={getSettingsDepartmentPath(screen.departmentId)}
        replace
      />
    )
  }

  return (
    <>
      <DepartmentSettingsHeader
        departmentId={department.id}
        departmentName={department.name}
        title={screen.name}
        description="Configure a estrutura e a composição desta visualização."
        trailingBreadcrumbs={[
          {
            label: 'Telas',
            to: getSettingsDepartmentScreensPath(department.id),
          },
          { label: screen.name },
        ]}
      />

      <section className="pt-6">
        <ScreenEditDrawer
          presentation="page"
          screen={screen}
          departments={departments}
          clients={clients}
          routines={routines}
          onSaved={onReload}
          onSavedNavigate={(nextDepartmentId) =>
            navigate(getSettingsDepartmentScreensPath(nextDepartmentId))
          }
          onClose={() => navigate(getSettingsDepartmentScreensPath(department.id))}
        />
      </section>
    </>
  )
}
