import type { DepartmentAccessRole } from './domain'

export type AppModule = 'routines' | 'processes'
export type ProcessSector = 'com' | 'fin' | 'reg'

export interface ModuleAccessConfiguration {
  module: AppModule
  enabled: boolean
  role?: 'admin' | 'departments'
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
  module: AppModule
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
