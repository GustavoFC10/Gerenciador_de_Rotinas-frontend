import { useMemo, useState } from 'react'

import EmployeeProfilePanel from '../components/forms/EmployeeProfilePanel'
import { moduleAccessLabels } from '../utils/memberModuleAccess'
import ErrorState from '../components/common/ErrorState'

import PrivateImage from '../components/files/PrivateImage'
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

import { ORGANIZATION_ROLE } from '../constants/roles'
import { ROUTES } from '../constants/routes'
import { useOrganizationMembers } from '../hooks/useOrganizationMembers'
import { useAuth } from '../hooks/useAuth'

import { useQueryClient } from '@tanstack/react-query'
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
            ...moduleAccessLabels(member),
          ].join(' '),
        ).includes(query),
      )
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, 'pt-BR'),
      )
  }, [departments, members, search])

  if (isInitialLoading) {
    return <LoadingState message="Carregando a equipe..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar a equipe"
        description="Verifique suas permissões e tente novamente."
        error={error}
      />
    )
  }

  return (
    <>
      <CatalogList
        title="Equipe"
        countLabel={`${members.length} cadastrados`}
        resultLabel={`${filteredMembers.length} de ${members.length}`}
        searchLabel="Buscar na equipe"
        searchPlaceholder="Buscar por nome, e-mail, cargo, módulo ou departamento"
        searchValue={search}
        onSearchChange={setSearch}
        action={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <CatalogSecondaryAction to={ROUTES.TEAM_ACCESS}>
                Cargos e permissões
              </CatalogSecondaryAction>
              <CatalogAction to={ROUTES.EMPLOYEE_CREATE}>
                Adicionar colaborador
              </CatalogAction>
            </div>
          ) : undefined
        }
      >
        <CatalogHeader gridClass={employeeGrid}>
          <span>Colaborador</span>
          <span>E-mail</span>
          <span>Cargo</span>
          <span>Módulos e acessos</span>
          <span>Situação</span>
          <span />
        </CatalogHeader>

        {filteredMembers.length > 0 ? (
          <CatalogRows>
            {filteredMembers.map((member) => {
              const departmentLabels = moduleAccessLabels(member).length
                ? moduleAccessLabels(member)
                : getDepartmentAccessLabels(member, departments)

              return (
                <CatalogRow
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  ariaLabel={`Abrir perfil de ${member.displayName}`}
                  gridClass={employeeGrid}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <PrivateImage
                      reference={member.avatar}
                      label={member.displayName}
                    />
                    <CatalogPrimary
                      title={member.displayName}
                      description={
                        departmentLabels.join(' · ') || 'Sem departamento'
                      }
                    />
                  </div>
                  <CatalogDatum label="E-mail">{member.email}</CatalogDatum>
                  <CatalogDatum label="Cargo">
                    {getRoleLabel(member.role)}
                  </CatalogDatum>
                  <CatalogDatum label="Módulos e acessos">
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
                ? `Nenhum colaborador encontrado para “${search}”.`
                : 'Nenhum colaborador cadastrado na equipe.'
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
  return 'Colaborador'
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
  const routines = member.moduleAccesses?.find(
    (access) => access.module === 'routines',
  )
  if (routines && !routines.enabled) return ['Rotinas: sem acesso']
  if (
    routines?.role === 'admin' ||
    (member.moduleAccesses === undefined && member.role !== 'member')
  )
    return ['Rotinas: administrador']

  return member.departmentAccesses.flatMap((access) => {
    const department = departments.find(
      (item) => item.id === access.departmentId,
    )
    const name = department?.name ?? access.departmentName

    return name ? [`${name} · ${getDepartmentAccessLabel(access.role)}`] : []
  })
}

export default EmployeesPage
