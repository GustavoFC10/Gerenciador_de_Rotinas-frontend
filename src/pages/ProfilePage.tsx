import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import { appThemeOptions } from '../constants/designTokens'
import { useAppState } from '../hooks/useAppState'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router'
import { ROUTES } from '../constants/routes'
import type { AppDensity, AppTheme } from '../types/domain'

function ProfilePage() {
  const { user, preferences, setPreferences } = useAppState()
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <Card className="max-w-2xl p-5">
      <header className="border-b border-[var(--color-divider)] pb-4">
        <h1 className="text-xl font-extrabold text-[var(--color-text-strong)] sm:text-2xl">
          Perfil e preferências
        </h1>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
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

      <footer className="mt-6 flex justify-end border-t border-[var(--color-divider)] pt-4">
        <Button tone="neutral" onClick={handleLogout}>
          Sair da conta
        </Button>
      </footer>
    </Card>
  )
}

export default ProfilePage
