import { useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import MemberModuleFields from '../components/forms/MemberModuleFields'
import {
  initialModuleAccesses,
  moduleAccessError,
  moduleAccessPayload,
} from '../utils/memberModuleAccess'
import type { Department, OrganizationRole } from '../types/domain'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import Select from '../components/ui/Select'
import { useAppState } from '../hooks/useAppState'
import { useOverlayDialog } from '../hooks/useOverlayDialog'
import { confirmDiscard, useUnsavedChanges } from '../hooks/useUnsavedChanges'
import type {
  MembershipInvitationInput,
  MembershipInvitationResource,
} from '../services/organizationMemberService'
import { isOwner } from '../utils/permissions'
import '../components/catalog/directory.css'

export default function CreateEmployeePage({
  onInvite,
  onCancel,
  departments = [],
}: {
  departments?: Department[]
  onInvite: (
    input: MembershipInvitationInput,
  ) => Promise<MembershipInvitationResource>
  onCancel: () => void
}) {
  const { user } = useAppState()
  const ref = useRef<HTMLElement>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>('member')
  const [accesses, setAccesses] = useState(initialModuleAccesses)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [invitation, setInvitation] =
    useState<MembershipInvitationResource | null>(null)
  const dirty =
    !invitation &&
    (!!name ||
      !!email ||
      role !== 'member' ||
      accesses.some((access) => access.enabled))
  useUnsavedChanges(dirty)
  function close() {
    if (!busy && confirmDiscard(dirty)) onCancel()
  }
  useOverlayDialog(ref, close)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const normalizedEmail = email.trim().toLocaleLowerCase('pt-BR')
    const problem = !name.trim()
      ? 'Informe o nome da pessoa.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        ? 'Use um endereço de e-mail válido.'
        : role === 'owner' && !isOwner(user)
          ? 'Escolha um papel permitido.'
          : moduleAccessError(accesses)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setBusy(true)
    try {
      setInvitation(
        await onInvite({
          displayName: name.trim(),
          email: normalizedEmail,
          role,
          moduleAccesses: moduleAccessPayload(accesses),
        }),
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível enviar o convite.',
      )
    } finally {
      setBusy(false)
    }
  }
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-[var(--color-overlay-bg)]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invitation-title"
        tabIndex={-1}
        className="flex h-dvh w-full max-w-2xl flex-col border-l border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--color-divider)] p-4 sm:px-6">
          <h1 id="invitation-title" className="app-page-title">
            Convidar pessoa
          </h1>
          <Button
            aria-label="Fechar convite"
            data-overlay-close
            disabled={busy}
            onClick={close}
          >
            ×
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {invitation ? (
            <section role="status" className="space-y-4">
              <h2 className="app-section-title">Convite enviado</h2>
              <p>
                {invitation.displayName} · {invitation.email}
              </p>
              <p className="app-description">
                A pessoa receberá um e-mail para criar o próprio acesso.
              </p>
              <Button
                onClick={() => {
                  setName('')
                  setEmail('')
                  setRole('member')
                  setAccesses(initialModuleAccesses())
                  setInvitation(null)
                }}
              >
                Convidar outra pessoa
              </Button>
            </section>
          ) : (
            <form
              id="employee-invitation-form"
              onSubmit={(event) => void submit(event)}
              noValidate
            >
              {error && (
                <p
                  role="alert"
                  className="mb-4 text-sm text-[var(--status-error-text)]"
                >
                  {error}
                </p>
              )}
              <fieldset disabled={busy} className="record-section min-w-0">
                <legend className="app-component-title mb-4">
                  Identificação
                </legend>
                <div className="space-y-4">
                  <TextField
                    id="employee-name"
                    label="Nome"
                    value={name}
                    maxLength={160}
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                  <TextField
                    id="employee-email"
                    type="email"
                    label="E-mail"
                    value={email}
                    maxLength={254}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Select
                    id="employee-role"
                    label="Papel na organização"
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as OrganizationRole)
                    }
                  >
                    <option value="member">Colaborador</option>
                    <option value="admin">Administrador</option>
                    {isOwner(user) && (
                      <option value="owner">Proprietário</option>
                    )}
                  </Select>
                </div>
              </fieldset>
              <section className="record-section">
                <h2>Acessos aos módulos</h2>
                <MemberModuleFields
                  value={accesses}
                  onChange={setAccesses}
                  departments={departments}
                  disabled={busy}
                />
              </section>
            </form>
          )}
        </div>
        <footer className="record-actions">
          <span className="app-caption">
            {invitation
              ? 'Convite enviado por e-mail'
              : 'O papel não concede acesso automático aos módulos.'}
          </span>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={close}>
              {invitation ? 'Ir para equipe' : 'Cancelar'}
            </Button>
            {!invitation && (
              <Button
                tone="primary"
                type="submit"
                form="employee-invitation-form"
                disabled={busy}
              >
                {busy ? 'Enviando…' : 'Enviar convite'}
              </Button>
            )}
          </div>
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
