import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import {
  CatalogAction,
  CatalogChevron,
  CatalogDatum,
  CatalogEmpty,
  CatalogHeader,
  CatalogList,
  CatalogPrimary,
  CatalogRow,
  CatalogRows,
  CatalogSecondaryAction,
  CatalogStatus,
} from '../components/catalog/CatalogList'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import { focusRing } from '../constants/designTokens'
import { DEPARTMENT_ACCESS_ROLE, ORGANIZATION_ROLE } from '../constants/roles'
import { ROUTES } from '../constants/routes'
import { useOrganizationMembers } from '../hooks/useOrganizationMembers'
import { useAuth } from '../hooks/useAuth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import type {
  Department,
  DepartmentAccessRole,
  OrganizationRole,
} from '../types/domain'
import type {
  OrganizationMemberResource,
  OrganizationMemberStatus,
} from '../services/organizationMemberService'
import { organizationMemberService } from '../services/organizationMemberService'
import { normalizeSearch } from '../utils/normalizeSearch'
import { useAppState } from '../hooks/useAppState'
import { canManageEmployees, isOwner } from '../utils/permissions'

const employeeGrid =
  'lg:grid-cols-[minmax(14rem,1.35fr)_minmax(10rem,1fr)_8rem_minmax(12rem,1fr)_6rem_1.25rem]'

function EmployeesPage({ departments }: { departments: Department[] }) {
  const { user } = useAppState()
  const { refreshSession } = useAuth()
  const queryClient = useQueryClient()
  const { members, isInitialLoading, error, replaceMember, scope } =
    useOrganizationMembers()
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] =
    useState<OrganizationMemberResource | null>(null)
  const canManage = canManageEmployees(user)
  const filteredMembers = useMemo(() => {
    const query = normalizeSearch(search)

    return [...members]
      .filter((member) =>
        normalizeSearch(
          [
            member.displayName,
            member.email,
            getRoleLabel(member.role),
            ...getDepartmentAccessLabels(member, departments),
          ].join(' '),
        ).includes(query),
      )
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, 'pt-BR'),
      )
  }, [departments, members, search])

  if (isInitialLoading) {
    return <LoadingState message="Carregando funcionários..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar os funcionários"
        description="Verifique suas permissões e tente novamente."
      />
    )
  }

  return (
    <>
      <CatalogList
        title="Funcionários"
        countLabel={`${members.length} cadastrados`}
        resultLabel={`${filteredMembers.length} de ${members.length}`}
        searchLabel="Buscar funcionários"
        searchPlaceholder="Buscar por nome, e-mail, cargo ou departamento"
        searchValue={search}
        onSearchChange={setSearch}
        action={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <CatalogSecondaryAction to={ROUTES.ROLES}>
                Cargos e permissões
              </CatalogSecondaryAction>
              <CatalogAction to={ROUTES.EMPLOYEE_CREATE}>
                Adicionar funcionário
              </CatalogAction>
            </div>
          ) : undefined
        }
      >
        <CatalogHeader gridClass={employeeGrid}>
          <span>Funcionário</span>
          <span>E-mail</span>
          <span>Cargo</span>
          <span>Departamentos</span>
          <span>Situação</span>
          <span />
        </CatalogHeader>

        {filteredMembers.length > 0 ? (
          <CatalogRows>
            {filteredMembers.map((member) => {
              const departmentLabels = getDepartmentAccessLabels(
                member,
                departments,
              )

              return (
                <CatalogRow
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  ariaLabel={`Abrir perfil de ${member.displayName}`}
                  gridClass={employeeGrid}
                >
                  <CatalogPrimary
                    title={member.displayName}
                    description={
                      departmentLabels.join(' · ') || 'Sem departamento'
                    }
                  />
                  <CatalogDatum label="E-mail">{member.email}</CatalogDatum>
                  <CatalogDatum label="Cargo">
                    {getRoleLabel(member.role)}
                  </CatalogDatum>
                  <CatalogDatum label="Departamentos">
                    {departmentLabels.length > 0
                      ? departmentLabels.join(', ')
                      : 'Nenhum'}
                  </CatalogDatum>
                  <CatalogDatum label="Situação">
                    <MemberStatus status={member.status} />
                  </CatalogDatum>
                  <CatalogChevron />
                </CatalogRow>
              )
            })}
          </CatalogRows>
        ) : (
          <CatalogEmpty
            title={
              search
                ? `Nenhum funcionário encontrado para “${search}”.`
                : 'Nenhum funcionário cadastrado.'
            }
            searchValue={search}
            onClear={() => setSearch('')}
          />
        )}
      </CatalogList>

      {selectedMember && (
        <EmployeeProfilePanel
          member={selectedMember}
          departments={departments}
          canManage={canManage}
          canAssignOwner={isOwner(user)}
          onMemberChange={async (member) => {
            setSelectedMember(member)
            replaceMember(member)

            if (member.id === user.membershipId) {
              await refreshSession()
              if (scope) {
                void queryClient.invalidateQueries({
                  queryKey: queryKeys.scope(scope),
                })
              }
            }
          }}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  )
}

function EmployeeProfilePanel({
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
  const departmentLabels = getDepartmentAccessLabels(member, departments)
  const [displayName, setDisplayName] = useState(member.displayName)
  const [role, setRole] = useState<OrganizationRole>(member.role)
  const [departmentRoles, setDepartmentRoles] = useState<
    Record<string, DepartmentAccessRole | ''>
  >(() => getDepartmentAccessDraft(member))
  const accessCompletedChangesRef = useRef(0)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const profileMutation = useMutation({
    mutationFn: ({
      memberId,
      displayName,
      role: nextRole,
    }: {
      memberId: string
      displayName: string
      role?: OrganizationRole
    }) =>
      organizationMemberService.update(memberId, {
        displayName,
        ...(nextRole ? { role: nextRole } : {}),
      }),
  })
  const accessMutation = useMutation({
    mutationFn: async ({
      memberId,
      changes,
    }: {
      memberId: string
      changes: Array<{
        departmentId: string
        role: DepartmentAccessRole | ''
      }>
    }) => {
      accessCompletedChangesRef.current = 0

      for (const change of changes) {
        if (change.role) {
          await organizationMemberService.setDepartmentAccess(
            memberId,
            change.departmentId,
            change.role,
          )
        } else {
          await organizationMemberService.removeDepartmentAccess(
            memberId,
            change.departmentId,
          )
        }
        accessCompletedChangesRef.current += 1
      }

      return organizationMemberService.get(memberId)
    },
  })
  const offboardMutation = useMutation({
    mutationFn: (memberId: string) =>
      organizationMemberService.offboard(memberId),
  })
  const isSavingProfile = profileMutation.isPending
  const isSavingAccesses = accessMutation.isPending
  const isOffboarding = offboardMutation.isPending
  const canEditProfile =
    canManage && (canAssignOwner || member.role !== ORGANIZATION_ROLE.OWNER)
  const canOffboard =
    canManage &&
    member.status === 'active' &&
    (canAssignOwner || member.role !== ORGANIZATION_ROLE.OWNER)
  const availableRoles = [
    ORGANIZATION_ROLE.MEMBER,
    ORGANIZATION_ROLE.ADMIN,
    ...(canAssignOwner ? [ORGANIZATION_ROLE.OWNER] : []),
  ] as OrganizationRole[]

  if (!availableRoles.includes(member.role)) {
    availableRoles.unshift(member.role)
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      returnFocus?.focus()
    }
  }, [onClose])

  useEffect(() => {
    setDisplayName(member.displayName)
    setRole(member.role)
    setDepartmentRoles(getDepartmentAccessDraft(member))
    setActionMessage('')
    setActionError('')
  }, [member])

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextDisplayName = displayName.trim()

    if (!nextDisplayName) {
      setActionError('Informe o nome do funcionário.')
      return
    }

    if (
      !canEditProfile ||
      (role === ORGANIZATION_ROLE.OWNER &&
        role !== member.role &&
        !canAssignOwner)
    ) {
      setActionError('Somente um proprietário pode atribuir esse cargo.')
      return
    }

    if (nextDisplayName === member.displayName && role === member.role) {
      setActionMessage('Nenhuma alteração de perfil para salvar.')
      setActionError('')
      return
    }

    setActionError('')
    setActionMessage('')

    try {
      const response = await profileMutation.mutateAsync({
        memberId: member.id,
        displayName: nextDisplayName,
        ...(role !== member.role ? { role } : {}),
      })
      await onMemberChange(response.data)
      setActionMessage('Perfil atualizado.')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível atualizar o perfil.',
      )
    }
  }

  async function handleAccessSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const currentAccesses = new Map(
      member.departmentAccesses.map((access) => [
        access.departmentId,
        access.role,
      ]),
    )
    const changes = departments
      .map((department) => ({
        department,
        previousRole: currentAccesses.get(department.id) ?? '',
        nextRole: departmentRoles[department.id] ?? '',
      }))
      .filter((change) => change.previousRole !== change.nextRole)

    if (changes.length === 0) {
      setActionMessage('Nenhuma alteração de acesso para salvar.')
      setActionError('')
      return
    }

    setActionMessage('')
    setActionError('')

    try {
      const response = await accessMutation.mutateAsync({
        memberId: member.id,
        changes: changes.map((change) => ({
          departmentId: change.department.id,
          role: change.nextRole,
        })),
      })
      await onMemberChange(response.data)
      setActionMessage('Acessos por departamento atualizados.')
    } catch (caughtError) {
      try {
        const response = await organizationMemberService.get(member.id)
        await onMemberChange(response.data)
      } catch {
        // A alteração que falhou é informada abaixo; a próxima abertura do
        // painel também recarrega os dados atuais do backend.
      }

      const completedChanges = accessCompletedChangesRef.current
      const detail =
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível salvar os acessos.'
      setActionError(
        completedChanges > 0
          ? `${completedChanges} alteração(ões) foram aplicadas antes da falha. ${detail}`
          : detail,
      )
    }
  }

  async function handleOffboard() {
    if (!canOffboard) return
    if (
      !window.confirm(
        `Desativar o acesso de ${member.displayName}? Esta ação encerra o vínculo do membro na organização.`,
      )
    ) {
      return
    }

    setActionError('')
    setActionMessage('')

    try {
      const response = await offboardMutation.mutateAsync(member.id)
      await onMemberChange(response.data)
      setActionMessage('Acesso do funcionário desativado.')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível desativar o acesso do funcionário.',
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[var(--color-overlay-bg)] backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        ref={panelRef}
        className="flex h-dvh w-full max-w-lg flex-col border-l border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-profile-title"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-divider)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-text-muted)]">
              Perfil do funcionário
            </p>
            <h2
              id="employee-profile-title"
              className="mt-0.5 truncate text-xl font-black text-[var(--color-text-strong)]"
            >
              {member.displayName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-xl text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] ${focusRing}`}
            aria-label="Fechar perfil"
          >
            ×
          </button>
        </header>

        <dl className="grid grid-cols-2 border-b border-[var(--color-divider)]">
          <ProfileDatum label="Situação">
            <MemberStatus status={member.status} />
          </ProfileDatum>
          <ProfileDatum label="Cargo">{getRoleLabel(member.role)}</ProfileDatum>
          <ProfileDatum label="E-mail">{member.email}</ProfileDatum>
          <ProfileDatum label="Entrada">
            {member.joinedAt ? formatDate(member.joinedAt) : 'Convite pendente'}
          </ProfileDatum>
        </dl>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {(actionMessage || actionError) && (
            <p
              role={actionError ? 'alert' : 'status'}
              className={
                'mb-4 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold ' +
                (actionError
                  ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
                  : 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]')
              }
            >
              {actionError || actionMessage}
            </p>
          )}

          {canEditProfile && (
            <form
              className="border-b border-[var(--color-divider)] pb-5"
              onSubmit={(event) => void handleProfileSave(event)}
            >
              <h3 className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
                Dados organizacionais
              </h3>
              <div className="mt-3 grid gap-3">
                <TextField
                  id="employee-profile-name"
                  label="Nome"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  disabled={isSavingProfile}
                />
                <Select
                  id="employee-profile-role"
                  label="Cargo organizacional"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as OrganizationRole)
                  }
                  disabled={
                    isSavingProfile ||
                    !canEditProfile ||
                    availableRoles.length === 1
                  }
                >
                  {availableRoles.map((option) => (
                    <option key={option} value={option}>
                      {getRoleLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-2">
                {canOffboard ? (
                  <button
                    type="button"
                    onClick={handleOffboard}
                    disabled={isOffboarding || isSavingProfile}
                    className="min-h-9 rounded-[var(--radius-control)] border border-[var(--status-error-border)] px-3 text-sm font-bold text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] disabled:opacity-60"
                  >
                    {isOffboarding ? 'Desativando…' : 'Desativar acesso'}
                  </button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Salvando…' : 'Salvar perfil'}
                </Button>
              </div>
            </form>
          )}

          <section className={canEditProfile ? 'pt-5' : ''}>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
              Departamentos permitidos
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {departmentLabels.length > 0 ? (
                departmentLabels.map((department) => (
                  <span
                    key={department}
                    className="rounded-full border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-1.5 text-sm font-bold text-[var(--color-text-strong)]"
                  >
                    {department}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[var(--color-text-muted)]">
                  Nenhum departamento atribuído.
                </span>
              )}
            </div>

            {member.role !== ORGANIZATION_ROLE.MEMBER ? (
              <p className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] px-3 py-2 text-sm leading-5 text-[var(--color-text-muted)]">
                Proprietários e administradores têm acesso organizacional
                global; por isso não recebem papéis individuais por
                departamento.
              </p>
            ) : member.status !== 'active' ? (
              <p className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] px-3 py-2 text-sm leading-5 text-[var(--color-text-muted)]">
                Os acessos de departamento ficam disponíveis depois que a pessoa
                aceitar o convite e o membro estiver ativo.
              </p>
            ) : canManage ? (
              <form
                className="mt-4"
                onSubmit={(event) => void handleAccessSave(event)}
              >
                <p className="text-sm leading-5 text-[var(--color-text-muted)]">
                  Defina o papel em cada departamento. Cada linha é gravada pela
                  API de acesso departamental.
                </p>
                <div className="mt-3 space-y-3">
                  {departments.map((department) => (
                    <Select
                      key={department.id}
                      id={'employee-access-' + department.id}
                      label={department.name}
                      value={departmentRoles[department.id] ?? ''}
                      onChange={(event) =>
                        setDepartmentRoles((current) => ({
                          ...current,
                          [department.id]: event.target.value as
                            DepartmentAccessRole | '',
                        }))
                      }
                      disabled={isSavingAccesses}
                    >
                      <option value="">Sem acesso</option>
                      <option value={DEPARTMENT_ACCESS_ROLE.LEAD}>Líder</option>
                      <option value={DEPARTMENT_ACCESS_ROLE.CONTRIBUTOR}>
                        Colaborador
                      </option>
                      <option value={DEPARTMENT_ACCESS_ROLE.VIEWER}>
                        Leitor
                      </option>
                    </Select>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingAccesses || departments.length === 0}
                  >
                    {isSavingAccesses ? 'Salvando…' : 'Salvar acessos'}
                  </Button>
                </div>
              </form>
            ) : null}
          </section>
        </div>

        <footer className="flex justify-end border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-5 py-3">
          <Button tone="neutral" onClick={onClose}>
            Fechar
          </Button>
        </footer>
      </aside>
    </div>
  )
}

function getDepartmentAccessDraft(
  member: OrganizationMemberResource,
): Record<string, DepartmentAccessRole | ''> {
  return Object.fromEntries(
    member.departmentAccesses.map((access) => [
      access.departmentId,
      access.role,
    ]),
  )
}

function ProfileDatum({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="border-b border-r border-[var(--color-divider)] px-5 py-4 even:border-r-0">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-bold text-[var(--color-text-strong)]">
        {children}
      </dd>
    </div>
  )
}

function MemberStatus({ status }: { status: OrganizationMemberStatus }) {
  if (status === 'active') return <CatalogStatus active />

  const label =
    status === 'pending'
      ? 'Convite pendente'
      : status === 'suspended'
        ? 'Suspenso'
        : 'Inativo'

  return (
    <span className="text-xs font-bold text-[var(--color-text-muted)]">
      {label}
    </span>
  )
}

function getRoleLabel(role: OrganizationRole): string {
  if (role === ORGANIZATION_ROLE.OWNER) return 'Proprietário'
  if (role === ORGANIZATION_ROLE.ADMIN) return 'Administrador'
  return 'Membro'
}

function getDepartmentAccessLabel(role: DepartmentAccessRole): string {
  if (role === 'lead') return 'Líder'
  if (role === 'contributor') return 'Colaborador'
  return 'Leitor'
}

function getDepartmentAccessLabels(
  member: OrganizationMemberResource,
  departments: Department[],
): string[] {
  if (
    member.role === ORGANIZATION_ROLE.OWNER ||
    member.role === ORGANIZATION_ROLE.ADMIN
  ) {
    return ['Acesso global']
  }

  return member.departmentAccesses.flatMap((access) => {
    const department = departments.find(
      (item) => item.id === access.departmentId,
    )
    const name = department?.name ?? access.departmentName

    return name ? [`${name} · ${getDepartmentAccessLabel(access.role)}`] : []
  })
}

function formatDate(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date)
}

export default EmployeesPage
