import type { EntityId } from './domain'

export interface SpreadsheetNavigationItem {
  /** Departamento: agrupador visual das telas operacionais. */
  id: EntityId
  departmentId: EntityId
  name: string
  description?: string
  to: string
  screens: ScreenNavigationItem[]
}

/** Uma tela de planilha dentro de um departamento. */
export interface ScreenNavigationItem {
  id: EntityId
  departmentId: EntityId
  name: string
  description?: string
  to: string
}
