import { HttpClient, httpClient, type ApiRequestOptions } from './httpClient'
import type {
  HonorariosAdjustmentInput,
  HonorariosCalculateResponse,
  HonorariosClient,
  HonorariosClientFilters,
  HonorariosClientInput,
  HonorariosClientPatch,
  HonorariosCompanyOption,
  HonorariosConfiguration,
  HonorariosConfigurationInput,
  HonorariosDashboard,
  HonorariosHistoryEvent,
  HonorariosImportResult,
  HonorariosPage,
  HonorariosPageFilters,
  HonorariosProfile,
  HonorariosQuote,
  HonorariosQuoteConvertInput,
  HonorariosQuoteFilters,
  HonorariosQuoteInput,
  HonorariosQuoteStateInput,
} from '../types/honorarios'

const ENDPOINT = '/api/v1/honorarios/'

export class HonorariosContractError extends Error {
  constructor(
    readonly field: string,
    readonly requestId: string | null = null,
  ) {
    super(
      `Resposta incompatível com o contrato de Honorários: ${field}.${requestId ? ` Requisição: ${requestId}.` : ''}`,
    )
    this.name = 'HonorariosContractError'
  }
}

type RecordValue = Record<string, unknown>
type Check<T> = (value: unknown, path: string) => T
function object(value: unknown, path: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new HonorariosContractError(path)
  return value as RecordValue
}
function string(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new HonorariosContractError(path)
  return value
}
function integer(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw new HonorariosContractError(path)
  return value as number
}
function money(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^-?\d+\.\d{2}$/.test(value))
    throw new HonorariosContractError(path)
  return value
}
function namedObject<T>(fields: string[]): Check<T> {
  return (value, path) => {
    const result = object(value, path)
    for (const field of fields)
      if (!(field in result))
        throw new HonorariosContractError(`${path}.${field}`)
    return result as T
  }
}
const checkCalculation = namedObject<HonorariosCalculateResponse>([
  'paramsVersion',
  'calculation',
  'plans',
])
const checkConfiguration = namedObject<HonorariosConfiguration>([
  'version',
  'params',
  'office',
  'permissions',
])
const checkConfigurationInput = namedObject<HonorariosConfigurationInput>([
  'version',
  'params',
  'office',
])
const checkClient: Check<HonorariosClient> = (value, path) => {
  const result = object(value, path)
  string(result.id, `${path}.id`)
  integer(result.version, `${path}.version`)
  integer(result.paramsVersion, `${path}.paramsVersion`)
  money(result.currentFee, `${path}.currentFee`)
  object(result.company, `${path}.company`)
  object(result.profile, `${path}.profile`)
  object(result.calculation, `${path}.calculation`)
  if (!['abaixo', 'alinhado', 'acima'].includes(String(result.alignment)))
    throw new HonorariosContractError(`${path}.alignment`)
  return result as unknown as HonorariosClient
}
const checkQuote: Check<HonorariosQuote> = (value, path) => {
  const result = object(value, path)
  string(result.id, `${path}.id`)
  string(result.number, `${path}.number`)
  integer(result.version, `${path}.version`)
  integer(result.revision, `${path}.revision`)
  const snapshot = object(result.snapshot, `${path}.snapshot`)
  money(snapshot.value, `${path}.snapshot.value`)
  if (!Array.isArray(snapshot.plans))
    throw new HonorariosContractError(`${path}.snapshot.plans`)
  if (
    !['rascunho', 'enviado', 'aceito', 'recusado'].includes(
      String(result.status),
    )
  )
    throw new HonorariosContractError(`${path}.status`)
  return result as unknown as HonorariosQuote
}
const checkHistory = namedObject<HonorariosHistoryEvent>([
  'id',
  'kind',
  'actorId',
  'createdAt',
  'details',
])
const checkCompany = namedObject<HonorariosCompanyOption>([
  'id',
  'name',
  'cnpj',
  'code',
])
function page<T>(check: Check<T>): Check<HonorariosPage<T>> {
  return (value, path) => {
    const result = object(value, path)
    integer(result.count, `${path}.count`)
    if (!Array.isArray(result.results))
      throw new HonorariosContractError(`${path}.results`)
    for (const field of ['next', 'previous'])
      if (result[field] !== null) string(result[field], `${path}.${field}`)
    return {
      count: result.count as number,
      next: result.next as string | null,
      previous: result.previous as string | null,
      results: result.results.map((item, index) =>
        check(item, `${path}.results[${index}]`),
      ),
    }
  }
}

/** All JSON methods unwrap the API's `data` envelope. No financial data is stored in the browser. */
export class HonorariosService {
  constructor(private readonly http: HttpClient) {}

  private async json<T>(
    path: string,
    options: ApiRequestOptions,
    check: Check<T>,
  ): Promise<T> {
    const response = await this.http.request<unknown>(
      `${ENDPOINT}${path}`,
      options,
    )
    try {
      const envelope = object(response.data, 'response')
      return check(envelope.data, 'data')
    } catch (error) {
      if (error instanceof HonorariosContractError)
        throw new HonorariosContractError(error.field, response.requestId)
      throw error
    }
  }

  configuration(signal?: AbortSignal): Promise<HonorariosConfiguration> {
    return this.json('configuration/', { signal }, checkConfiguration)
  }
  saveConfiguration(
    input: HonorariosConfigurationInput,
    signal?: AbortSignal,
  ): Promise<HonorariosConfigurationInput> {
    const { version, params, office } = input
    return this.json(
      'configuration/',
      { method: 'PUT', json: { version, params, office }, signal },
      checkConfigurationInput,
    )
  }
  configurationHistory(
    filters: HonorariosPageFilters = {},
    signal?: AbortSignal,
  ) {
    return this.json(
      'configuration-history/',
      { query: { ...filters }, signal },
      page(checkHistory),
    )
  }
  calculate(
    profile: HonorariosProfile,
    signal?: AbortSignal,
  ): Promise<HonorariosCalculateResponse> {
    return this.json(
      'calculate/',
      { method: 'POST', json: { profile }, signal },
      checkCalculation,
    )
  }
  companyOptions(
    q = '',
    signal?: AbortSignal,
    pagination: HonorariosPageFilters = {},
  ) {
    return this.json(
      'company-options/',
      { query: { q: q || undefined, pageSize: 100, ...pagination }, signal },
      page(checkCompany),
    )
  }
  clients(filters: HonorariosClientFilters = {}, signal?: AbortSignal) {
    return this.json(
      'clients/',
      { query: { archived: false, ...filters }, signal },
      page(checkClient),
    )
  }
  client(id: string, signal?: AbortSignal) {
    return this.json(recordPath('clients', id), { signal }, checkClient)
  }
  createClient(input: HonorariosClientInput, signal?: AbortSignal) {
    return this.json(
      'clients/',
      { method: 'POST', json: input, signal },
      checkClient,
    )
  }
  updateClient(id: string, input: HonorariosClientPatch, signal?: AbortSignal) {
    return this.json(
      recordPath('clients', id),
      { method: 'PATCH', json: input, signal },
      checkClient,
    )
  }
  adjustClient(
    id: string,
    input: HonorariosAdjustmentInput,
    signal?: AbortSignal,
  ) {
    const { version, paramsVersion, mode } = input
    return this.json(
      recordPath('clients', id, 'adjust'),
      { method: 'POST', json: { version, paramsVersion, mode }, signal },
      checkClient,
    )
  }
  archiveClient(id: string, version: number, signal?: AbortSignal) {
    return this.json(
      recordPath('clients', id, 'archive'),
      { method: 'POST', json: { version }, signal },
      checkClient,
    )
  }
  restoreClient(id: string, version: number, signal?: AbortSignal) {
    return this.json(
      recordPath('clients', id, 'restore'),
      { method: 'POST', json: { version }, signal },
      checkClient,
    )
  }
  clientHistory(
    id: string,
    filters: HonorariosPageFilters = {},
    signal?: AbortSignal,
  ) {
    return this.json(
      recordPath('clients', id, 'history'),
      { query: { ...filters }, signal },
      page(checkHistory),
    )
  }
  importClients(
    rows: HonorariosClientInput[],
    signal?: AbortSignal,
  ): Promise<HonorariosImportResult> {
    if (rows.length < 1 || rows.length > 1000)
      throw new Error('Envie de 1 a 1000 linhas por lote de importação.')
    return this.json(
      'clients/import/',
      { method: 'POST', json: { rows }, signal },
      namedObject(['count', 'ids']),
    )
  }
  async exportClients(
    filters: HonorariosClientFilters = {},
    signal?: AbortSignal,
  ): Promise<string> {
    const { page: _page, pageSize: _pageSize, ...query } = filters
    void _page
    void _pageSize
    const result = await this.http.get<string>(`${ENDPOINT}clients/export/`, {
      query: { archived: false, ...query },
      signal,
      headers: { Accept: 'text/csv, application/problem+json' },
    })
    if (
      typeof result.data !== 'string' ||
      !result.headers.get('Content-Type')?.includes('text/csv')
    ) {
      throw new HonorariosContractError('export CSV', result.requestId)
    }
    // Response.text() may consume the UTF-8 BOM; keep Excel's encoding marker in the downloaded file.
    return result.data.startsWith('\uFEFF')
      ? result.data
      : `\uFEFF${result.data}`
  }
  quotes(filters: HonorariosQuoteFilters = {}, signal?: AbortSignal) {
    return this.json(
      'quotes/',
      { query: { archived: false, ...filters }, signal },
      page(checkQuote),
    )
  }
  quote(id: string, signal?: AbortSignal) {
    return this.json(recordPath('quotes', id), { signal }, checkQuote)
  }
  createQuote(input: HonorariosQuoteInput, signal?: AbortSignal) {
    return this.json(
      'quotes/',
      { method: 'POST', json: input, signal },
      checkQuote,
    )
  }
  changeQuoteState(
    id: string,
    input: HonorariosQuoteStateInput,
    signal?: AbortSignal,
  ) {
    const { version, status, selectedPlan } = input
    return this.json(
      recordPath('quotes', id, 'state'),
      {
        method: 'POST',
        json: {
          version,
          status,
          ...(selectedPlan !== undefined ? { selectedPlan } : {}),
        },
        signal,
      },
      checkQuote,
    )
  }
  convertQuote(
    id: string,
    input: HonorariosQuoteConvertInput,
    signal?: AbortSignal,
  ) {
    const { version, companyId } = input
    return this.json(
      recordPath('quotes', id, 'convert'),
      { method: 'POST', json: { version, companyId }, signal },
      checkClient,
    )
  }
  archiveQuote(id: string, version: number, signal?: AbortSignal) {
    return this.json(
      recordPath('quotes', id, 'archive'),
      { method: 'POST', json: { version }, signal },
      checkQuote,
    )
  }
  restoreQuote(id: string, version: number, signal?: AbortSignal) {
    return this.json(
      recordPath('quotes', id, 'restore'),
      { method: 'POST', json: { version }, signal },
      checkQuote,
    )
  }
  quoteHistory(
    id: string,
    filters: HonorariosPageFilters = {},
    signal?: AbortSignal,
  ) {
    return this.json(
      recordPath('quotes', id, 'history'),
      { query: { ...filters }, signal },
      page(checkHistory),
    )
  }
  proposal(id: string, signal?: AbortSignal) {
    return this.json(
      recordPath('quotes', id, 'proposal'),
      { signal },
      checkQuote,
    )
  }
  dashboard(
    maxIncreasePct?: number,
    signal?: AbortSignal,
  ): Promise<HonorariosDashboard> {
    return this.json(
      'dashboard/',
      { query: { maxIncreasePct }, signal },
      (value, path) => {
        const result = object(value, path)
        const clients = object(result.clients, `${path}.clients`)
        const quotes = object(result.quotes, `${path}.quotes`)
        const plan = object(
          clients.adjustmentPlan,
          `${path}.clients.adjustmentPlan`,
        )
        // DRF emits Decimal ratios as strings. Normalize ratios only; money stays decimal text.
        const percent = Number(plan.maxIncreasePct)
        const rate =
          quotes.acceptanceRate === null ? null : Number(quotes.acceptanceRate)
        if (
          !Number.isFinite(percent) ||
          (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 1))
        )
          throw new HonorariosContractError(`${path}.ratios`)
        // Python Counter omits absent statuses. Empty categories still have a visible zero in the UI.
        const alignment = object(
          clients.byAlignment,
          `${path}.clients.byAlignment`,
        )
        const statuses = object(quotes.byStatus, `${path}.quotes.byStatus`)
        const byAlignment = Object.fromEntries(
          ['abaixo', 'alinhado', 'acima'].map((key) => [
            key,
            integer(alignment[key] ?? 0, `${path}.clients.byAlignment.${key}`),
          ]),
        )
        const byStatus = Object.fromEntries(
          ['rascunho', 'enviado', 'aceito', 'recusado'].map((key) => [
            key,
            integer(statuses[key] ?? 0, `${path}.quotes.byStatus.${key}`),
          ]),
        )
        return {
          ...result,
          clients: {
            ...clients,
            byAlignment,
            adjustmentPlan: { ...plan, maxIncreasePct: percent },
          },
          quotes: { ...quotes, byStatus, acceptanceRate: rate },
        } as unknown as HonorariosDashboard
      },
    )
  }
}

function recordPath(
  collection: 'clients' | 'quotes',
  id: string,
  action?: string,
): string {
  if (!id.trim()) throw new Error('Informe o registro de Honorários.')
  return `${collection}/${encodeURIComponent(id)}/${action ? `${action}/` : ''}`
}

export const honorariosService = new HonorariosService(httpClient)
