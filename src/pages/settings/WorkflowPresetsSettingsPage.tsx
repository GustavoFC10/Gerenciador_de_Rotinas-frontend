import { SettingsPageHeader } from '../../components/settings/SettingsPageChrome'
import { ROUTES } from '../../constants/routes'
import RoutinePresetsPage from '../RoutinePresetsPage'
import type { Routine } from '../../types/domain'

function WorkflowPresetsSettingsPage({ routines }: { routines: Routine[] }) {
  return (
    <RoutinePresetsPage
      routines={routines}
      header={
        <SettingsPageHeader
          breadcrumbs={[
            { label: 'Configurações', to: ROUTES.SETTINGS },
            { label: 'Fluxos de trabalho', to: ROUTES.SETTINGS_WORKFLOWS },
            { label: 'Predefinições' },
          ]}
          title="Predefinições"
          description="Configure padrões reutilizáveis para operações recorrentes."
        />
      }
    />
  )
}

export default WorkflowPresetsSettingsPage
