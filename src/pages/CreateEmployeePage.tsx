import { useMemo, useState, type FormEvent } from 'react'

import {
  CreationErrorSummary,
  CreationSuccess,
  FieldError,
} from '../components/forms/CreationFeedback'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import { ORGANIZATION_ROLE } from '../constants/roles'
import { ROUTES } from '../constants/routes'
import { focusRing } from '../constants/designTokens'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type {
  MembershipInvitationInput,
  MembershipInvitationResource,
} from '../services/organizationMemberService'
import type { OrganizationRole } from '../types/domain'
import { isOwner } from '../utils/permissions'

interface CreateEmployeePageProps {
  onInvite: (
    input: MembershipInvitationInput,
  ) => Promise<MembershipInvitationResource>
  onCancel: () => void
}

interface InvitationDraft {
  displayName: string
  email: string
  role: OrganizationRole
}

type InvitationField = 'displayName' | 'email' | 'role' | 'submit'
type InvitationErrors = Partial<Record<InvitationField, string>>

const initialDraft: InvitationDraft = {
  displayName: '',
  email: '',
  role: ORGANIZATION_ROLE.MEMBER,
}

const invitationRoles: Array<{
  value: OrganizationRole
  label: string
  description: string
  permissionSummary: string
}> = [
  {
    value: ORGANIZATION_ROLE.MEMBER,
    label: 'Colaborador',
    description:
      'Participa dos departamentos que receberem acesso após a ativação.',
    permissionSummary: 'Acesso definido por departamento',
  },
  {
    value: ORGANIZATION_ROLE.ADMIN,
    label: 'Administrador',
    description:
      'Administra a organização e também pode atuar nos departamentos.',
    permissionSummary: 'Acesso administrativo',
  },
  {
    value: ORGANIZATION_ROLE.OWNER,
    label: 'Proprietário',
    description:
      'Mantém a administração máxima da organização e seus integrantes.',
    permissionSummary: 'Acesso administrativo máximo',
  },
]

function CreateEmployeePage({ onInvite, onCancel }: CreateEmployeePageProps) {
  const { user } = useAppState()
  const [draft, setDraft] = useState<InvitationDraft>(initialDraft)
  const [errors, setErrors] = useState<InvitationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitation, setInvitation] =
    useState<MembershipInvitationResource | null>(null)

  const allowedRoles = useMemo(
    () =>
      invitationRoles.filter(
        (role) => role.value !== ORGANIZATION_ROLE.OWNER || isOwner(user),
      ),
    [user],
  )
  const selectedRole =
    allowedRoles.find((role) => role.value === draft.role) ??
    invitationRoles[0]!

  if (invitation) {
    return (
      <div className="mx-auto w-full max-w-[90rem]">
        <WorkspaceBar
          context={{ label: 'Cadastros', to: ROUTES.HOME }}
          label="Equipe"
          title="Adicionar colaborador"
        />
        <CreationSuccess
          eyebrow="Convite enviado"
          title={invitation.displayName}
          description="O convite foi enviado por e-mail. A pessoa cria o próprio acesso ao aceitar; os departamentos são configurados depois que o colaborador estiver ativo."
          detail={
            selectedRole.label +
            ' · expira em ' +
            formatInvitationExpiry(invitation.expiresAt)
          }
          primaryAction={{ label: 'Ir para equipe', to: ROUTES.EMPLOYEES }}
          secondaryAction={{
            label: 'Convidar outra pessoa',
            onClick: () => {
              setDraft(initialDraft)
              setErrors({})
              setInvitation(null)
            },
          }}
        />
      </div>
    )
  }

  function updateDraft<K extends keyof InvitationDraft>(
    field: K,
    value: InvitationDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    if (field in errors) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  function validate(): InvitationErrors {
    const nextErrors: InvitationErrors = {}
    const email = draft.email.trim().toLocaleLowerCase('pt-BR')

    if (!draft.displayName.trim()) {
      nextErrors.displayName = 'Informe o nome da pessoa.'
    }

    if (!email) {
      nextErrors.email = 'Informe o e-mail que receberá o convite.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Use um endereço de e-mail válido.'
    }

    if (!allowedRoles.some((role) => role.value === draft.role)) {
      nextErrors.role = 'Escolha um cargo organizacional permitido.'
    }

    return nextErrors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const createdInvitation = await onInvite({
        displayName: draft.displayName.trim(),
        email: draft.email.trim().toLocaleLowerCase('pt-BR'),
        role: draft.role,
      })
      setErrors({})
      setInvitation(createdInvitation)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : 'Não foi possível enviar o convite.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        context={{ label: 'Cadastros', to: ROUTES.HOME }}
        label="Equipe"
        title="Adicionar colaborador"
        meta="Convite e acesso"
      />

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <CreationErrorSummary
          messages={Object.values(errors).filter((message): message is string =>
            Boolean(message),
          )}
        />

        <div
          className={
            'grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)] ' +
            (Object.values(errors).some(Boolean) ? 'mt-4' : '')
          }
        >
          <div className="space-y-5">
            <Card>
              <SectionHeader
                eyebrow="Identidade"
                title="Dados do convite"
                description="O e-mail identifica o convite. A senha e o acesso à conta são definidos pela própria pessoa após aceitar."
              />
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                <div className="sm:col-span-2">
                  <TextField
                    id="employee-name"
                    label="Nome completo *"
                    value={draft.displayName}
                    onChange={(event) =>
                      updateDraft('displayName', event.target.value)
                    }
                    autoComplete="name"
                    aria-invalid={Boolean(errors.displayName)}
                    aria-describedby={
                      errors.displayName ? 'employee-name-error' : undefined
                    }
                    placeholder="Ex.: Mariana Costa"
                    required
                  />
                  <FieldError id="employee-name-error">
                    {errors.displayName}
                  </FieldError>
                </div>

                <div className="sm:col-span-2">
                  <TextField
                    id="employee-email"
                    label="E-mail para convite *"
                    type="email"
                    value={draft.email}
                    onChange={(event) =>
                      updateDraft('email', event.target.value)
                    }
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email
                        ? 'employee-email-error'
                        : 'employee-email-hint'
                    }
                    placeholder="mariana@empresa.com.br"
                    required
                  />
                  <p
                    id="employee-email-hint"
                    className="mt-1.5 text-xs text-[var(--color-text-muted)]"
                  >
                    O backend envia o convite para este endereço.
                  </p>
                  <FieldError id="employee-email-error">
                    {errors.email}
                  </FieldError>
                </div>
              </div>
            </Card>

            <Card>
              <SectionHeader
                eyebrow="Permissões"
                title="Cargo organizacional"
                description="O cargo se aplica à organização inteira. O papel dentro de cada departamento é configurado depois da ativação do convite."
              />
              <fieldset
                className="space-y-2 px-5 py-5 sm:px-6"
                aria-invalid={Boolean(errors.role)}
                aria-describedby={
                  errors.role ? 'employee-role-error' : undefined
                }
              >
                <legend className="sr-only">Cargo organizacional</legend>
                {allowedRoles.map((role) => {
                  const selected = draft.role === role.value

                  return (
                    <label
                      key={role.value}
                      className={
                        'flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-4 transition ' +
                        (selected
                          ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)]'
                          : 'border-[var(--color-divider)] bg-[var(--color-panel-bg)] hover:bg-[var(--color-control-hover-bg)]') +
                        ' ' +
                        focusRing
                      }
                    >
                      <input
                        type="radio"
                        name="employee-role"
                        value={role.value}
                        checked={selected}
                        onChange={() => updateDraft('role', role.value)}
                        className="mt-1 size-4 accent-[var(--color-brand)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-[var(--color-text-strong)]">
                            {role.label}
                          </span>
                          {role.value !== ORGANIZATION_ROLE.MEMBER && (
                            <span className="rounded-full bg-[var(--status-progress-bg)] px-2 py-0.5 text-[11px] font-black text-[var(--status-progress-text)] ring-1 ring-[var(--status-progress-border)]">
                              Acesso elevado
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-[var(--color-text-muted)]">
                          {role.description}
                        </span>
                      </span>
                    </label>
                  )
                })}
                <FieldError id="employee-role-error">{errors.role}</FieldError>
              </fieldset>
            </Card>

            <Card>
              <SectionHeader
                eyebrow="Escopo"
                title="Acesso aos departamentos"
                description="Essa configuração usa o identificador do colaborador, que só existe depois que o convite é aceito."
              />
              <div className="px-5 py-5 sm:px-6">
                <div className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4">
                  <p className="text-sm font-black text-[var(--color-text-strong)]">
                    Próxima etapa após a ativação
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                    Abra o perfil do colaborador ativo para definir os
                    departamentos e o papel de lead, contributor ou viewer. O
                    identificador retornado agora é do convite, não do
                    colaborador.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="xl:sticky xl:top-5">
            <div className="border-b border-[var(--color-divider)] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
                Resumo do convite
              </p>
              <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
                {draft.displayName.trim() || 'Nova pessoa'}
              </h2>
              <p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
                {draft.email.trim() || 'E-mail ainda não informado'}
              </p>
            </div>
            <dl className="space-y-4 px-5 py-5">
              <div>
                <dt className="text-xs font-bold text-[var(--color-text-muted)]">
                  Cargo
                </dt>
                <dd className="mt-1 text-sm font-black text-[var(--color-text-strong)]">
                  {selectedRole.label}
                </dd>
                <dd className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                  {selectedRole.permissionSummary}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-[var(--color-text-muted)]">
                  Departamentos
                </dt>
                <dd className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                  Serão definidos após o aceite do convite.
                </dd>
              </div>
            </dl>
            {draft.role !== ORGANIZATION_ROLE.MEMBER && (
              <div className="border-t border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] px-5 py-4">
                <p className="text-sm font-bold text-[var(--status-progress-text)]">
                  Este convite concede acesso organizacional elevado. Confirme o
                  cargo antes de enviar.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="sticky bottom-0 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[color-mix(in_srgb,var(--color-panel-bg)_94%,transparent)] px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur sm:px-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Campos marcados com * são obrigatórios.
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              tone="neutral"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button type="submit" tone="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar convite'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function SectionHeader({
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

function formatInvitationExpiry(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default CreateEmployeePage
