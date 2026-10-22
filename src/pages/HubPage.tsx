import { Link } from 'react-router'

import Button from '../components/ui/Button'
import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import { useModuleAccess } from '../hooks/useModuleAccess'
import ModuleWorkspaceLayout from '../layouts/ModuleWorkspaceLayout'
import type { AppModule } from '../types/modules'

const destinations: {
  module: AppModule | 'team'
  title: string
  description: string
  to: string
}[] = [
  {
    module: 'team',
    title: 'Equipe',
    description:
      'Gerencie os colaboradores, convites, cargos e acessos aos módulos do escritório.',
    to: ROUTES.EMPLOYEES,
  },
  {
    module: 'routines',
    title: 'Rotinas',
    description:
      'Acompanhe tarefas, competências e entregas da equipe em cada departamento.',
    to: ROUTES.HOME,
  },
  {
    module: 'processes',
    title: 'Processos',
    description:
      'Gerencie aberturas, alterações e demais processos do escritório, do início à conclusão.',
    to: ROUTES.PROCESSES,
  },
]

export default function HubPage() {
  const { activeMembership } = useAuth()
  const { modules, isLoading, error, refetch } = useModuleAccess()
  const canManage = activeMembership?.role === 'owner'
  return (
    <ModuleWorkspaceLayout>
      <header className="max-w-2xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-brand)]">
          Seu escritório
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-text-strong)] sm:text-4xl">
          Onde vamos trabalhar?
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Escolha um módulo para continuar. Você pode voltar a esta página para
          trocar de área a qualquer momento.
        </p>
      </header>
      {isLoading ? (
        <p
          className="mt-8 text-sm text-[var(--color-text-muted)]"
          role="status"
        >
          Carregando seus módulos…
        </p>
      ) : error ? (
        <div
          className="mt-8 rounded-[var(--radius-panel)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-5"
          role="alert"
        >
          <p className="text-sm font-bold text-[var(--status-error-text)]">
            Não foi possível atualizar seus acessos.
          </p>
          <Button className="mt-3" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : modules.length === 0 && !canManage ? (
        <div className="mt-8 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-6">
          <h2 className="font-bold text-[var(--color-text-strong)]">
            Nenhum módulo disponível
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Solicite ao administrador do escritório a liberação dos seus
            acessos.
          </p>
        </div>
      ) : null}
      <section
        aria-label="Módulos disponíveis"
        className={`mt-8 grid gap-5 md:grid-cols-2 ${canManage ? 'xl:grid-cols-3' : ''}`}
      >
        {destinations
          .filter((item) =>
            item.module === 'team'
              ? canManage
              : modules.some((module) => module.module === item.module),
          )
          .map((item) => {
            const access = modules.find(
              (module) => module.module === item.module,
            )
            return (
              <Link
                key={item.module}
                to={item.to}
                className={`group flex min-h-64 flex-col rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-6 shadow-[var(--shadow-panel)] transition hover:border-[var(--color-brand-border)] hover:bg-[var(--color-control-hover-bg)] sm:p-8 ${focusRing}`}
              >
                <span className="grid size-12 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                  <ModuleIcon module={item.module} />
                </span>
                <h2 className="mt-5 text-xl font-black text-[var(--color-text-strong)]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  {item.description}
                </p>
                {!!access?.sectors.length && (
                  <p className="mt-4 text-xs font-semibold text-[var(--color-text-muted)]">
                    {access.sectors.map((sector) => sector.name).join(' · ')}
                  </p>
                )}
                <span className="mt-6 flex flex-1 items-end text-sm font-extrabold text-[var(--color-brand)]">
                  Acessar {item.title.toLocaleLowerCase('pt-BR')}{' '}
                  <span
                    aria-hidden="true"
                    className="ml-2 transition group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </Link>
            )
          })}
      </section>
    </ModuleWorkspaceLayout>
  )
}

function ModuleIcon({ module }: { module: AppModule | 'team' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {module === 'team' ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.65" />
        </>
      ) : module === 'processes' ? (
        <>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M9 5V3h6v2M8 10h8M8 14h8M8 18h4" />
        </>
      ) : (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 4v16M14.5 9v11" />
        </>
      )}
    </svg>
  )
}
