import type { ProcessDeadlineRequestsGateway } from '../components/processes/ProcessDeadlineRequestsContext'
import { httpClient, type ApiResponse } from '../services/httpClient'
import { parseProcessDetail } from '../services/processContract'
import type { ProcessDeadlineRequestState } from '../types/processes'

function path(processId: string) {
  return `/api/v1/processes/${encodeURIComponent(processId)}/preview-deadline-requests/`
}

function processResponse(response: ApiResponse<unknown>) {
  return {
    ...response,
    data: parseProcessDetail(response.data, response.requestId),
  }
}

export const previewDeadlineRequests: ProcessDeadlineRequestsGateway = {
  async read(processId, signal) {
    const response = await httpClient.get<ProcessDeadlineRequestState>(
      path(processId),
      { signal },
    )
    return response.data
  },
  async submit(processId, input, key) {
    return processResponse(
      await httpClient.post(path(processId), input, { idempotencyKey: key }),
    )
  },
  async decide(processId, requestId, version, decision) {
    return processResponse(
      await httpClient.post(
        `${path(processId)}${encodeURIComponent(requestId)}/decision/`,
        { version, decision },
      ),
    )
  },
}
