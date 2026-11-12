import type { OrganizationMemberResource } from '../services/organizationMemberService'
import {
  PROCESS_SECTORS,
  HONORARIOS_ROLES,
  MODULE_LABELS,
  type ModuleAccessConfiguration,
} from '../types/modules'

export function initialModuleAccesses(
  member?: OrganizationMemberResource,
): ModuleAccessConfiguration[] {
  if (member?.moduleAccesses !== undefined)
    return (['routines', 'processes', 'companies', 'honorarios'] as const).map(
      (module) =>
        structuredClone(
          member.moduleAccesses?.find((access) => access.module === module) ?? {
            module,
            enabled: false,
          },
        ),
    )
  return [
    member
      ? {
          module: 'routines',
          enabled:
            member.role !== 'member' || member.departmentAccesses.length > 0,
          role: member.role !== 'member' ? 'admin' : 'departments',
          sectors: member.departmentAccesses.map((access) => ({
            sector: access.departmentId,
            role: access.role,
          })),
        }
      : { module: 'routines', enabled: false },
    { module: 'processes', enabled: false },
    { module: 'companies', enabled: false },
    { module: 'honorarios', enabled: false },
  ]
}

export function moduleAccessError(
  value: ModuleAccessConfiguration[],
): string | undefined {
  for (const access of value) {
    if (access.module === 'honorarios' || access.module === 'companies') {
      if (
        access.enabled &&
        !HONORARIOS_ROLES.some((role) => role.id === access.role)
      )
        return `Selecione o papel de acesso a ${MODULE_LABELS[access.module]}.`
      continue
    }
    if (
      access.enabled &&
      !(access.module === 'routines' && access.role === 'admin') &&
      !access.sectors?.length
    )
      return `Selecione ao menos um ${access.module === 'routines' ? 'departamento em Rotinas' : 'setor em Processos'} ou escolha Sem acesso.`
  }
}

export function moduleAccessPayload(
  value: ModuleAccessConfiguration[],
): ModuleAccessConfiguration[] {
  return value.map((access) =>
    !access.enabled
      ? { module: access.module, enabled: false }
      : access.module === 'honorarios' || access.module === 'companies'
        ? { module: access.module, enabled: true, role: access.role }
        : access.module === 'routines' && access.role === 'admin'
          ? { module: 'routines', enabled: true, role: 'admin' }
          : {
              module: access.module,
              enabled: true,
              ...(access.module === 'routines'
                ? { role: 'departments' as const }
                : {}),
              sectors: access.sectors ?? [],
            },
  )
}

export function moduleAccessLabels(
  member: OrganizationMemberResource,
): string[] {
  if (member.moduleAccesses === undefined) return []
  return member.moduleAccesses.map((access) => {
    const name = MODULE_LABELS[access.module]
    if (!access.enabled) return `${name}: sem acesso`
    if (access.module === 'honorarios' || access.module === 'companies')
      return `${name}: ${HONORARIOS_ROLES.find((role) => role.id === access.role)?.name ?? 'papel não informado'}`
    if (access.module === 'routines' && access.role === 'admin')
      return 'Rotinas: administrador'
    return `${name}: ${(access.sectors ?? [])
      .map((sector) => {
        const label =
          access.module === 'processes'
            ? PROCESS_SECTORS.find((item) => item.id === sector.sector)?.name
            : member.departmentAccesses.find(
                (item) => item.departmentId === sector.sector,
              )?.departmentName
        return `${label ?? sector.sector}${sector.jobTitle ? ` · ${sector.jobTitle}` : ''}`
      })
      .join(', ')}`
  })
}
