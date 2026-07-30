import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import Button from '../components/ui/Button'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import { mockLoginCredentials } from '../services/authService'

interface LoginLocationState {
  from?: string
}

function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const returnPath = getReturnPath(location.state)

  if (isAuthenticated) {
    return <Navigate to={returnPath} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate(returnPath, { replace: true })
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Não foi possível entrar. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function fillDemoCredentials() {
    setEmail(mockLoginCredentials.email)
    setPassword(mockLoginCredentials.password)
    setError('')
  }

  return (
    <main className="min-h-dvh bg-[var(--color-app-bg)] text-[var(--color-text-main)] lg:grid lg:grid-cols-[minmax(22rem,0.92fr)_minmax(30rem,1.08fr)]">
      <section className="relative hidden overflow-hidden border-r border-[var(--color-sidebar-border)] bg-[var(--color-brand-strong)] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div
          className="pointer-events-none absolute -right-28 top-16 size-80 rounded-full border border-white/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-36 -left-20 size-96 rounded-full bg-white/5"
          aria-hidden="true"
        />

        <BrandMark inverted />

        <div className="relative max-w-lg">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">
            Trabalho operacional
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight xl:text-5xl">
            Suas áreas de trabalho em um só lugar.
          </h1>
          <p className="mt-5 max-w-md text-base font-medium leading-7 text-white/75">
            Entre para acompanhar a competência, abrir as rotinas da sua equipe
            e resolver pendências sem sair do fluxo da área de trabalho.
          </p>

          <div className="mt-9 rounded-[var(--radius-panel)] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-extrabold">Planilha Fiscal</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
                06/2026
              </span>
            </div>
            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 pt-3 text-xs font-semibold">
              <span className="rounded bg-white/10 p-2.5">Empresa</span>
              <span className="rounded bg-amber-300/20 p-2.5 text-amber-100">
                Em andamento
              </span>
              <span className="rounded bg-emerald-300/20 p-2.5 text-emerald-100">
                Concluída
              </span>
            </div>
          </div>
        </div>

        <p className="relative text-xs font-semibold text-white/55">
          Controle simples, direto e organizado por competência.
        </p>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden">
            <BrandMark />
          </div>

          <div className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-floating)] sm:p-8">
            <header>
              <p className="text-sm font-bold text-[var(--color-brand)]">
                Bem-vindo
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-strong)] sm:text-3xl">
                Acesse sua conta
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                Use seu e-mail corporativo para continuar.
              </p>
            </header>

            <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">
                <span className="mb-1.5 block">E-mail</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError('')
                  }}
                  placeholder="nome@empresa.com"
                  required
                  autoFocus
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2.5 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                />
              </label>

              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">
                <span className="mb-1.5 block">Senha</span>
                <span className="relative block">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError('')
                    }}
                    placeholder="Digite sua senha"
                    required
                    className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] py-2.5 pl-3 pr-16 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 px-3 text-xs font-bold text-[var(--color-brand)] outline-none hover:text-[var(--color-brand-strong)] focus-visible:underline"
                    aria-label={
                      showPassword ? 'Ocultar senha' : 'Mostrar senha'
                    }
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </span>
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
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <aside className="mt-6 rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Acesso de desenvolvimento
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                    Conta temporária enquanto o backend não está conectado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="shrink-0 rounded-[var(--radius-control)] px-2 py-1 text-xs font-extrabold text-[var(--color-brand)] outline-none hover:bg-[var(--color-brand-soft)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                >
                  Preencher
                </button>
              </div>
            </aside>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-[var(--color-text-muted)]">
            A senha não é armazenada neste navegador.
          </p>
        </div>
      </section>
    </main>
  )
}

function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="relative flex items-center gap-3">
      <span
        className={`grid size-10 place-items-center rounded-[var(--radius-control)] ${
          inverted
            ? 'bg-white/15 text-white ring-1 ring-white/20'
            : 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
        }`}
      >
        <SpreadsheetIcon />
      </span>
      <div>
        <p
          className={`text-lg font-black leading-5 ${
            inverted ? 'text-white' : 'text-[var(--color-text-strong)]'
          }`}
        >
          Rotinas
        </p>
        <p
          className={`mt-0.5 text-xs font-semibold ${
            inverted ? 'text-white/65' : 'text-[var(--color-text-muted)]'
          }`}
        >
          Controle por áreas de trabalho
        </p>
      </div>
    </div>
  )
}

function SpreadsheetIcon() {
  return (
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
  )
}

function getReturnPath(state: unknown): string {
  const from = (state as LoginLocationState | null)?.from

  if (
    typeof from !== 'string' ||
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from.startsWith(ROUTES.LOGIN)
  ) {
    return ROUTES.HOME
  }

  return from
}

export default LoginPage
