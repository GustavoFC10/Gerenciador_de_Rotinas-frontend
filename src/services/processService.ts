import { ApiError, HttpClient, httpClient } from './httpClient'
import { getRetryAfterSeconds } from '../utils/apiErrors'
import type { ApiResponse, QueryParameters } from './httpClient'
import type {
  PreparedProcessAlert,
  ProcessAlert,
  ProcessAlertFilters,
  ProcessAlertPage,
  ProcessAlertRecipientFilters,
  ProcessAlertRecipientPage,
  ProcessAlertSelection,
  ProcessCatalog,
  ProcessCompanyOptionsFilters,
  ProcessCompanyOptionsPage,
  ProcessCreateInput,
  ProcessEntriesFilters,
  ProcessEntriesPage,
  ProcessFilters,
  ProcessFollowUp,
  ProcessFollowUpFilters,
  ProcessFollowUpPage,
  ProcessIndicators,
  ProcessMonthlyReport,
  ProcessPage,
  ProcessPatchInput,
  ProcessResource,
  ProcessTaskTransition,
} from '../types/processes'
import {
  normalizeProcessAlertFilters,
  normalizeProcessAlertRecipientFilters,
  normalizeProcessCompanyOptionsFilters,
  normalizeProcessFollowUpFilters,
  normalizeProcessEntriesFilters,
  normalizeProcessFilters,
  parseProcessCatalog,
  parseProcessCompanyOptionsPage,
  parsePreparedProcessAlert,
  parseProcessAlert,
  parseProcessAlertPage,
  parseProcessAlertRecipientPage,
  parseProcessDetail,
  parseProcessEntriesPage,
  parseProcessFollowUp,
  parseProcessFollowUpPage,
  parseProcessIndicators,
  parseProcessMonthlyReport,
  parseProcessPage,
  ProcessContractError,
} from './processContract'

const PROCESSES_ENDPOINT = '/api/v1/processes/'
const FOLLOW_UPS_ENDPOINT = '/api/v1/process-follow-ups/'
const ALERTS_ENDPOINT = '/api/v1/process-alerts/'

export class ProcessService {
  private cooldown: { error: ApiError; until: number } | null = null

  constructor(private readonly client: HttpClient) {}

  private guarded<T>(
    operation: () => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    if (this.cooldown && this.cooldown.until > Date.now())
      return Promise.reject(this.cooldown.error)
    this.cooldown = null
    return operation().catch((error: unknown) => {
      if (error instanceof ApiError && [429, 503].includes(error.status)) {
        const seconds = getRetryAfterSeconds(error.retryAfter)
        if (seconds !== null && seconds > 0)
          this.cooldown = { error, until: Date.now() + seconds * 1000 }
      }
      throw error
    })
  }

  private validated<T>(
    operation: () => Promise<ApiResponse<unknown>>,
    parse: (value: unknown, requestId?: string | null) => T,
    paginationBaseUrl?: string,
  ): Promise<ApiResponse<T>> {
    return validateResponse(this.guarded(operation), parse, paginationBaseUrl)
  }

  catalog(signal?: AbortSignal): Promise<ApiResponse<ProcessCatalog>> {
    return this.validated(
      () => this.client.get(`${PROCESSES_ENDPOINT}catalog/`, { signal }),
      parseProcessCatalog,
    )
  }

  list(
    filters: ProcessFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessPage>> {
    return this.validated(
      () =>
        this.client.get(PROCESSES_ENDPOINT, {
          query: processQuery(filters),
          signal,
        }),
      parseProcessPage,
      this.client.baseUrl,
    )
  }

  companyOptions(
    filters: ProcessCompanyOptionsFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessCompanyOptionsPage>> {
    const normalized = normalizeProcessCompanyOptionsFilters(filters)
    return this.validated(
      () =>
        this.client.get(`${PROCESSES_ENDPOINT}company-options/`, {
          query: {
            ...(normalized.search ? { search: normalized.search } : {}),
            page: normalized.page,
            pageSize: normalized.pageSize,
          },
          signal,
        }),
      parseProcessCompanyOptionsPage,
      this.client.baseUrl,
    )
  }

  entries(
    id: string,
    filters: ProcessEntriesFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessEntriesPage>> {
    return this.validated(
      () =>
        this.client.get(`${processPath(id)}entries/`, {
          query: normalizeProcessEntriesFilters(filters),
          signal,
        }),
      parseProcessEntriesPage,
      this.client.baseUrl,
    )
  }

  get(id: string, signal?: AbortSignal): Promise<ApiResponse<ProcessResource>> {
    return this.validated(
      () => this.client.get(processPath(id), { signal }),
      parseProcessDetail,
    )
  }

  /** A mesma abertura deve reutilizar sua chave e corpo após falha de rede. */
  create(
    input: ProcessCreateInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<ProcessResource>> {
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)) {
      throw new Error('A chave de abertura do processo é inválida.')
    }
    if (input.tipo === 'abertura' && !input.empresa.trim())
      throw new Error('Informe o nome da empresa.')
    if (input.tipo !== 'abertura' && !input.companyId)
      throw new Error('Selecione uma empresa cadastrada para abrir o processo.')
    const { empresa, cnpj, companyId, ...fields } = input
    const payload =
      input.tipo === 'abertura'
        ? { ...fields, empresa: empresa.trim(), cnpj: cnpj?.trim() ?? '' }
        : { ...fields, companyId }
    return this.validated(
      () => this.client.post(PROCESSES_ENDPOINT, payload, { idempotencyKey }),
      parseProcessDetail,
    )
  }

  update(
    id: string,
    input: ProcessPatchInput,
  ): Promise<ApiResponse<ProcessResource>> {
    return this.validated(
      () => this.client.patch(processPath(id), input),
      parseProcessDetail,
    )
  }

  remove(id: string, version: number): Promise<ApiResponse<void>> {
    // O contrato de Processos usa version no JSON, inclusive em DELETE.
    return this.guarded(() =>
      this.client.request(processPath(id), {
        method: 'DELETE',
        json: { version },
      }),
    )
  }

  transitionTask(
    id: string,
    taskId: string,
    version: number,
    state: ProcessTaskTransition,
  ): Promise<ApiResponse<ProcessResource>> {
    return this.validated(
      () =>
        this.client.post(
          `${processPath(id)}tasks/${encodeURIComponent(taskId)}/transition/`,
          { version, state },
        ),
      parseProcessDetail,
    )
  }

  addNote(
    id: string,
    version: number,
    text: string,
  ): Promise<ApiResponse<ProcessResource>> {
    return this.validated(
      () => this.client.post(`${processPath(id)}notes/`, { version, text }),
      parseProcessDetail,
    )
  }

  cancel(id: string, version: number): Promise<ApiResponse<ProcessResource>> {
    return this.validated(
      () => this.client.post(`${processPath(id)}cancel/`, { version }),
      parseProcessDetail,
    )
  }

  reopen(id: string, version: number): Promise<ApiResponse<ProcessResource>> {
    return this.validated(
      () => this.client.post(`${processPath(id)}reopen/`, { version }),
      parseProcessDetail,
    )
  }

  retryNotifications(
    id: string,
    version: number,
  ): Promise<ApiResponse<ProcessResource>> {
    return this.validated(
      () =>
        this.client.post(`${processPath(id)}notifications/retry/`, {
          version,
        }),
      parseProcessDetail,
    )
  }

  indicators(
    filters: ProcessFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessIndicators>> {
    return this.validated(
      () =>
        this.client.get(`${PROCESSES_ENDPOINT}indicators/`, {
          query: processQuery(filters),
          signal,
        }),
      parseProcessIndicators,
    )
  }

  monthlyReport(
    month: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessMonthlyReport>> {
    return this.validated(
      () =>
        this.client.get(`${PROCESSES_ENDPOINT}reports/monthly/`, {
          query: { month },
          signal,
        }),
      parseProcessMonthlyReport,
    )
  }

  followUps(
    filters: ProcessFollowUpFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessFollowUpPage>> {
    return this.validated(
      () =>
        this.client.get(FOLLOW_UPS_ENDPOINT, {
          query: { ...normalizeProcessFollowUpFilters(filters) },
          signal,
        }),
      parseProcessFollowUpPage,
      this.client.baseUrl,
    )
  }

  followUp(
    id: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessFollowUp>> {
    return this.validated(
      () =>
        this.client.get(`${FOLLOW_UPS_ENDPOINT}${encodeURIComponent(id)}/`, {
          signal,
        }),
      parseProcessFollowUp,
    )
  }

  completeFollowUp(
    id: string,
    version: number,
  ): Promise<ApiResponse<ProcessFollowUp>> {
    return this.validated(
      () =>
        this.client.post(
          `${FOLLOW_UPS_ENDPOINT}${encodeURIComponent(id)}/complete/`,
          { version },
        ),
      parseProcessFollowUp,
    )
  }

  alerts(
    filters: ProcessAlertFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessAlertPage>> {
    return this.validated(
      () =>
        this.client.get(ALERTS_ENDPOINT, {
          query: { ...normalizeProcessAlertFilters(filters) },
          signal,
        }),
      parseProcessAlertPage,
      this.client.baseUrl,
    )
  }

  alert(id: string, signal?: AbortSignal): Promise<ApiResponse<ProcessAlert>> {
    return this.validated(
      () =>
        this.client.get(`${ALERTS_ENDPOINT}${encodeURIComponent(id)}/`, {
          signal,
        }),
      parseProcessAlert,
    )
  }

  alertRecipientOptions(
    filters: ProcessAlertRecipientFilters = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ProcessAlertRecipientPage>> {
    return this.validated(
      () =>
        this.client.get(`${ALERTS_ENDPOINT}recipient-options/`, {
          query: { ...normalizeProcessAlertRecipientFilters(filters) },
          signal,
        }),
      parseProcessAlertRecipientPage,
      this.client.baseUrl,
    )
  }

  prepareAlert(
    id: string,
    input: ProcessAlertSelection,
  ): Promise<ApiResponse<PreparedProcessAlert>> {
    return this.validated(
      () =>
        this.client.post(
          `${ALERTS_ENDPOINT}${encodeURIComponent(id)}/prepare/`,
          input,
        ),
      parsePreparedProcessAlert,
    )
  }

  declareAlertSent(
    id: string,
    input: ProcessAlertSelection,
  ): Promise<ApiResponse<ProcessAlert>> {
    return this.validated(
      () =>
        this.client.post(
          `${ALERTS_ENDPOINT}${encodeURIComponent(id)}/declare-sent/`,
          input,
        ),
      parseProcessAlert,
    )
  }
}

export const processService = new ProcessService(httpClient)

function processPath(id: string): string {
  return `${PROCESSES_ENDPOINT}${encodeURIComponent(id)}/`
}

function processQuery(filters: ProcessFilters): QueryParameters {
  return { ...normalizeProcessFilters(filters) }
}

async function validateResponse<T>(
  response: Promise<ApiResponse<unknown>>,
  parse: (value: unknown, requestId?: string | null) => T,
  paginationBaseUrl?: string,
): Promise<ApiResponse<T>> {
  const result = await response
  const data = parse(result.data, result.requestId)
  if (paginationBaseUrl) {
    const pagination = data as { next: string | null; previous: string | null }
    for (const field of ['next', 'previous'] as const) {
      if (!pagination[field]) continue
      try {
        const target = new URL(pagination[field], paginationBaseUrl)
        if (target.origin !== new URL(paginationBaseUrl).origin)
          throw new Error('origin')
      } catch {
        throw new ProcessContractError(
          `response.${field} (origem de paginação inválida)`,
          result.requestId,
        )
      }
    }
  }
  return { ...result, data }
}
