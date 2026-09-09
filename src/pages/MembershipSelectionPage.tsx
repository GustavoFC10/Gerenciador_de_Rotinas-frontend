import { useState } from 'react'

import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'

function MembershipSelectionPage() {
  const { memberships, logout, selectActiveMembership } = useAuth()
  const [pendingMembershipId, setPendingMembershipId] = useState<string | null>(
    null,
  )
  const [error, setError] = useState('')

  async function handleSelection(membershipId: string) {
    setPendingMembershipId(membershipId)
    setError('')

    try {
      await selectActiveMembership(membershipId)
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Não foi possível selecionar a organização.',
      )
      setPendingMembershipId(null)
    }
  }

  async function handleLogout() {
    setError('')

    try {
      await logout()
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Não foi possível sair da conta.',
      )
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-app-bg)] px-4 py-8 text-[var(--color-text-main)]">
      <section className="w-full max-w-lg rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-floating)] sm:p-8">
        <header>
          <p className="text-sm font-bold text-[var(--color-brand)]">
            Organização ativa
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-strong)]">
            Escolha onde deseja trabalhar
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            A organização selecionada define o escopo das próximas requisições.
          </p>
        </header>

        {memberships.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {memberships.map((membership) => {
              const isPending = pendingMembershipId === membership.id

              return (
                <li
                  key={membership.id}
                  className="flex items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-[var(--color-text-strong)]">
                      {membership.organization.name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {membership.displayName} · {roleLabel(membership.role)}
                    </p>
                  </div>
                  <Button
                    tone="primary"
                    size="sm"
                    disabled={pendingMembershipId !== null}
                    onClick={() => void handleSelection(membership.id)}
                  >
                    {isPending ? 'Entrando...' : 'Selecionar'}
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-6 rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4 text-sm text-[var(--color-text-muted)]">
            Sua conta não possui uma associação ativa. Solicite acesso a um
            administrador.
          </p>
        )}

        {error && (
          <p
            className="mt-4 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--status-error-text)]"
            role="alert"
          >
            {error}
          </p>
        )}

        <footer className="mt-6 flex justify-end border-t border-[var(--color-divider)] pt-4">
          <Button
            tone="neutral"
            disabled={pendingMembershipId !== null}
            onClick={() => void handleLogout()}
          >
            Sair da conta
          </Button>
        </footer>
      </section>
    </main>
  )
}

function roleLabel(role: 'owner' | 'admin' | 'member'): string {
  if (role === 'owner') return 'Proprietário'
  if (role === 'admin') return 'Administrador'
  return 'Colaborador'
}

export default MembershipSelectionPage
