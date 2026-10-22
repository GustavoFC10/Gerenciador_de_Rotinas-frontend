import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse, QueryParameters } from './httpClient'
import type {
  ProcessCatalog,
  ProcessCreateInput,
  ProcessFilters,
  ProcessIndicators,
  ProcessMonthlyReport,
  ProcessPage,
  ProcessPatchInput,
  ProcessResource,
  ProcessTaskTransition,
} from '../types/processes'

const PROCESSES_ENDPOINT = '/api/v1/processes/'

export class ProcessService {
  constructor(private readonly client: HttpClient) {}

  catalog(signal?: AbortSignal): Promise<ApiResponse<ProcessCatalog>> {
    return this.client.get(`${PROCESSES_ENDPOINT}catalog/`, { signal })
  }

  list(
    filters: ProcessFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessPage>> {
    return this.client.get(PROCESSES_ENDPOINT, {
      query: processQuery(filters),
      signal,
    })
  }

  async listAll(
    filters: ProcessFilters = {},
    signal?: AbortSignal,
  ): Promise<ProcessResource[]> {
    const results: ProcessResource[] = []
    let response = await this.list(filters, signal)

    while (true) {
      results.push(...response.data.results)
      if (!response.data.next) return results
      response = await this.client.get<ProcessPage>(response.data.next, {
        signal,
      })
    }
  }

  get(id: string, signal?: AbortSignal): Promise<ApiResponse<ProcessResource>> {
    return this.client.get(processPath(id), { signal })
  }

  /** A mesma abertura deve reutilizar sua chave e corpo após falha de rede. */
  create(
    input: ProcessCreateInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<ProcessResource>> {
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)) {
      throw new Error('A chave de abertura do processo é inválida.')
    }
    return this.client.post(PROCESSES_ENDPOINT, input, { idempotencyKey })
  }

  update(
    id: string,
    input: ProcessPatchInput,
  ): Promise<ApiResponse<ProcessResource>> {
    return this.client.patch(processPath(id), input)
  }

  remove(id: string, version: number): Promise<ApiResponse<void>> {
    // O contrato de Processos usa version no JSON, inclusive em DELETE.
    return this.client.request(processPath(id), {
      method: 'DELETE',
      json: { version },
    })
  }

  transitionTask(
    id: string,
    taskId: string,
    version: number,
    state: ProcessTaskTransition,
  ): Promise<ApiResponse<ProcessResource>> {
    return this.client.post(
      `${processPath(id)}tasks/${encodeURIComponent(taskId)}/transition/`,
      { version, state },
    )
  }

  addNote(
    id: string,
    version: number,
    text: string,
  ): Promise<ApiResponse<ProcessResource>> {
    return this.client.post(`${processPath(id)}notes/`, { version, text })
  }

  cancel(id: string, version: number): Promise<ApiResponse<ProcessResource>> {
    return this.client.post(`${processPath(id)}cancel/`, { version })
  }

  reopen(id: string, version: number): Promise<ApiResponse<ProcessResource>> {
    return this.client.post(`${processPath(id)}reopen/`, { version })
  }

  retryNotifications(
    id: string,
    version: number,
  ): Promise<ApiResponse<ProcessResource>> {
    return this.client.post(`${processPath(id)}notifications/retry/`, {
      version,
    })
  }

  indicators(
    filters: ProcessFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessIndicators>> {
    return this.client.get(`${PROCESSES_ENDPOINT}indicators/`, {
      query: processQuery(filters),
      signal,
    })
  }

  monthlyReport(
    month: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessMonthlyReport>> {
    return this.client.get(`${PROCESSES_ENDPOINT}reports/monthly/`, {
      query: { month },
      signal,
    })
  }
}

export const processService = new ProcessService(httpClient)

function processPath(id: string): string {
  return `${PROCESSES_ENDPOINT}${encodeURIComponent(id)}/`
}

function processQuery(filters: ProcessFilters): QueryParameters {
  return {
    page: filters.page,
    tipo: filters.tipo,
    status: filters.status,
    setor: filters.setor,
    q: filters.q,
    late: filters.late,
    waiting: filters.waiting,
    month: filters.month,
  }
}
