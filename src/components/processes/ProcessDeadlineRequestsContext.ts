import { createContext } from 'react'
import type { ApiResponse } from '../../services/httpClient'
import type {
  ProcessDeadlineDecision,
  ProcessDeadlineRequestInput,
  ProcessDeadlineRequestState,
  ProcessResource,
} from '../../types/processes'

export interface ProcessDeadlineRequestsGateway {
  read: (
    processId: string,
    signal?: AbortSignal,
  ) => Promise<ProcessDeadlineRequestState>
  submit: (
    processId: string,
    input: ProcessDeadlineRequestInput,
    key: string,
  ) => Promise<ApiResponse<ProcessResource>>
  decide: (
    processId: string,
    requestId: string,
    version: number,
    decision: ProcessDeadlineDecision,
  ) => Promise<ApiResponse<ProcessResource>>
}

export const ProcessDeadlineRequestsContext =
  createContext<ProcessDeadlineRequestsGateway | null>(null)
