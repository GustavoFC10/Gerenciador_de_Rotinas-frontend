import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import Button from '../components/ui/Button'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'

function AcceptInvitationPage() {
  const { isAuthenticated, refreshSession } = useAuth()
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      setError('O link de convite não contém um token válido.')
      return
    }

    if (!password || !passwordConfirm) {
      setError('Informe e confirme sua senha.')
      return
    }

    if (password !== passwordConfirm) {
      setError('As senhas informadas não coincidem.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await authService.acceptInvitation({
        token,
        password,
        passwordConfirm,
      })

      if (isAuthenticated) {
        await refreshSession().catch(() => undefined)
      }

      window.history.replaceState(null, '', window.location.pathname)
      setPassword('')
      setPasswordConfirm('')
      setIsAccepted(true)
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Não foi possível aceitar o convite. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const destination = isAuthenticated ? ROUTES.HOME : ROUTES.LOGIN

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-app-bg)] px-4 py-8 text-[var(--color-text-main)] sm:px-8">
      <section className="w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-floating)] sm:p-8">
        <BrandMark />

        {isAccepted ? (
          <div className="mt-8">
            <p className="text-sm font-bold text-[var(--color-brand)]">
              Convite aceito
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-strong)] sm:text-3xl">
              Seu acesso está pronto.
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              {isAuthenticated
                ? 'A associação foi adicionada à sua conta.'
                : 'Entre com seu e-mail e a senha que você acabou de definir.'}
            </p>
            <Button
              tone="primary"
              className="mt-7 w-full"
              onClick={() => navigate(destination, { replace: true })}
            >
              {isAuthenticated ? 'Ir para a área de trabalho' : 'Ir para o login'}
            </Button>
          </div>
        ) : (
          <>
            <header className="mt-8">
              <p className="text-sm font-bold text-[var(--color-brand)]">
                Convite para a área de trabalho
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-strong)] sm:text-3xl">
                Defina ou confirme sua senha
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                Informe sua senha para concluir seu acesso. Se já tem uma conta,
                use sua senha atual.
              </p>
            </header>

            {!token ? (
              <div
                className="mt-7 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--status-error-text)]"
                role="alert"
              >
                O link de convite não contém um token válido.
              </div>
            ) : (
              <form
                className="mt-7 space-y-5"
                onSubmit={handleSubmit}
                noValidate
              >
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">
                  <span className="mb-1.5 block">Senha</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError('')
                    }}
                    placeholder="Informe sua senha"
                    required
                    autoFocus
                    className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2.5 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                  />
                </label>

                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">
                  <span className="mb-1.5 block">Confirme sua senha</span>
                  <input
                    type="password"
                    name="passwordConfirm"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(event) => {
                      setPasswordConfirm(event.target.value)
                      setError('')
                    }}
                    placeholder="Repita sua senha"
                    required
                    className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2.5 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                  />
                </label>

                {error && (
                  <p
                    className="rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--status-error-text)]"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  tone="primary"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Aceitando convite...' : 'Aceitar convite'}
                </Button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 4v16M14.5 9v11" />
        </svg>
      </span>
      <div>
        <p className="text-lg font-black leading-5 text-[var(--color-text-strong)]">
          Rotinas
        </p>
        <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
          Controle por áreas de trabalho
        </p>
      </div>
    </div>
  )
}

export default AcceptInvitationPage
