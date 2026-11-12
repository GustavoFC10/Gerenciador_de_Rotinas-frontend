import type { DepartmentAccessRole } from './domain'

export type AppModule = 'routines' | 'processes' | 'honorarios'
export type AccessibleModule = AppModule | 'companies'
export type ProcessSector = 'com' | 'fin' | 'reg'
export type HonorariosRole = 'viewer' | 'editor' | 'manager'

export const MODULE_LABELS: Record<AccessibleModule, string> = {
  routines: 'Rotinas',
  processes: 'Processos',
  companies: 'Empresas',
  honorarios: 'Honorários',
}

export const HONORARIOS_ROLES: { id: HonorariosRole; name: string }[] = [
  { id: 'viewer', name: 'Consulta' },
  { id: 'editor', name: 'Operação' },
  { id: 'manager', name: 'Administração' },
]

export interface ModuleAccessConfiguration {
  module: AccessibleModule
  enabled: boolean
  role?: 'admin' | 'departments' | HonorariosRole
  sectors?: Array<{
    sector: string
    role: DepartmentAccessRole | ProcessSector
    jobTitle?: string
  }>
}

export interface ModuleSector {
  id: string
  name: string
  role: string
  actions: string[]
  jobTitle?: string
}

export interface ModuleSummary {
  module: AccessibleModule
  role?: string
  globalAccess: boolean
  actions: string[]
  sectors: ModuleSector[]
  executeSectors?: string[]
}

export interface ModulePermissions {
  modules: ModuleSummary[]
}

export interface ModuleAccess {
  module: AppModule
  sector: string
  role: DepartmentAccessRole | ProcessSector
  jobTitle: string
}

export interface ModuleAccessInput {
  module: AppModule
  sector: string
  role: DepartmentAccessRole | ProcessSector
  jobTitle?: string
}

export const PROCESS_SECTORS = [
  { id: 'com', name: 'Diretoria' },
  { id: 'fin', name: 'Financeiro' },
  { id: 'reg', name: 'Regularidade' },
] as const
