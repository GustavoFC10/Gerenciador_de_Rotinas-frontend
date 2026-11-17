import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import EmployeeProfilePanel from '../components/forms/EmployeeProfilePanel'
import {
  DirectoryEmpty,
  DirectoryHeading,
  DirectoryPager,
  DirectoryPanel,
  DirectoryStatus,
  DirectoryToolbar,
  useDirectoryQuery,
  DIRECTORY_PAGE_SIZE,
} from '../components/catalog/Directory'
import Button from '../components/ui/Button'
import UserAvatar from '../components/ui/UserAvatar'
import LoadingState from '../components/common/LoadingState'
import {
  initialModuleAccesses,
  moduleAccessLabels,
} from '../utils/memberModuleAccess'
import { MODULE_LABELS } from '../types/modules'
import { ROUTES } from '../constants/routes'
import { focusRing } from '../constants/designTokens'
import { useOrganizationMembers } from '../hooks/useOrganizationMembers'
import { useAuth } from '../hooks/useAuth'
import { queryKeys } from '../query/queryKeys'
import {
  organizationMemberService,
  type OrganizationMemberResource,
} from '../services/organizationMemberService'
import type { Department } from '../types/domain'
import { normalizeSearch } from '../utils/normalizeSearch'

export default function EmployeesPage({
  departments,
}: {
  departments: Department[]
}) {
  const { activeMembership, refreshSession } = useAuth()
  const client = useQueryClient()
  const {
    members,
    isInitialLoading,
    error,
    replaceMember,
    scope,
    reloadMembers,
  } = useOrganizationMembers()
  const state = useDirectoryQuery()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('member') ?? ''
  const tab = params.get('aba') === 'access' ? 'access' : 'profile'
  const existing = members.find((member) => member.id === selectedId)
  const detail = useQuery({
    queryKey: scope
      ? queryKeys.member(scope, selectedId)
      : ['member', selectedId],
    queryFn: async () => (await organizationMemberService.get(selectedId)).data,
    enabled: !!selectedId && !!scope && !existing,
  })
  const selectedMember = existing ?? detail.data
  const status = ['active', 'pending', 'inactive', 'suspended'].includes(
    state.status,
  )
    ? state.status
    : 'all'
  const filtered = useMemo(
    () =>
      members
        .filter(
          (member) =>
            (status === 'all' || member.status === status) &&
            normalizeSearch(
              [
                member.displayName,
                member.email,
                roleLabel(member.role),
                ...moduleAccessLabels(member),
                ...member.departmentAccesses.map(
                  (access) => access.departmentName,
                ),
              ].join(' '),
            ).includes(normalizeSearch(state.query)),
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR')),
    [members, status, state.query],
  )
  const page = Math.min(
    state.page,
    Math.max(1, Math.ceil(filtered.length / DIRECTORY_PAGE_SIZE)),
  )
  function close() {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('member')
        next.delete('aba')
        return next
      },
      { replace: true },
    )
  }
  const listParams = new URLSearchParams(params)
  listParams.delete('member')
  listParams.delete('aba')
  return (
    <>
      <DirectoryHeading
        title="Equipe"
        count={`${members.length} pessoas`}
        action={
          <Link
            className={`ui-button ui-button--md border border-transparent bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] ${focusRing}`}
            to={`${ROUTES.EMPLOYEE_CREATE}${listParams.size ? `?${listParams}` : ''}`}
          >
            Convidar pessoa
          </Link>
        }
      />
      <DirectoryPanel label="Diretório da equipe">
        <DirectoryToolbar
          searchLabel="Buscar pessoa"
          placeholder="Nome, e-mail ou módulo"
          query={state.query}
          onQuery={(q) => state.change({ q, pagina: '' })}
          status={status}
          statuses={[
            { value: 'all', label: 'Todas' },
            { value: 'active', label: 'Ativas' },
            { value: 'pending', label: 'Convites pendentes' },
            { value: 'inactive', label: 'Inativas' },
            { value: 'suspended', label: 'Suspensas' },
          ]}
          onStatus={(situacao) => state.change({ situacao, pagina: '' })}
          count={isInitialLoading ? undefined : filtered.length}
        />
        {isInitialLoading ? (
          <LoadingState message="Carregando a equipe…" />
        ) : error ? (
          <div className="space-y-3 p-4" role="alert">
            <p>Não foi possível carregar a equipe.</p>
            <Button onClick={() => void reloadMembers()}>
              Tentar novamente
            </Button>
          </div>
        ) : !filtered.length ? (
          <DirectoryEmpty
            noun="pessoa"
            filtered={!!state.query || status !== 'all'}
            onClear={() => state.change({ q: '', situacao: 'all', pagina: '' })}
          />
        ) : (
          <table className="directory-table">
            <thead>
              <tr>
                <th style={{ width: '36%' }}>Pessoa</th>
                <th className="directory-hide-small" style={{ width: '21%' }}>
                  Papel na organização
                </th>
                <th className="directory-hide-small" style={{ width: '29%' }}>
                  Módulos
                </th>
                <th style={{ width: '14%' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice(
                  (page - 1) * DIRECTORY_PAGE_SIZE,
                  page * DIRECTORY_PAGE_SIZE,
                )
                .map((member) => {
                  const modules = initialModuleAccesses(member).filter(
                    (access) => access.enabled,
                  )
                  const next = new URLSearchParams(params)
                  next.set('member', member.id)
                  next.delete('aba')
                  return (
                    <tr key={member.id}>
                      <td>
                        <Link
                          to={`${ROUTES.EMPLOYEES}?${next}`}
                          className={`directory-identity ${focusRing}`}
                          aria-label={`Abrir perfil de ${member.displayName}`}
                        >
                          <UserAvatar
                            name={member.displayName}
                            avatar={member.avatar}
                          />
                          <span className="min-w-0">
                            <strong>{member.displayName}</strong>
                            <small>{member.email}</small>
                            <span className="directory-mobile-meta app-caption mt-1">
                              {roleLabel(member.role)}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="directory-hide-small">
                        {roleLabel(member.role)}
                      </td>
                      <td className="directory-hide-small">
                        <span className="flex flex-wrap gap-1">
                          {modules.length
                            ? modules.map((access) => (
                                <span
                                  key={access.module}
                                  className="rounded-sm bg-[var(--color-brand-soft)] px-1.5 py-1 text-xs text-[var(--color-brand)]"
                                >
                                  {MODULE_LABELS[access.module]}
                                </span>
                              ))
                            : 'Sem acesso'}
                        </span>
                      </td>
                      <td>
                        <DirectoryStatus status={member.status} />
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
        {!isInitialLoading && !error && (
          <DirectoryPager
            page={page}
            count={filtered.length}
            onPage={(next) => state.change({ pagina: String(next) })}
          />
        )}
      </DirectoryPanel>
      {selectedId && !selectedMember && (
        <div
          className="mt-4 space-y-3"
          role={detail.error ? 'alert' : 'status'}
        >
          <p>
            {detail.error
              ? 'Não foi possível consultar esta pessoa.'
              : 'Carregando a ficha…'}
          </p>
          <Button onClick={close}>Fechar ficha</Button>
          {detail.error && (
            <Button onClick={() => void detail.refetch()}>
              Tentar novamente
            </Button>
          )}
        </div>
      )}
      {selectedMember && (
        <EmployeeProfilePanel
          key={selectedMember.id}
          member={selectedMember}
          departments={departments}
          canManage={activeMembership?.role === 'owner'}
          canAssignOwner={activeMembership?.role === 'owner'}
          initialTab={tab}
          onTabChange={(next) =>
            state.change({ aba: next === 'access' ? 'access' : '' })
          }
          onMemberChange={async (member: OrganizationMemberResource) => {
            replaceMember(member)
            if (member.id === activeMembership?.id) {
              await refreshSession()
              if (scope)
                void client.invalidateQueries({
                  queryKey: queryKeys.scope(scope),
                })
            }
          }}
          onClose={close}
        />
      )}
    </>
  )
}
function roleLabel(role: string) {
  return role === 'owner'
    ? 'Proprietário'
    : role === 'admin'
      ? 'Administrador'
      : 'Colaborador'
}
