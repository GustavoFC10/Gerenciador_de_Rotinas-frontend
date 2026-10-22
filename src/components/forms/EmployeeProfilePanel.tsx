import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import ImageEditor from '../files/ImageEditor'
import Button from '../ui/Button'
import Select from '../ui/Select'
import TextField from '../ui/TextField'
import { FieldError } from './CreationFeedback'
import MemberModuleFields from './MemberModuleFields'
import {
  initialModuleAccesses,
  moduleAccessError,
  moduleAccessPayload,
} from '../../utils/memberModuleAccess'
import { useNotifications } from '../../hooks/useNotifications'
import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import {
  organizationMemberService,
  type OrganizationMemberResource,
} from '../../services/organizationMemberService'
import type { Department, OrganizationRole } from '../../types/domain'

export default function EmployeeProfilePanel({
  member,
  departments,
  canManage,
  canAssignOwner,
  onMemberChange,
  onClose,
}: {
  member: OrganizationMemberResource
  departments: Department[]
  canManage: boolean
  canAssignOwner: boolean
  onMemberChange: (member: OrganizationMemberResource) => Promise<void>
  onClose: () => void
}) {
  const panelRef = useRef<HTMLElement>(null)
  useOverlayDialog(panelRef, () => {
    if (!busy) onClose()
  })
  const { notify } = useNotifications()
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
  useEffect(() => {
    setDisplayName(member.displayName)
    setRole(member.role)
    setAccesses(initialModuleAccesses(member))
    setError('')
  }, [member])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || busy) return
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
      !window.confirm(
        `Desativar o acesso de ${member.displayName}? Esta ação encerra o vínculo do colaborador na organização.`,
      )
    )
      return
    setError('')
    try {
      const response = await offboard.mutateAsync()
      await onMemberChange(response.data)
      notify({ title: 'Acesso do colaborador desativado.', tone: 'success' })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível desativar o colaborador.',
      )
    }
  }
  const roles = [
    'member',
    'admin',
    ...(canAssignOwner || member.role === 'owner' ? ['owner'] : []),
  ] as OrganizationRole[]
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[var(--color-overlay-bg)] backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-profile-title"
        tabIndex={-1}
        className="flex h-dvh w-full max-w-xl flex-col border-l border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-divider)] px-5 py-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold text-[var(--color-text-muted)]">
              Perfil do colaborador
            </p>
            <h2
              id="employee-profile-title"
              className="break-words text-xl font-black text-[var(--color-text-strong)]"
            >
              {member.displayName}
            </h2>
            <ImageEditor
              destination={{
                purpose: 'member_avatar',
                target: { memberId: member.id },
              }}
              label={member.displayName}
            />
          </div>
          <Button
            tone="neutral"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar perfil"
          >
            ×
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto">
          <dl className="grid grid-cols-2 border-b border-[var(--color-divider)]">
            <Datum label="Situação">
              {
                {
                  active: 'Ativo',
                  pending: 'Convite pendente',
                  suspended: 'Suspenso',
                  inactive: 'Inativo',
                }[member.status]
              }
            </Datum>
            <Datum label="Cargo organizacional">{roleLabel(member.role)}</Datum>
            <Datum label="E-mail">{member.email}</Datum>
            <Datum label="Entrada">
              {member.joinedAt
                ? formatDate(member.joinedAt)
                : 'Convite pendente'}
            </Datum>
            <Datum label="Cadastro">{formatDate(member.createdAt)}</Datum>
            <Datum label="Última atualização">
              {formatDate(member.updatedAt)}
            </Datum>
          </dl>
          <form
            id="employee-profile-form"
            onSubmit={(event) => void save(event)}
            className="space-y-5 px-5 py-5"
          >
            <TextField
              id="employee-profile-name"
              label="Nome"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={!canEdit || busy}
              required
            />
            <Select
              id="employee-profile-role"
              label="Cargo organizacional"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as OrganizationRole)
              }
              disabled={!canEdit || busy}
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {roleLabel(item)}
                </option>
              ))}
            </Select>
            {!canManage ? (
              <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
                <p>
                  Você pode consultar os departamentos sob sua liderança. A
                  configuração dos módulos é visível apenas à administração.
                </p>
                <ul className="space-y-2">
                  {member.departmentAccesses.map((access) => (
                    <li key={access.id}>
                      {access.departmentName ||
                        departments.find(
                          (department) => department.id === access.departmentId,
                        )?.name ||
                        access.departmentId}{' '}
                      ·{' '}
                      {access.role === 'lead'
                        ? 'Líder'
                        : access.role === 'contributor'
                          ? 'Colaborador'
                          : 'Leitor'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <MemberModuleFields
                value={accesses}
                onChange={setAccesses}
                departments={departments}
                disabled={!canEditAccesses || busy}
              />
            )}
            {!canEditAccesses && canEdit && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Os acessos podem ser alterados para contas ativas ou com convite
                pendente.
              </p>
            )}
            <FieldError id="employee-profile-error">{error}</FieldError>
            {canEdit && member.status === 'active' && (
              <Button
                type="button"
                tone="neutral"
                disabled={busy}
                onClick={() => void deactivate()}
              >
                {offboard.isPending ? 'Desativando…' : 'Desativar acesso'}
              </Button>
            )}
          </form>
        </div>
        <footer className="flex justify-end gap-2 border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-5 py-3">
          <Button tone="neutral" onClick={onClose} disabled={busy}>
            Fechar
          </Button>
          {canEdit && (
            <Button type="submit" form="employee-profile-form" disabled={busy}>
              {update.isPending ? 'Salvando…' : 'Salvar perfil'}
            </Button>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
function Datum({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-[var(--color-divider)] px-5 py-3">
      <dt className="text-xs font-bold text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold text-[var(--color-text-strong)]">
        {children}
      </dd>
    </div>
  )
}
function roleLabel(role: OrganizationRole) {
  return role === 'owner'
    ? 'Proprietário'
    : role === 'admin'
      ? 'Administrador'
      : 'Colaborador'
}
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Não informado'
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date)
}
