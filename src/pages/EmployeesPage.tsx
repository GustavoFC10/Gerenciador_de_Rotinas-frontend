import { useEffect, useMemo, useRef, useState } from 'react'

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
import { focusRing } from '../constants/designTokens'
import { USER_ROLE } from '../constants/roles'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import type { Employee, RoutineControlData, UserRole } from '../types/domain'
import { normalizeSearch } from '../utils/normalizeSearch'
import { canManageEmployees } from '../utils/permissions'

const employeeGrid =
  'lg:grid-cols-[minmax(14rem,1.35fr)_minmax(10rem,1fr)_8rem_minmax(12rem,1fr)_6rem_1.25rem]'

function EmployeesPage({ data }: { data: RoutineControlData }) {
  const { user } = useAppState()
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  )
  const filteredEmployees = useMemo(() => {
    const query = normalizeSearch(search)

    return [...data.employees]
      .filter((employee) => {
        const departments = data.departments
          .filter((department) =>
            employee.departmentIds?.includes(department.id),
          )
          .map((department) => department.name)

        return normalizeSearch(
          [
            employee.name,
            employee.login,
            getRoleLabel(employee.role ?? USER_ROLE.EMPLOYEE),
            ...departments,
          ].join(' '),
        ).includes(query)
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }, [data.departments, data.employees, search])

  return (
    <>
      <CatalogList
        title="Funcionários"
        countLabel={`${data.employees.length} cadastrados`}
        resultLabel={`${filteredEmployees.length} de ${data.employees.length}`}
        searchLabel="Buscar funcionários"
        searchPlaceholder="Buscar por nome, login, cargo ou departamento"
        searchValue={search}
        onSearchChange={setSearch}
        action={
          canManageEmployees(user) ? (
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
          <span>Login</span>
          <span>Cargo</span>
          <span>Departamentos</span>
          <span>Situação</span>
          <span />
        </CatalogHeader>

        {filteredEmployees.length > 0 ? (
          <CatalogRows>
            {filteredEmployees.map((employee) => {
              const departments = data.departments
                .filter((department) =>
                  employee.departmentIds?.includes(department.id),
                )
                .map((department) => department.name)

              return (
                <CatalogRow
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  ariaLabel={`Abrir perfil de ${employee.name}`}
                  gridClass={employeeGrid}
                >
                  <CatalogPrimary
                    title={employee.name}
                    description={departments.join(' · ') || 'Sem departamento'}
                  />
                  <CatalogDatum label="Login">
                    {employee.login ?? 'Não configurado'}
                  </CatalogDatum>
                  <CatalogDatum label="Cargo">
                    {getRoleLabel(employee.role ?? USER_ROLE.EMPLOYEE)}
                  </CatalogDatum>
                  <CatalogDatum label="Departamentos">
                    {departments.length > 0 ? departments.join(', ') : 'Nenhum'}
                  </CatalogDatum>
                  <CatalogDatum label="Situação">
                    <CatalogStatus active={employee.active !== false} />
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

      {selectedEmployee && (
        <EmployeeProfilePanel
          employee={selectedEmployee}
          data={data}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </>
  )
}

function EmployeeProfilePanel({
  employee,
  data,
  onClose,
}: {
  employee: Employee
  data: RoutineControlData
  onClose: () => void
}) {
  const panelRef = useRef<HTMLElement>(null)
  const departments = data.departments.filter((department) =>
    employee.departmentIds?.includes(department.id),
  )

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
              {employee.name}
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
            <CatalogStatus active={employee.active !== false} />
          </ProfileDatum>
          <ProfileDatum label="Cargo">
            {getRoleLabel(employee.role ?? USER_ROLE.EMPLOYEE)}
          </ProfileDatum>
          <ProfileDatum label="Login">
            {employee.login ?? 'Não configurado'}
          </ProfileDatum>
          <ProfileDatum label="Credencial">
            {employee.credentialConfigured ? 'Configurada' : 'Pendente'}
          </ProfileDatum>
        </dl>

        <div className="flex-1 px-5 py-5">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
            Departamentos permitidos
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {departments.length > 0 ? (
              departments.map((department) => (
                <span
                  key={department.id}
                  className="rounded-full border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-1.5 text-sm font-bold text-[var(--color-text-strong)]"
                >
                  {department.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--color-text-muted)]">
                Nenhum departamento atribuído.
              </span>
            )}
          </div>
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

function ProfileDatum({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
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

function getRoleLabel(role: UserRole): string {
  if (role === USER_ROLE.MANAGER) return 'Administrador'
  if (role === USER_ROLE.LEADER) return 'Líder'
  return 'Funcionário'
}

export default EmployeesPage
