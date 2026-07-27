import PageHeader from '../layouts/PageHeader'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import { appThemeOptions } from '../constants/designTokens'
import { useAppState } from '../hooks/useAppState'
import type { AppDensity, AppTheme } from '../types/domain'

function ProfilePage() {
  const { user, preferences, setPreferences } = useAppState()

  return (
    <>
      <PageHeader
        size="compact"
        title="Perfil"
        description="Configuracoes basicas do usuario e preferencias visuais."
      />

      <Card className="max-w-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nome" value={user.name} readOnly />
          <TextField label="Email" value={user.email} readOnly />
          <Select
            label="Tema"
            value={preferences.theme}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                theme: event.target.value as AppTheme,
              }))
            }
          >
            {appThemeOptions.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </Select>
          <Select
            label="Densidade"
            value={preferences.density}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                density: event.target.value as AppDensity,
              }))
            }
          >
            <option value="compact">Compacta</option>
            <option value="comfortable">Confortavel</option>
          </Select>
        </div>
      </Card>
    </>
  )
}

export default ProfilePage
