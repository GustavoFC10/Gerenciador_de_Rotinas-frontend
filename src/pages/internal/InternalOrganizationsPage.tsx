import type { ReactNode } from 'react'
import { Link } from 'react-router'

import EmptyState from '../../components/common/EmptyState'
import { InternalPageHeader } from '../../components/internal/InternalAdminPageChrome'
import { InternalOrganizationStatusBadge } from '../../components/internal/InternalOrganizationStatus'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { ROUTES, getInternalOrganizationPath } from '../../constants/routes'
import { focusRing } from '../../constants/designTokens'
import { useInternalOrganizations } from '../../hooks/useInternalOrganizations'

const organizationGrid =
  'lg:grid-cols-[minmax(15rem,1.4fr)_minmax(10rem,0.9fr)_7.5rem_5rem_minmax(11rem,1fr)_8.5rem_1.25rem]'

function InternalOrganizationsPage() {
  const {
    data: organizations = [],
    error,
    isFetching,
    isPending,
    refetch,
  } = useInternalOrganizations()

  if (isPending) {
    return <OrganizationDataState message="Carregando organizacoes..." />
  }

  if (error) {
    return (
      <OrganizationDataState
        message={
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar as organizacoes.'
        }
        isError
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <InternalPageHeader
        breadcrumbs={[
          { label: 'Administracao da plataforma' },
          { label: 'Organizacoes' },
        ]}
        title="Organizacoes"
        description="Acompanhe as organizacoes provisionadas pela equipe da plataforma."
        actions={
          <Link
            to={ROUTES.INTERNAL_ORGANIZATION_CREATE}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 text-sm font-bold text-[var(--color-button-primary-text)] transition hover:bg-[var(--color-button-primary-hover-bg)] ${focusRing}`}
          >
            <PlusIcon />
            Nova organizacao
          </Link>
        }
      />

      <Card variant="flat" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-list-border)] bg-[var(--color-list-bg)] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-black text-[var(--color-text-strong)]">
              Organizacoes provisionadas
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              {organizations.length === 1
                ? '1 organizacao encontrada.'
                : `${organizations.length} organizacoes encontradas.`}
            </p>
          </div>
          {isFetching && (
            <span
              className="text-xs font-bold text-[var(--color-text-muted)]"
              role="status"
            >
              Atualizando...
            </span>
          )}
        </div>

        {organizations.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title="Nenhuma organizacao provisionada"
              description="Crie a primeira organizacao para iniciar o onboarding de um novo cliente."
            />
          </div>
        ) : (
          <>
            <div
              className={`hidden items-center gap-3 border-b border-[var(--color-list-border)] bg-[var(--color-panel-soft-bg)] px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-subtle)] lg:grid ${organizationGrid}`}
              aria-hidden="true"
            >
              <span>Nome</span>
              <span>Identificador</span>
              <span>Status</span>
              <span>Equipe</span>
              <span>Timezone</span>
              <span>Criada em</span>
              <span />
            </div>

            <ul className="divide-y divide-[var(--color-list-border)]">
              {organizations.map((organization) => (
                <li key={organization.id}>
                  <Link
                    to={getInternalOrganizationPath(organization.id)}
                    aria-label={`Abrir organizacao ${organization.name}`}
                    className={`group grid min-w-0 items-center gap-x-3 gap-y-2 bg-[var(--color-list-panel-bg)] px-4 py-4 text-left transition hover:bg-[var(--color-table-row-hover-bg)] focus-visible:z-10 focus-visible:bg-[var(--color-table-row-hover-bg)] lg:min-h-16 lg:py-2.5 ${organizationGrid} ${focusRing}`}
                  >
                    <OrganizationPrimary
                      title={organization.name}
                      description={`${organization.departmentCount} ${organization.departmentCount === 1 ? 'departamento' : 'departamentos'}`}
                    />
                    <ListDatum label="Identificador">
                      {organization.slug}
                    </ListDatum>
                    <ListDatum label="Status">
                      <InternalOrganizationStatusBadge
                        status={organization.status}
                      />
                    </ListDatum>
                    <ListDatum label="Equipe">
                      {organization.memberCount}
                    </ListDatum>
                    <ListDatum label="Timezone">
                      {organization.timezone}
                    </ListDatum>
                    <ListDatum label="Criada em">
                      {formatDate(organization.createdAt)}
                    </ListDatum>
                    <ChevronIcon />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}

function OrganizationDataState({
  message,
  isError = false,
  onRetry,
}: {
  message: string
  isError?: boolean
  onRetry?: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <InternalPageHeader
        breadcrumbs={[
          { label: 'Administracao da plataforma' },
          { label: 'Organizacoes' },
        ]}
        title="Organizacoes"
      />
      <Card className="mt-6 p-6" variant="flat">
        <p
          className={`text-sm font-semibold ${
            isError
              ? 'text-[var(--status-error-text)]'
              : 'text-[var(--color-text-muted)]'
          }`}
          role={isError ? 'alert' : 'status'}
        >
          {message}
        </p>
        {onRetry && (
          <Button className="mt-4" tone="neutral" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </Card>
    </div>
  )
}

function OrganizationPrimary({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-extrabold text-[var(--color-text-strong)] group-hover:text-[var(--color-brand)]">
        {title}
      </span>
      <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
        {description}
      </span>
    </span>
  )
}

function ListDatum({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <span className="min-w-0 break-words text-sm text-[var(--color-text-muted)]">
      <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--color-text-subtle)] lg:sr-only">
        {label}
      </span>
      {children}
    </span>
  )
}

function ChevronIcon() {
  return (
    <span className="hidden justify-self-end text-[var(--color-text-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)] lg:block">
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date)
}

export default InternalOrganizationsPage
