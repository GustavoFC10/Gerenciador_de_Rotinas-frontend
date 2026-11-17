import { useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import ImageEditor from '../files/ImageEditor'
import Button from '../ui/Button'
import Select from '../ui/Select'
import TextField from '../ui/TextField'
import UserAvatar from '../ui/UserAvatar'
import { DirectoryStatus, RecordDatum } from '../catalog/Directory'
import MemberModuleFields from './MemberModuleFields'
import {
  initialModuleAccesses,
  moduleAccessError,
  moduleAccessPayload,
  moduleAccessLabels,
} from '../../utils/memberModuleAccess'
import { useNotifications } from '../../hooks/useNotifications'
import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import {
  confirmDiscard,
  useUnsavedChanges,
} from '../../hooks/useUnsavedChanges'
import {
  organizationMemberService,
  type OrganizationMemberResource,
} from '../../services/organizationMemberService'
import type { Department, OrganizationRole } from '../../types/domain'
import { focusRing } from '../../constants/designTokens'

export default function EmployeeProfilePanel({
  member,
  departments,
  canManage,
  canAssignOwner,
  onMemberChange,
  onClose,
  initialTab = 'profile',
  onTabChange,
}: {
  member: OrganizationMemberResource
  departments: Department[]
  canManage: boolean
  canAssignOwner: boolean
  onMemberChange: (member: OrganizationMemberResource) => Promise<void>
  onClose: () => void
  initialTab?: 'profile' | 'access'
  onTabChange?: (tab: 'profile' | 'access') => void
}) {
  const panelRef = useRef<HTMLElement>(null)
  const { notify } = useNotifications()
  const [tab, setTab] = useState(initialTab)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(member.displayName)
  const [role, setRole] = useState(member.role)
  const [accesses, setAccesses] = useState(() => initialModuleAccesses(member))
  const [error, setError] = useState('')
  const canEdit = canManage && (canAssignOwner || member.role !== 'owner')
  const canEditAccesses =
    canEdit && ['active', 'pending'].includes(member.status)
  const update = useMutation({
    mutationFn: (
      input: Parameters<typeof organizationMemberService.update>[1],
    ) => organizationMemberService.update(member.id, input),
  })
  const offboard = useMutation({
    mutationFn: () => organizationMemberService.offboard(member.id),
  })
  const busy = update.isPending || offboard.isPending
  const fingerprint = (
    name: string,
    nextRole: OrganizationRole,
    grants: ReturnType<typeof initialModuleAccesses>,
  ) =>
    JSON.stringify([
      name,
      nextRole,
      moduleAccessPayload(grants).sort((a, b) =>
        a.module.localeCompare(b.module),
      ),
    ])
  const dirty =
    editing &&
    fingerprint(displayName, role, accesses) !==
      fingerprint(
        member.displayName,
        member.role,
        initialModuleAccesses(member),
      )
  useUnsavedChanges(dirty)
  function close() {
    if (!busy && confirmDiscard(dirty)) onClose()
  }
  useOverlayDialog(panelRef, close)
  function reset() {
    setDisplayName(member.displayName)
    setRole(member.role)
    setAccesses(initialModuleAccesses(member))
    setEditing(false)
    setError('')
  }
  function cancel() {
    if (!busy && confirmDiscard(dirty)) reset()
  }
  function changeTab(next: 'profile' | 'access') {
    if (busy || !confirmDiscard(dirty)) return
    reset()
    setTab(next)
    onTabChange?.(next)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || busy || !editing || !dirty) return
    const problem = !displayName.trim()
      ? 'Informe o nome do colaborador.'
      : canEditAccesses
        ? moduleAccessError(accesses)
        : undefined
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    try {
      const response = await update.mutateAsync({
        displayName: displayName.trim(),
        ...(role !== member.role ? { role } : {}),
        ...(canEditAccesses
          ? { moduleAccesses: moduleAccessPayload(accesses) }
          : {}),
      })
      await onMemberChange(response.data)
      setEditing(false)
      setDisplayName(response.data.displayName)
      setRole(response.data.role)
      setAccesses(initialModuleAccesses(response.data))
      notify({ title: 'Perfil e acessos atualizados.', tone: 'success' })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar o perfil.',
      )
    }
  }
  async function deactivate() {
    if (
      !canEdit ||
      busy ||
      member.status !== 'active' ||
      member.role === 'owner' ||
      !window.confirm(
        `Desativar o acesso de ${member.displayName}? Esta ação encerra o vínculo na organização.`,
      )
    )
      return
    setError('')
    try {
      const response = await offboard.mutateAsync()
      await onMemberChange(response.data)
      setEditing(false)
      notify({ title: 'Acesso do colaborador desativado.', tone: 'success' })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível desativar o colaborador.',
      )
    }
  }
  const roleLabel = (value: OrganizationRole) =>
    value === 'owner'
      ? 'Proprietário'
      : value === 'admin'
        ? 'Administrador'
        : 'Colaborador'
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-[var(--color-overlay-bg)]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-profile-title"
        tabIndex={-1}
        className="flex h-dvh w-full max-w-2xl flex-col border-l border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
      >
        <header className="flex items-start justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="app-caption mb-4">Ficha da pessoa</p>
            <div className="flex items-center gap-3">
              <UserAvatar name={member.displayName} avatar={member.avatar} />
              <div className="min-w-0">
                <h2 id="employee-profile-title" className="app-page-title">
                  {member.displayName}
                </h2>
                <p className="app-description mt-1">{member.email}</p>
                <div className="mt-2">
                  <DirectoryStatus status={member.status} />
                </div>
              </div>
            </div>
          </div>
          <Button
            aria-label="Fechar perfil"
            data-overlay-close
            onClick={close}
            disabled={busy}
          >
            ×
          </Button>
        </header>
        <nav className="record-tabs" aria-label="Seções da ficha">
          <button
            type="button"
            className={focusRing}
            aria-pressed={tab === 'profile'}
            onClick={() => changeTab('profile')}
          >
            Perfil
          </button>
          <button
            type="button"
            className={focusRing}
            aria-pressed={tab === 'access'}
            onClick={() => changeTab('access')}
          >
            Acessos
          </button>
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <form
            id="employee-profile-form"
            onSubmit={(event) => void save(event)}
          >
            {error && (
              <p
                role="alert"
                className="mb-4 text-sm text-[var(--status-error-text)]"
              >
                {error}
              </p>
            )}
            {tab === 'profile' ? (
              editing ? (
                <div className="space-y-4">
                  <TextField
                    id="employee-profile-name"
                    label="Nome"
                    value={displayName}
                    maxLength={160}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!canEdit || busy}
                    required
                  />
                  <Select
                    id="employee-profile-role"
                    label="Papel na organização"
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as OrganizationRole)
                    }
                    disabled={!canEdit || busy}
                  >
                    {(
                      [
                        'member',
                        'admin',
                        ...(canAssignOwner || member.role === 'owner'
                          ? ['owner']
                          : []),
                      ] as OrganizationRole[]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {roleLabel(value)}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <>
                  <section className="record-section">
                    <h3>Perfil</h3>
                    <dl className="record-data">
                      <RecordDatum label="Nome" wide>
                        {member.displayName}
                      </RecordDatum>
                      <RecordDatum label="E-mail" wide>
                        {member.email}
                      </RecordDatum>
                      <RecordDatum label="Papel na organização">
                        {roleLabel(member.role)}
                      </RecordDatum>
                      <RecordDatum label="Entrada">
                        {member.joinedAt
                          ? formatDate(member.joinedAt)
                          : 'Convite pendente'}
                      </RecordDatum>
                      <RecordDatum label="Cadastro">
                        {formatDate(member.createdAt)}
                      </RecordDatum>
                      <RecordDatum label="Última atualização">
                        {formatDate(member.updatedAt)}
                      </RecordDatum>
                    </dl>
                  </section>
                  <div className="mt-5">
                    <ImageEditor
                      destination={{
                        purpose: 'member_avatar',
                        target: { memberId: member.id },
                      }}
                      label={member.displayName}
                      showPreview={false}
                    />
                  </div>
                </>
              )
            ) : editing ? (
              <MemberModuleFields
                value={accesses}
                onChange={setAccesses}
                departments={departments}
                disabled={!canEditAccesses || busy}
              />
            ) : (
              <>
                <section className="record-section">
                  <h3>Acessos aos módulos</h3>
                  <ul className="space-y-3">
                    {moduleAccessLabels(member).map((label) => (
                      <li
                        className="rounded-[var(--radius-control)] border border-[var(--color-divider)] p-3 text-sm break-words"
                        key={label}
                      >
                        {label}
                      </li>
                    ))}
                  </ul>
                  {member.moduleAccesses === undefined && (
                    <p className="app-description">
                      {member.departmentAccesses
                        .map(
                          (access) =>
                            `${access.departmentName} · ${access.role}`,
                        )
                        .join(', ') || 'Sem acessos configurados.'}
                    </p>
                  )}
                </section>
                <p className="app-caption mt-5 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] p-3">
                  O papel na organização e os acessos aos módulos são
                  independentes.
                </p>
                {!canEditAccesses && (
                  <p className="app-caption mt-3">
                    Os acessos podem ser alterados para contas ativas ou com
                    convite pendente.
                  </p>
                )}
              </>
            )}
          </form>
        </div>
        <footer className="record-actions">
          <span className="app-caption" role="status">
            {editing
              ? dirty
                ? 'Alterações não salvas'
                : 'Nenhuma alteração pendente'
              : 'Consulta'}
          </span>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button onClick={cancel} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  tone="primary"
                  type="submit"
                  form="employee-profile-form"
                  disabled={busy || !dirty}
                >
                  {' '}
                  {update.isPending ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </>
            ) : (
              <>
                {canEdit &&
                  member.status === 'active' &&
                  member.role !== 'owner' && (
                    <Button
                      tone="ghost"
                      onClick={() => void deactivate()}
                      disabled={busy}
                    >
                      Desativar acesso
                    </Button>
                  )}
                <Button onClick={close} disabled={busy}>
                  Fechar
                </Button>
                {canEdit && (tab === 'profile' || canEditAccesses) && (
                  <Button tone="primary" onClick={() => setEditing(true)}>
                    {tab === 'access' ? 'Editar acessos' : 'Editar'}
                  </Button>
                )}
              </>
            )}
          </div>
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
function formatDate(value: string) {
  return value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
        new Date(value),
      )
    : 'Não informado'
}
