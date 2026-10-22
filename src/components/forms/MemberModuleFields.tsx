import Select from '../ui/Select'
import TextField from '../ui/TextField'
import type { Department } from '../../types/domain'
import {
  PROCESS_SECTORS,
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
  function update(
    module: 'routines' | 'processes',
    patch: Partial<ModuleAccessConfiguration>,
  ) {
    const current = value.find((item) => item.module === module) ?? {
      module,
      enabled: false,
    }
    onChange([
      ...value.filter((item) => item.module !== module),
      { ...current, ...patch },
    ])
  }
  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-[var(--color-text-muted)]">
        O cargo organizacional administra a conta. Os acessos abaixo definem
        separadamente onde a pessoa pode trabalhar.
      </p>
      {(['routines', 'processes'] as const).map((module) => {
        const access = value.find((item) => item.module === module) ?? {
          module,
          enabled: false,
        }
        const title = module === 'routines' ? 'Rotinas' : 'Processos'
        const choices =
          module === 'routines'
            ? departments.map((item) => ({ id: item.id, name: item.name }))
            : PROCESS_SECTORS
        // Keep grants to departments not present in the current catalogue intact.
        const sectors = [
          ...choices,
          ...(access.sectors ?? [])
            .filter(
              (item) => !choices.some((choice) => choice.id === item.sector),
            )
            .map((item) => ({
              id: item.sector,
              name: `Departamento ${item.sector}`,
            })),
        ]
        return (
          <fieldset
            key={module}
            disabled={disabled}
            className="space-y-3 rounded-[var(--radius-control)] border border-[var(--color-divider)] p-4"
          >
            <legend className="px-1 text-sm font-black text-[var(--color-text-strong)]">
              {title}
            </legend>
            <Select
              disabled={disabled}
              id={`member-module-${module}`}
              label={`Acesso a ${title}`}
              value={
                !access.enabled
                  ? 'none'
                  : module === 'routines'
                    ? (access.role ?? 'departments')
                    : 'sectors'
              }
              onChange={(event) =>
                update(module, {
                  enabled: event.target.value !== 'none',
                  ...(module === 'routines'
                    ? {
                        role:
                          event.target.value === 'admin'
                            ? 'admin'
                            : 'departments',
                      }
                    : {}),
                })
              }
            >
              <option value="none">Sem acesso</option>
              {module === 'routines' ? (
                <>
                  <option value="admin">Administrador de Rotinas</option>
                  <option value="departments">Por departamento</option>
                </>
              ) : (
                <option value="sectors">Por setor</option>
              )}
            </Select>
            {access.enabled &&
              access.role === 'admin' &&
              module === 'routines' && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Administra todos os departamentos de Rotinas. Não concede
                  administração de contas.
                </p>
              )}
            {access.enabled &&
              !(module === 'routines' && access.role === 'admin') && (
                <div className="space-y-3">
                  {sectors.length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Nenhum departamento disponível.
                    </p>
                  )}
                  {sectors.map((sector) => {
                    const grant = access.sectors?.find(
                      (item) => item.sector === sector.id,
                    )
                    const setGrant = (role: string) =>
                      update(module, {
                        sectors: [
                          ...(access.sectors ?? []).filter(
                            (item) => item.sector !== sector.id,
                          ),
                          ...(role
                            ? [
                                {
                                  sector: sector.id,
                                  role: role as NonNullable<
                                    ModuleAccessConfiguration['sectors']
                                  >[number]['role'],
                                  ...(module === 'processes'
                                    ? { jobTitle: grant?.jobTitle ?? '' }
                                    : {}),
                                },
                              ]
                            : []),
                        ],
                      })
                    return (
                      <div key={sector.id} className="space-y-2">
                        <Select
                          disabled={disabled}
                          id={`member-sector-${module}-${sector.id}`}
                          label={sector.name}
                          value={grant?.role ?? ''}
                          onChange={(event) => setGrant(event.target.value)}
                        >
                          <option value="">Sem acesso</option>
                          {module === 'routines' ? (
                            <>
                              <option value="lead">Líder</option>
                              <option value="contributor">Colaborador</option>
                              <option value="viewer">Leitor</option>
                            </>
                          ) : (
                            <option value={sector.id}>Com acesso</option>
                          )}
                        </Select>
                        {module === 'processes' && grant && (
                          <TextField
                            disabled={disabled}
                            maxLength={120}
                            id={`member-title-${sector.id}`}
                            label={`Cargo em ${sector.name}`}
                            value={grant.jobTitle ?? ''}
                            onChange={(event) =>
                              update(module, {
                                sectors: access.sectors?.map((item) =>
                                  item.sector === sector.id
                                    ? { ...item, jobTitle: event.target.value }
                                    : item,
                                ),
                              })
                            }
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
          </fieldset>
        )
      })}
    </div>
  )
}
