import { useState } from 'react'
import { useNavigate } from 'react-router'

import Card from '../components/ui/Card'
import ImageEditor from '../components/files/ImageEditor'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import UserAvatar from '../components/ui/UserAvatar'
import { appThemeOptions } from '../constants/designTokens'
import { useAppState } from '../hooks/useAppState'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../constants/routes'
import type { AppDensity, AppTheme } from '../types/domain'

function ProfilePage() {
  const { user, preferences, setPreferences } = useAppState()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setIsLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      navigate(ROUTES.LOGIN, { replace: true })
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : 'Não foi possível sair da conta.',
      )
      setIsLoggingOut(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl p-4 sm:p-5">
      <header className="border-b border-[var(--color-divider)] pb-4">
        <h1 className="app-page-title">Perfil e preferências</h1>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <UserAvatar
          name={user.name}
          avatar={user.avatar}
          avatarUrl={user.avatarUrl}
          size="lg"
        />
        <ImageEditor
          destination={{
            purpose: 'member_avatar',
            target: { memberId: user.membershipId },
          }}
          label={user.name}
          showPreview={false}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField label="Nome" value={user.name} readOnly />
        <TextField label="Email" value={user.email} readOnly />
      </div>

      <fieldset className="mt-6 min-w-0 border-t border-[var(--color-divider)] pt-4">
        <legend className="app-section-title pr-2">Preferências</legend>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="min-w-0">
            <Select
              label="Densidade"
              aria-describedby="profile-density-description"
              value={preferences.density}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  density: event.target.value as AppDensity,
                }))
              }
            >
              <option value="compact">Compacta</option>
              <option value="comfortable">Confortável</option>
            </Select>
            <p id="profile-density-description" className="app-caption mt-2">
              Espaçamento dos itens da navegação.
            </p>
          </div>
        </div>
      </fieldset>

      {logoutError && (
        <p
          className="mt-5 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--status-error-text)]"
          role="alert"
        >
          {logoutError}
        </p>
      )}

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-divider)] pt-4">
        <p className="app-caption">Preferências aplicadas automaticamente.</p>
        <Button
          tone="neutral"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
        >
          {isLoggingOut ? 'Saindo...' : 'Sair da conta'}
        </Button>
      </footer>
    </Card>
  )
}

export default ProfilePage
