import { Link } from 'react-router'

import Card from '../../components/ui/Card'
import { ROUTES } from '../../constants/routes'

function InternalAccessDeniedPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-app-bg)] px-4 py-8 text-[var(--color-text-main)]">
      <Card className="w-full max-w-lg p-6 text-center sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
          Administracao interna
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text-strong)]">
          Acesso restrito
        </h1>
        <p
          className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]"
          role="alert"
        >
          Sua conta nao possui permissao de staff da plataforma para acessar
          esta area.
        </p>
        <Link
          to={ROUTES.HOME}
          className="mt-6 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 text-sm font-bold text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
        >
          Voltar ao aplicativo
        </Link>
      </Card>
    </main>
  )
}

export default InternalAccessDeniedPage
