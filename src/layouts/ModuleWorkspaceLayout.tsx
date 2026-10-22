import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'

export default function ModuleWorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  const { activeMembership, memberships, selectActiveMembership, logout } =
    useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isLeaving, setIsLeaving] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  async function handleOrganizationChange(membershipId: string) {
    if (membershipId === activeMembership?.id) return
    setIsSwitching(true)
    setError('')
    try {
      await selectActiveMembership(membershipId)
      navigate(ROUTES.HUB, { replace: true })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível trocar de organização.',
      )
    } finally {
      setIsSwitching(false)
    }
  }

  async function handleLogout() {
    setIsLeaving(true)
    setError('')
    try {
      await logout()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível sair da conta.',
      )
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--color-app-bg)] text-[var(--color-text-main)]">
      <header className="border-b border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to={ROUTES.HUB}
            className={`flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] ${focusRing}`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black text-[var(--color-text-strong)]">
                Áreas de trabalho
              </span>
              <span className="block truncate text-xs text-[var(--color-text-muted)]">
                {activeMembership?.organization.name}
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {memberships.length > 1 && (
              <Select
                id="workspace-organization"
                aria-label="Organização ativa"
                value={activeMembership?.id ?? ''}
                onChange={(event) =>
                  void handleOrganizationChange(event.target.value)
                }
                disabled={isSwitching || isLeaving}
              >
                {memberships.map((membership) => (
                  <option key={membership.id} value={membership.id}>
                    {membership.organization.name}
                  </option>
                ))}
              </Select>
            )}
            <Link
              to={ROUTES.HUB_PROFILE}
              className={`rounded text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-brand)] ${focusRing}`}
            >
              {activeMembership?.displayName}
            </Link>
            <Button
              onClick={() => void handleLogout()}
              disabled={isLeaving || isSwitching}
            >
              {isLeaving ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]"
          >
            {error}
          </p>
        )}
        {children}
      </main>
    </div>
  )
}
