import PageHeader from '../layouts/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Select from '../components/ui/Select.jsx'
import TextField from '../components/ui/TextField.jsx'
import { appThemeOptions } from '../constants/designTokens.js'
import { useAppState } from '../contexts/AppStateContext.jsx'

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
                theme: event.target.value,
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
                density: event.target.value,
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
