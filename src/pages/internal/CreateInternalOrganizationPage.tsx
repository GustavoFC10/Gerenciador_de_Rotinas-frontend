import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'

import {
  CreationErrorSummary,
  CreationSuccess,
  FieldError,
} from '../../components/forms/CreationFeedback'
import { InternalPageHeader } from '../../components/internal/InternalAdminPageChrome'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import TextField from '../../components/ui/TextField'
import { ROUTES, getInternalOrganizationPath } from '../../constants/routes'
import { focusRing } from '../../constants/designTokens'
import { queryKeys } from '../../query/queryKeys'
import {
  internalOrganizationService,
  type ProvisionOrganizationResponse,
} from '../../services/internalOrganizationService'

interface OrganizationProvisionDraft {
  organizationName: string
  timezone: string
  ownerName: string
  ownerEmail: string
}

type ProvisionField = keyof OrganizationProvisionDraft | 'submit'
type ProvisionErrors = Partial<Record<ProvisionField, string>>

const initialDraft: OrganizationProvisionDraft = {
  organizationName: '',
  timezone: 'America/Sao_Paulo',
  ownerName: '',
  ownerEmail: '',
}

function CreateInternalOrganizationPage() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<OrganizationProvisionDraft>(initialDraft)
  const [errors, setErrors] = useState<ProvisionErrors>({})
  const [submissionError, setSubmissionError] = useState('')
  const [provisionResult, setProvisionResult] =
    useState<ProvisionOrganizationResponse | null>(null)
  const provisionMutation = useMutation({
    mutationFn: (
      input: Parameters<typeof internalOrganizationService.provision>[0],
    ) => internalOrganizationService.provision(input),
  })
  const generatedSlug = createSlug(draft.organizationName)

  function updateDraft<K extends keyof OrganizationProvisionDraft>(
    field: K,
    value: OrganizationProvisionDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      submit: undefined,
    }))
    setSubmissionError('')
  }

  function validate(): ProvisionErrors {
    const nextErrors: ProvisionErrors = {}
    const normalizedEmail = draft.ownerEmail.trim()

    if (!draft.organizationName.trim()) {
      nextErrors.organizationName = 'Informe o nome da organizacao.'
    }

    if (!draft.timezone.trim()) {
      nextErrors.timezone = 'Informe um timezone IANA.'
    }

    if (!draft.ownerName.trim()) {
      nextErrors.ownerName = 'Informe o nome do owner inicial.'
    }

    if (!normalizedEmail) {
      nextErrors.ownerEmail = 'Informe o e-mail do owner inicial.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.ownerEmail = 'Use um endereco de e-mail valido.'
    }

    return nextErrors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setSubmissionError('')

    try {
      const response = await provisionMutation.mutateAsync({
        name: draft.organizationName.trim(),
        ...(generatedSlug ? { slug: generatedSlug } : {}),
        timezone: draft.timezone.trim(),
        ownerName: draft.ownerName.trim(),
        ownerEmail: draft.ownerEmail.trim(),
      })
      setProvisionResult(response.data)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.internalOrganizations(),
      })
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel provisionar a organizacao.',
      )
    }
  }

  function resetForm() {
    setDraft(initialDraft)
    setErrors({})
    setSubmissionError('')
    setProvisionResult(null)
  }

  const errorMessages = Object.values(errors).filter(
    (message): message is string => Boolean(message),
  )

  if (provisionResult) {
    return (
      <ProvisionResult result={provisionResult} onCreateAnother={resetForm} />
    )
  }

  return (
    <div className="mx-auto w-full max-w-[80rem]">
      <InternalPageHeader
        breadcrumbs={[
          { label: 'Administracao da plataforma' },
          { label: 'Organizacoes', to: ROUTES.INTERNAL_ORGANIZATIONS },
          { label: 'Nova organizacao' },
        ]}
        title="Nova organizacao"
        description="Provisione a organizacao e o owner inicial em uma unica operacao."
      />

      <form
        className="pt-6"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <CreationErrorSummary messages={errorMessages} />

        {submissionError && (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-error-text)]"
          >
            {submissionError}
          </p>
        )}

        <div
          className={`grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)] ${
            errorMessages.length > 0 || submissionError ? 'mt-4' : ''
          }`}
        >
          <div className="space-y-5">
            <Card>
              <FormSectionHeader
                eyebrow="Organizacao"
                title="Dados basicos"
                description="O identificador e gerado a partir do nome, e o timezone deve usar o padrao IANA."
              />
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                <div className="sm:col-span-2">
                  <TextField
                    id="internal-organization-name"
                    label="Nome da organizacao *"
                    value={draft.organizationName}
                    onChange={(event) =>
                      updateDraft('organizationName', event.currentTarget.value)
                    }
                    autoComplete="organization"
                    placeholder="Ex.: Escritorio ABC"
                    aria-invalid={Boolean(errors.organizationName)}
                    aria-describedby={
                      errors.organizationName
                        ? 'internal-organization-name-error'
                        : 'internal-organization-name-hint'
                    }
                    disabled={provisionMutation.isPending}
                    required
                  />
                  <p
                    id="internal-organization-name-hint"
                    className="mt-1.5 text-xs text-[var(--color-text-muted)]"
                  >
                    Nome exibido para a organizacao na plataforma.
                  </p>
                  <FieldError id="internal-organization-name-error">
                    {errors.organizationName}
                  </FieldError>
                </div>

                <div>
                  <TextField
                    id="internal-organization-slug"
                    label="Identificador"
                    value={generatedSlug || 'Sera gerado automaticamente'}
                    readOnly
                    aria-describedby="internal-organization-slug-hint"
                  />
                  <p
                    id="internal-organization-slug-hint"
                    className="mt-1.5 text-xs text-[var(--color-text-muted)]"
                  >
                    O backend confirma a unicidade deste identificador.
                  </p>
                </div>

                <div>
                  <TextField
                    id="internal-organization-timezone"
                    label="Timezone *"
                    value={draft.timezone}
                    onChange={(event) =>
                      updateDraft('timezone', event.currentTarget.value)
                    }
                    aria-invalid={Boolean(errors.timezone)}
                    aria-describedby={
                      errors.timezone
                        ? 'internal-organization-timezone-error'
                        : 'internal-organization-timezone-hint'
                    }
                    disabled={provisionMutation.isPending}
                    placeholder="America/Sao_Paulo"
                    required
                  />
                  <p
                    id="internal-organization-timezone-hint"
                    className="mt-1.5 text-xs text-[var(--color-text-muted)]"
                  >
                    Use um identificador IANA; a API valida o timezone
                    informado.
                  </p>
                  <FieldError id="internal-organization-timezone-error">
                    {errors.timezone}
                  </FieldError>
                </div>
              </div>
            </Card>

            <Card>
              <FormSectionHeader
                eyebrow="Owner inicial"
                title="Pessoa responsavel"
                description="A pessoa recebera um convite para acessar sua propria conta. Nao ha senha inicial neste backoffice."
              />
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                <div>
                  <TextField
                    id="internal-owner-name"
                    label="Nome completo *"
                    value={draft.ownerName}
                    onChange={(event) =>
                      updateDraft('ownerName', event.currentTarget.value)
                    }
                    autoComplete="name"
                    placeholder="Ex.: Joao Silva"
                    aria-invalid={Boolean(errors.ownerName)}
                    aria-describedby={
                      errors.ownerName ? 'internal-owner-name-error' : undefined
                    }
                    disabled={provisionMutation.isPending}
                    required
                  />
                  <FieldError id="internal-owner-name-error">
                    {errors.ownerName}
                  </FieldError>
                </div>

                <div>
                  <TextField
                    id="internal-owner-email"
                    label="E-mail *"
                    type="email"
                    value={draft.ownerEmail}
                    onChange={(event) =>
                      updateDraft('ownerEmail', event.currentTarget.value)
                    }
                    autoComplete="email"
                    placeholder="joao@empresa.com.br"
                    aria-invalid={Boolean(errors.ownerEmail)}
                    aria-describedby={
                      errors.ownerEmail
                        ? 'internal-owner-email-error'
                        : 'internal-owner-email-hint'
                    }
                    disabled={provisionMutation.isPending}
                    required
                  />
                  <p
                    id="internal-owner-email-hint"
                    className="mt-1.5 text-xs text-[var(--color-text-muted)]"
                  >
                    A API localiza uma conta existente ou cria o convite sem
                    duplicar a identidade.
                  </p>
                  <FieldError id="internal-owner-email-error">
                    {errors.ownerEmail}
                  </FieldError>
                </div>
              </div>
            </Card>
          </div>

          <ProvisionSummary
            organizationName={draft.organizationName}
            generatedSlug={generatedSlug}
            timezone={draft.timezone}
            ownerName={draft.ownerName}
            ownerEmail={draft.ownerEmail}
          />
        </div>

        <footer className="sticky bottom-0 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[color-mix(in_srgb,var(--color-panel-bg)_94%,transparent)] px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur sm:px-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Campos marcados com * sao obrigatorios.
          </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link
              to={ROUTES.INTERNAL_ORGANIZATIONS}
              className={`inline-flex min-h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] px-3 text-sm font-bold text-[var(--color-button-neutral-text)] transition hover:bg-[var(--color-button-neutral-hover-bg)] ${focusRing}`}
            >
              Cancelar
            </Link>
            <Button type="submit" disabled={provisionMutation.isPending}>
              {provisionMutation.isPending
                ? 'Provisionando...'
                : 'Criar organizacao'}
            </Button>
          </div>
        </footer>
      </form>
    </div>
  )
}

function ProvisionResult({
  result,
  onCreateAnother,
}: {
  result: ProvisionOrganizationResponse
  onCreateAnother: () => void
}) {
  const deliveryFailed = result.delivery === 'failed'

  return (
    <div className="mx-auto w-full max-w-[80rem]">
      <InternalPageHeader
        breadcrumbs={[
          { label: 'Administracao da plataforma' },
          { label: 'Organizacoes', to: ROUTES.INTERNAL_ORGANIZATIONS },
          { label: 'Provisionamento concluido' },
        ]}
        title="Provisionamento concluido"
      />
      <div className="mt-6">
        <CreationSuccess
          eyebrow={deliveryFailed ? 'Entrega pendente' : 'Organizacao criada'}
          title={
            deliveryFailed
              ? 'A organizacao foi criada, mas o convite nao foi entregue.'
              : 'A organizacao e o convite do owner foram criados.'
          }
          description={
            deliveryFailed
              ? 'Os dados foram provisionados. Confirme o e-mail do owner e use o reenvio de convite na tela da organizacao.'
              : 'O owner inicial recebeu um convite para concluir o acesso a organizacao.'
          }
          detail={`Owner: ${result.owner.displayName} (${result.invitation.email})`}
          primaryAction={{
            label: 'Abrir organizacao',
            to: getInternalOrganizationPath(result.organization.id),
          }}
          secondaryAction={{
            label: 'Criar outra organizacao',
            onClick: onCreateAnother,
          }}
        />
        {deliveryFailed && (
          <p
            role="alert"
            className="mx-auto mt-4 max-w-3xl rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-error-text)]"
          >
            A entrega do convite falhou, mas a organizacao e o owner foram
            criados. O convite pode ser reenviado na tela de detalhes.
          </p>
        )}
      </div>
    </div>
  )
}

function FormSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="border-b border-[var(--color-divider)] px-5 py-4 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
        {title}
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    </div>
  )
}

function ProvisionSummary({
  organizationName,
  generatedSlug,
  timezone,
  ownerName,
  ownerEmail,
}: {
  organizationName: string
  generatedSlug: string
  timezone: string
  ownerName: string
  ownerEmail: string
}) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-5">
      <Card>
        <div className="border-b border-[var(--color-divider)] px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
            Previa do provisionamento
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
            {organizationName.trim() || 'Nova organizacao'}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Operacao unica para criar organizacao, owner e convite.
          </p>
        </div>

        <dl className="space-y-4 px-5 py-5">
          <SummaryDatum
            label="Identificador"
            value={generatedSlug || 'Sera gerado a partir do nome'}
          />
          <SummaryDatum label="Timezone" value={timezone} />
          <SummaryDatum
            label="Owner"
            value={ownerName.trim() || 'Nome ainda nao informado'}
          />
          <SummaryDatum
            label="E-mail"
            value={ownerEmail.trim() || 'E-mail ainda nao informado'}
          />
        </dl>
      </Card>

      <Card variant="flat" className="p-5">
        <h2 className="text-sm font-black text-[var(--color-text-strong)]">
          O que sera provisionado
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-5 text-[var(--color-text-muted)]">
          <li className="flex gap-2">
            <CheckIcon />
            Organizacao com o timezone escolhido.
          </li>
          <li className="flex gap-2">
            <CheckIcon />
            Membership do owner inicial.
          </li>
          <li className="flex gap-2">
            <CheckIcon />
            Convite para a pessoa acessar a conta.
          </li>
        </ul>
      </Card>
    </aside>
  )
}

function SummaryDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-black text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 size-4 shrink-0 text-[var(--color-brand)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function createSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default CreateInternalOrganizationPage
