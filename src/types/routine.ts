import type { RoutineRecurrence } from './domain'

export interface RoutineEditInput {
  name: string
  shotname: string
  description: string
  recurrence: RoutineRecurrence
  defaultDueDays: number
  defaultAssigneeMemberId?: string | null
  recurrenceMonths: number[]
}
