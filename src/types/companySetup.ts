import type { ClientCompanyInput } from '../services/companyService'

export interface CompanySetupInput {
  company: ClientCompanyInput
  screenId?: string
  routineIds: string[]
  startsOn: string
}

export interface CreateCompanyResult {
  company: { id: string; name: string }
  linkedRoutineCount: number
  screenName?: string
}

export interface CompanySetupPartialResult {
  company: { id: string; name: string }
  linkedRoutineCount: number
  requestedRoutineCount: number
  screenLinked: boolean
  nextStep: string
}

export class CompanySetupError extends Error {
  readonly partial: CompanySetupPartialResult

  constructor(message: string, partial: CompanySetupPartialResult) {
    super(message)
    this.name = 'CompanySetupError'
    this.partial = partial
  }
}
