import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import EmptyState from '../../components/common/EmptyState'
import {
  InternalPageHeader,
  InternalSection,
} from '../../components/internal/InternalAdminPageChrome'
import {
  InternalInvitationStatusBadge,
  InternalOrganizationStatusBadge,
} from '../../components/internal/InternalOrganizationStatus'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import TextField from '../../components/ui/TextField'
import { ROUTES } from '../../constants/routes'
import { focusRing } from '../../constants/designTokens'
import { useInternalOrganization } from '../../hooks/useInternalOrganizations'
import { queryKeys } from '../../query/queryKeys'
import { isApiError } from '../../services/httpClient'
import {
  internalOrganizationService,
  type InternalOrganizationDetailResource,
  type InternalOwnerResource,
} from '../../services/internalOrganizationService'

type SupportNotice =
  | { tone: 'success'; message: string }
  | { tone: 'error'; message: string }
  | null

function InternalOrganizationDetailPage() {
  const { organizationId } = useParams()
  const queryClient = useQueryClient()
  const {
    data: organization,
    error,
    isFetching,
    isPending,
    refetch,
  } = useInternalOrganization(organizationId)
  const [isAddingOwner, setIsAddingOwner] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerFormError, setOwnerFormError] = useState('')
  const [notice, setNotice] = useState<SupportNotice>(null)
  const addOwnerMutation = useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) => {
      if (!organizationId) {
        throw new Error('A organizacao nao foi informada.')
      }

      return internalOrganizationService.addOwner(organizationId, {
        name,
        email,
      })
    },
  })
  const resendInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      internalOrganizationService.resendInvitation(invitationId),
  })

  if (!organizationId) {
    return <UnknownOrganizationState />
  }

  if (isPending) {
    return <OrganizationDetailDataState message="Carregando organizacao..." />
  }

  if (error) {
    if (isApiError(error) && error.status === 404) {
      return <UnknownOrganizationState />
    }

    return (
      <OrganizationDetailDataState
        message={
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar a organizacao.'
        }
        isError
        onRetry={() => void refetch()}
      />
    )
  }

  if (!organization) {
    return <UnknownOrganizationState />
  }

  const currentOrganizationId = organizationId

  async function refreshOrganization(targetOrganizationId: string) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.internalOrganization(targetOrganizationId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.internalOrganizations(),
      }),
    ])
  }

  async function handleAddOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = ownerName.trim()
    const email = ownerEmail.trim()

    if (!name || !email) {
      setOwnerFormError('Informe o nome e o e-mail do owner.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOwnerFormError('Use um endereco de e-mail valido.')
      return
    }

    setOwnerFormError('')
    setNotice(null)

    try {
      const response = await addOwnerMutation.mutateAsync({ name, email })
      await refreshOrganization(currentOrganizationId)
      setOwnerName('')
      setOwnerEmail('')
      setIsAddingOwner(false)
      setNotice({
        tone: 'success',
        message: `Convite para ${response.data.email} criado com sucesso.`,
      })
    } catch (caughtError) {
      setOwnerFormError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Nao foi possivel adicionar o owner.',
      )
    }
  }

  async function handleResendInvitation(invitationId: string, email: string) {
    setNotice(null)

    try {
      const response = await resendInvitationMutation.mutateAsync(invitationId)
      await refreshOrganization(currentOrganizationId)
      setNotice({
        tone: 'success',
        message: `Convite para ${response.data.email || email} reenviado.`,
      })
    } catch (caughtError) {
      setNotice({
        tone: 'error',
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Nao foi possivel reenviar o convite.',
      })
    }
  }

  return (
    <OrganizationDetail
      organization={organization}
      isRefreshing={isFetching}
      isAddingOwner={isAddingOwner}
      ownerName={ownerName}
      ownerEmail={ownerEmail}
      ownerFormError={ownerFormError}
      isAddingOwnerPending={addOwnerMutation.isPending}
      isResendingInvitationId={
        resendInvitationMutation.isPending
          ? resendInvitationMutation.variables
          : null
      }
      notice={notice}
      onAddOwnerOpen={() => {
        setIsAddingOwner(true)
        setOwnerFormError('')
        setNotice(null)
      }}
      onAddOwnerCancel={() => {
        setIsAddingOwner(false)
        setOwnerFormError('')
      }}
      onOwnerNameChange={setOwnerName}
      onOwnerEmailChange={setOwnerEmail}
      onAddOwnerSubmit={handleAddOwner}
      onResendInvitation={(invitationId, email) =>
        void handleResendInvitation(invitationId, email)
      }
    />
  )
}

function OrganizationDetail({
  organization,
  isRefreshing,
  isAddingOwner,
  ownerName,
  ownerEmail,
  ownerFormError,
  isAddingOwnerPending,
  isResendingInvitationId,
  notice,
  onAddOwnerOpen,
  onAddOwnerCancel,
  onOwnerNameChange,
  onOwnerEmailChange,
  onAddOwnerSubmit,
  onResendInvitation,
}: {
  organization: InternalOrganizationDetailResource
  isRefreshing: boolean
  isAddingOwner: boolean
  ownerName: string
  ownerEmail: string
  ownerFormError: string
  isAddingOwnerPending: boolean
  isResendingInvitationId: string | null
  notice: SupportNotice
  onAddOwnerOpen: () => void
  onAddOwnerCancel: () => void
  onOwnerNameChange: (value: string) => void
  onOwnerEmailChange: (value: string) => void
  onAddOwnerSubmit: (event: FormEvent<HTMLFormElement>) => void
  onResendInvitation: (invitationId: string, email: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-[80rem]">
      <InternalPageHeader
        breadcrumbs={[
          { label: 'Administracao da plataforma' },
          { label: 'Organizacoes', to: ROUTES.INTERNAL_ORGANIZATIONS },
          { label: organization.name },
        ]}
        title={organization.name}
        description="Informacoes de suporte e onboarding da organizacao selecionada."
        actions={
          <Link
            to={ROUTES.INTERNAL_ORGANIZATIONS}
            className={`inline-flex min-h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] px-3 text-sm font-bold text-[var(--color-button-neutral-text)] transition hover:bg-[var(--color-button-neutral-hover-bg)] ${focusRing}`}
          >
            Ver organizacoes
          </Link>
        }
      />

      <div className="space-y-5 pt-6">
        {isRefreshing && (
          <p
            className="text-sm font-semibold text-[var(--color-text-muted)]"
            role="status"
          >
            Atualizando organizacao...
          </p>
        )}

        <Card className="p-5 sm:p-6" variant="flat">
          <InternalSection
            title="Visao geral"
            description="Dados basicos que ajudam a equipe da plataforma durante o onboarding e o suporte."
          >
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <OrganizationDatum label="Nome" value={organization.name} />
              <OrganizationDatum
                label="Identificador"
                value={organization.slug}
              />
              <OrganizationDatum
                label="Timezone"
                value={organization.timezone}
              />
              <OrganizationDatum
                label="Criada em"
                value={formatDate(organization.createdAt)}
              />
              <div className="border-l-2 border-[var(--color-divider)] pl-4">
                <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
                  Status
                </dt>
                <dd className="mt-2">
                  <InternalOrganizationStatusBadge
                    status={organization.status}
                  />
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Membros"
                value={String(organization.memberCount)}
                description="Pessoas vinculadas a organizacao."
              />
              <MetricCard
                label="Departamentos"
                value={String(organization.departmentCount)}
                description="Areas configuradas para a operacao."
              />
            </div>
          </InternalSection>
        </Card>

        <Card className="p-5 sm:p-6" variant="flat">
          <InternalSection
            title="Owners e convites"
            description="Acompanhe os responsaveis iniciais e o estado de seus convites de acesso."
            action={
              !isAddingOwner ? (
                <Button tone="neutral" onClick={onAddOwnerOpen}>
                  Adicionar owner
                </Button>
              ) : undefined
            }
          >
            {isAddingOwner && (
              <AddOwnerForm
                name={ownerName}
                email={ownerEmail}
                error={ownerFormError}
                isSubmitting={isAddingOwnerPending}
                onNameChange={onOwnerNameChange}
                onEmailChange={onOwnerEmailChange}
                onCancel={onAddOwnerCancel}
                onSubmit={onAddOwnerSubmit}
              />
            )}

            {organization.owners.length > 0 ? (
              <ul className="divide-y divide-[var(--color-list-border)] overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-list-border)] bg-[var(--color-panel-bg)]">
                {organization.owners.map((owner) => (
                  <OwnerRow
                    key={owner.id}
                    owner={owner}
                    isResending={
                      isResendingInvitationId === owner.invitation?.id
                    }
                    onResend={onResendInvitation}
                  />
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Nenhum owner encontrado"
                description="Adicione um owner para iniciar o acesso a esta organizacao."
              />
            )}

            {notice && (
              <p
                role={notice.tone === 'error' ? 'alert' : 'status'}
                className={`mt-4 rounded-[var(--radius-control)] border px-4 py-3 text-sm font-semibold ${
                  notice.tone === 'error'
                    ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
                    : 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]'
                }`}
              >
                {notice.message}
              </p>
            )}
          </InternalSection>
        </Card>
      </div>
    </div>
  )
}

function AddOwnerForm({
  name,
  email,
  error,
  isSubmitting,
  onNameChange,
  onEmailChange,
  onCancel,
  onSubmit,
}: {
  name: string
  email: string
  error: string
  isSubmitting: boolean
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form
      className="mb-5 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] p-4"
      onSubmit={(event) => void onSubmit(event)}
      noValidate
    >
      <h3 className="text-sm font-black text-[var(--color-text-strong)]">
        Novo owner
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TextField
          id="internal-add-owner-name"
          label="Nome completo"
          value={name}
          onChange={(event) => onNameChange(event.currentTarget.value)}
          autoComplete="name"
          disabled={isSubmitting}
          required
        />
        <TextField
          id="internal-add-owner-email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.currentTarget.value)}
          autoComplete="email"
          disabled={isSubmitting}
          required
        />
      </div>
      {error && (
        <p
          className="mt-3 text-sm font-semibold text-[var(--status-error-text)]"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button tone="neutral" disabled={isSubmitting} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando convite...' : 'Adicionar owner'}
        </Button>
      </div>
    </form>
  )
}

function OwnerRow({
  owner,
  isResending,
  onResend,
}: {
  owner: InternalOwnerResource
  isResending: boolean
  onResend: (invitationId: string, email: string) => void
}) {
  const invitation = owner.invitation
  const canResend =
    invitation &&
    owner.status !== 'active' &&
    ['pending', 'expired'].includes(invitation.status)

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap">
        <OwnerAvatar name={owner.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-extrabold text-[var(--color-text-strong)]">
              {owner.displayName}
            </p>
            <Badge variant="brand">Owner</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">
            {owner.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <MembershipStatus status={owner.status} />
            {invitation ? (
              <>
                <InternalInvitationStatusBadge status={invitation.status} />
                <span className="text-xs text-[var(--color-text-muted)]">
                  Expira em {formatDate(invitation.expiresAt)}
                </span>
              </>
            ) : (
              <span className="text-xs text-[var(--color-text-muted)]">
                Sem convite pendente
              </span>
            )}
          </div>
        </div>
        {canResend && invitation && (
          <Button
            tone="neutral"
            disabled={isResending}
            onClick={() => onResend(invitation.id, owner.email)}
          >
            {isResending ? 'Reenviando...' : 'Reenviar convite'}
          </Button>
        )}
      </div>
    </li>
  )
}

function OrganizationDetailDataState({
  message,
  isError = false,
  onRetry,
}: {
  message: string
  isError?: boolean
  onRetry?: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-[80rem]">
      <InternalPageHeader
        breadcrumbs={[
          { label: 'Administracao da plataforma' },
          { label: 'Organizacoes', to: ROUTES.INTERNAL_ORGANIZATIONS },
        ]}
        title="Organizacao"
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

function UnknownOrganizationState() {
  return (
    <div className="mx-auto w-full max-w-[80rem]">
      <InternalPageHeader
        breadcrumbs={[
          { label: 'Administracao da plataforma' },
          { label: 'Organizacoes', to: ROUTES.INTERNAL_ORGANIZATIONS },
          { label: 'Organizacao nao encontrada' },
        ]}
        title="Organizacao nao encontrada"
        description="Verifique o endereco ou volte para a lista de organizacoes."
      />

      <Card className="mt-6 p-5" variant="flat">
        <EmptyState
          title="Nao ha dados para esta organizacao"
          description="A organizacao pode nao existir mais ou sua conta nao possui acesso a ela."
        />
        <div className="mt-4 flex justify-center">
          <Link
            to={ROUTES.INTERNAL_ORGANIZATIONS}
            className={`rounded-[var(--radius-control)] text-sm font-bold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] ${focusRing}`}
          >
            Voltar para organizacoes
          </Link>
        </div>
      </Card>
    </div>
  )
}

function OwnerAvatar({ name }: { name: string }) {
  const initial = name.trim().slice(0, 1).toLocaleUpperCase('pt-BR') || 'O'

  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-sm font-black text-[var(--color-brand)]">
      {initial}
    </span>
  )
}

function MembershipStatus({
  status,
}: {
  status: InternalOwnerResource['status']
}) {
  const label =
    status === 'active'
      ? 'Acesso ativo'
      : status === 'pending'
        ? 'Aguardando aceite'
        : status === 'suspended'
          ? 'Acesso suspenso'
          : 'Acesso inativo'

  return (
    <span
      className={`text-xs font-bold ${
        status === 'active'
          ? 'text-[var(--status-completed-text)]'
          : 'text-[var(--color-text-muted)]'
      }`}
    >
      {label}
    </span>
  )
}

function OrganizationDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-[var(--color-divider)] pl-4">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-extrabold text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-[var(--color-text-strong)]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date)
}

export default InternalOrganizationDetailPage
