import type { EntityId } from './domain'

export interface SpreadsheetNavigationItem {
  id: EntityId
  departmentId: EntityId
  name: string
  description?: string
  to: string
}
