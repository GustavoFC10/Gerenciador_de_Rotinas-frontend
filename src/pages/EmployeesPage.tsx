import { useMemo, useState } from 'react'

import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import { USER_ROLE } from '../constants/roles'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { RoutineControlData, UserRole } from '../types/domain'
import { canManageEmployees } from '../utils/permissions'
import {
  CatalogAction,
  CatalogCell,
  CatalogEmpty,
  CatalogHeading,
  StatusBadge,
} from './CompaniesPage'

function EmployeesPage({ data }: { data: RoutineControlData }) {
  const { user } = useAppState()
  const [search, setSearch] = useState('')
  const filteredEmployees = useMemo(() => {
    const query = normalizeSearch(search)

    return [...data.employees]
      .filter((employee) =>
        normalizeSearch(
          [employee.name, employee.login].filter(Boolean).join(' '),
        ).includes(query),
      )
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }, [data.employees, search])

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        label="Listagem"
        title="Todos os funcionários"
        meta={`${data.employees.length} cadastrados`}
        actions={
          canManageEmployees(user) ? (
            <CatalogAction to={ROUTES.EMPLOYEE_CREATE}>
              Adicionar funcionário
            </CatalogAction>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-black text-[var(--color-text-strong)]">
              Equipe cadastrada
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Cargo e escopo de acesso por departamento.
            </p>
          </div>
          <TextField
            label="Buscar funcionário"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou login"
            className="w-full sm:w-80"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <thead className="bg-[var(--color-table-header-bg)] text-xs uppercase tracking-wide text-[var(--color-table-heading-text)]">
              <tr>
                <CatalogHeading>Funcionário</CatalogHeading>
                <CatalogHeading>Login</CatalogHeading>
                <CatalogHeading>Cargo</CatalogHeading>
                <CatalogHeading>Departamentos</CatalogHeading>
                <CatalogHeading>Situação</CatalogHeading>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-divider)]">
              {filteredEmployees.map((employee) => {
                const departments = data.departments
                  .filter((department) =>
                    employee.departmentIds?.includes(department.id),
                  )
                  .map((department) => department.name)

                return (
                  <tr
                    key={employee.id}
                    className="hover:bg-[var(--color-table-row-hover-bg)]"
                  >
                    <CatalogCell className="font-black text-[var(--color-text-strong)]">
                      {employee.name}
                    </CatalogCell>
                    <CatalogCell>
                      {employee.login ?? 'Não configurado'}
                    </CatalogCell>
                    <CatalogCell>
                      {getRoleLabel(employee.role ?? USER_ROLE.EMPLOYEE)}
                    </CatalogCell>
                    <CatalogCell>
                      {departments.length > 0
                        ? departments.join(', ')
                        : 'Nenhum'}
                    </CatalogCell>
                    <CatalogCell>
                      <StatusBadge active={employee.active !== false} />
                    </CatalogCell>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <CatalogEmpty>Nenhum funcionário encontrado.</CatalogEmpty>
        )}
      </Card>
    </div>
  )
}

function getRoleLabel(role: UserRole): string {
  if (role === USER_ROLE.MANAGER) return 'Administrador'
  if (role === USER_ROLE.LEADER) return 'Líder'
  return 'Funcionário'
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

export default EmployeesPage
