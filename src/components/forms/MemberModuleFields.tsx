import Select from '../ui/Select'
import TextField from '../ui/TextField'
import type { Department } from '../../types/domain'
import {
  PROCESS_SECTORS,
  HONORARIOS_ROLES,
  MODULE_LABELS,
  type AccessibleModule,
  type HonorariosRole,
  type ModuleAccessConfiguration,
} from '../../types/modules'

export default function MemberModuleFields({
  value,
  onChange,
  departments,
  disabled = false,
}: {
  value: ModuleAccessConfiguration[]
  onChange: (value: ModuleAccessConfiguration[]) => void
  departments: Department[]
  disabled?: boolean
}) {
  function access(module: AccessibleModule) {
    return (
      value.find((item) => item.module === module) ?? { module, enabled: false }
    )
  }
  function update(
    module: AccessibleModule,
    patch: Partial<ModuleAccessConfiguration>,
  ) {
    onChange([
      ...value.filter((item) => item.module !== module),
      { ...access(module), ...patch },
    ])
  }
  function setGrant(
    module: 'routines' | 'processes',
    id: string,
    checked: boolean,
  ) {
    const current = access(module)
    const remaining = (current.sectors ?? []).filter(
      (item) => item.sector !== id,
    )
    const existing = current.sectors?.find((item) => item.sector === id)
    const sectors = checked
      ? [
          ...remaining,
          existing ?? {
            sector: id,
            role:
              module === 'processes' ? (id as 'com' | 'fin' | 'reg') : 'viewer',
            ...(module === 'processes' ? { jobTitle: '' } : {}),
          },
        ]
      : remaining
    update(module, {
      sectors,
      enabled: module === 'processes' ? sectors.length > 0 : current.enabled,
    })
  }
  const processes = access('processes')
  const routines = access('routines')
  const routineDepartments = [
    ...departments,
    ...(routines.sectors ?? [])
      .filter((item) => !departments.some((dept) => dept.id === item.sector))
      .map((item) => ({
        id: item.sector,
        name: `Departamento ${item.sector}`,
      })),
  ]
  return (
    <div className="space-y-5">
      <fieldset disabled={disabled} className="record-section min-w-0">
        <legend className="app-component-title mb-3">Processos</legend>
        <div className="flex flex-wrap gap-3">
          {PROCESS_SECTORS.map((sector) => (
            <label
              key={sector.id}
              className="flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-control-border)] px-3 text-sm"
            >
              <input
                id={`member-sector-processes-${sector.id}`}
                type="checkbox"
                disabled={disabled}
                checked={
                  processes.enabled &&
                  !!processes.sectors?.some((item) => item.sector === sector.id)
                }
                onChange={(e) =>
                  setGrant('processes', sector.id, e.target.checked)
                }
              />
              {sector.name}
            </label>
          ))}
        </div>
        <p className="app-caption mt-2">
          Nenhum setor selecionado significa sem acesso a Processos.
        </p>
        {processes.enabled && !!processes.sectors?.length && (
          <details className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Detalhes opcionais dos setores
            </summary>
            <p className="app-caption mt-2">
              Cargo descritivo; não altera permissões.
            </p>
            <div className="mt-3 grid gap-3">
              {processes.sectors.map((grant) => (
                <TextField
                  key={grant.sector}
                  id={`member-title-${grant.sector}`}
                  label={`Cargo em ${PROCESS_SECTORS.find((s) => s.id === grant.sector)?.name ?? grant.sector}`}
                  value={grant.jobTitle ?? ''}
                  maxLength={120}
                  disabled={disabled}
                  onChange={(e) =>
                    update('processes', {
                      sectors: processes.sectors?.map((item) =>
                        item.sector === grant.sector
                          ? { ...item, jobTitle: e.target.value }
                          : item,
                      ),
                    })
                  }
                />
              ))}
            </div>
          </details>
        )}
      </fieldset>
      <fieldset disabled={disabled} className="record-section min-w-0">
        <legend className="app-component-title mb-3">Rotinas</legend>
        <Select
          id="member-module-routines"
          label="Acesso a Rotinas"
          value={!routines.enabled ? 'none' : (routines.role ?? 'departments')}
          disabled={disabled}
          onChange={(e) =>
            update('routines', {
              enabled: e.target.value !== 'none',
              role: e.target.value === 'admin' ? 'admin' : 'departments',
            })
          }
        >
          <option value="none">Sem acesso</option>
          <option value="departments">Por departamento</option>
          <option value="admin">Administrador de Rotinas</option>
        </Select>
        {routines.enabled && routines.role === 'admin' && (
          <p className="app-caption mt-2">
            Administra todos os departamentos de Rotinas.
          </p>
        )}
        {routines.enabled && routines.role !== 'admin' && (
          <div className="mt-3 space-y-3">
            {!routineDepartments.length && (
              <p className="app-caption">Nenhum departamento disponível.</p>
            )}
            {routineDepartments.map((department) => {
              const grant = routines.sectors?.find(
                (item) => item.sector === department.id,
              )
              return (
                <div
                  key={department.id}
                  className="flex flex-wrap items-center gap-3"
                >
                  <label className="flex min-h-10 min-w-32 flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      aria-label={`Acesso ao departamento ${department.name}`}
                      checked={!!grant}
                      onChange={(e) =>
                        setGrant('routines', department.id, e.target.checked)
                      }
                    />
                    {department.name}
                  </label>
                  {grant && (
                    <Select
                      id={`member-sector-routines-${department.id}`}
                      aria-label={`Nível em ${department.name}`}
                      value={grant.role}
                      disabled={disabled}
                      onChange={(e) =>
                        update('routines', {
                          sectors: routines.sectors?.map((item) =>
                            item.sector === department.id
                              ? {
                                  ...item,
                                  role: e.target.value as
                                    'viewer' | 'contributor' | 'lead',
                                }
                              : item,
                          ),
                        })
                      }
                    >
                      <option value="viewer">Leitor</option>
                      <option value="contributor">Colaborador</option>
                      <option value="lead">Líder</option>
                    </Select>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </fieldset>
      {(['companies', 'honorarios'] as const).map((module) => (
        <fieldset
          key={module}
          disabled={disabled}
          className="record-section min-w-0"
        >
          <legend className="app-component-title mb-3">
            {MODULE_LABELS[module]}
          </legend>
          <Select
            disabled={disabled}
            id={`member-module-${module}`}
            label={`Acesso a ${MODULE_LABELS[module]}`}
            value={
              access(module).enabled ? (access(module).role ?? '') : 'none'
            }
            onChange={(e) =>
              update(module, {
                enabled: e.target.value !== 'none',
                role:
                  e.target.value === 'none'
                    ? undefined
                    : (e.target.value as HonorariosRole),
                sectors: undefined,
              })
            }
          >
            <option value="none">Sem acesso</option>
            {HONORARIOS_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </fieldset>
      ))}
    </div>
  )
}
