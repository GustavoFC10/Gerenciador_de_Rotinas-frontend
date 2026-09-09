import { formatProblemDetailsMessage } from '../utils/apiErrors'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'

type QueryPrimitive = string | number | boolean
type QueryValue = QueryPrimitive | null | undefined | readonly QueryPrimitive[]

export type QueryParameters = Record<string, QueryValue>

export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail?: string
  errors?: unknown
}

export interface ApiResponse<T> {
  data: T
  status: number
  etag: string | null
  requestId: string | null
  headers: Headers
}

export interface ApiRequestOptions {
  method?: HttpMethod
  query?: QueryParameters | URLSearchParams
  json?: unknown
  body?: BodyInit | null
  headers?: HeadersInit
  signal?: AbortSignal
  ifMatch?: string
  idempotencyKey?: string
  requestId?: string
  requiresCsrf?: boolean
}

export interface HttpClientOptions {
  baseUrl?: string
  fetchImplementation?: typeof fetch
  requestIdFactory?: () => string
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails
  readonly requestId: string | null
  readonly retryAfter: string | null
  readonly response: Response

  constructor({
    problem,
    requestId,
    response,
  }: {
    problem: ProblemDetails
    requestId: string | null
    response: Response
  }) {
    super(
      formatProblemDetailsMessage(problem, {
        status: response.status,
        retryAfter: response.headers.get('Retry-After'),
      }),
    )
    this.name = 'ApiError'
    this.status = response.status
    this.problem = problem
    this.requestId = requestId
    this.retryAfter = response.headers.get('Retry-After')
    this.response = response
  }
}

export class ApiNetworkError extends Error {
  readonly requestId: string

  constructor(message: string, requestId: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiNetworkError'
    this.requestId = requestId
  }
}

export class HttpClient {
  readonly baseUrl: string

  private readonly fetchImplementation: typeof fetch
  private readonly requestIdFactory: () => string
  private csrfToken: string | null = null

  constructor({
    baseUrl = getApiBaseUrl(),
    fetchImplementation = globalThis.fetch.bind(globalThis),
    requestIdFactory = createRequestId,
  }: HttpClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.fetchImplementation = fetchImplementation
    this.requestIdFactory = requestIdFactory
  }

  setCsrfToken(token: string): void {
    const normalizedToken = token.trim()

    if (!normalizedToken) {
      throw new Error('O token CSRF não pode ser vazio.')
    }

    this.csrfToken = normalizedToken
  }

  clearCsrfToken(): void {
    this.csrfToken = null
  }

  getCsrfToken(): string | null {
    return this.csrfToken
  }

  async request<T>(
    pathOrUrl: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const method = options.method ?? 'GET'
    const requestId = options.requestId ?? this.requestIdFactory()
    const url = buildRequestUrl(this.baseUrl, pathOrUrl, options.query)
    const headers = new Headers(options.headers)
    const requiresCsrf = options.requiresCsrf ?? isUnsafeMethod(method)

    if (options.json !== undefined && options.body !== undefined) {
      throw new Error('Informe apenas json ou body em uma requisição HTTP.')
    }

    headers.set(
      'Accept',
      headers.get('Accept') ?? 'application/json, application/problem+json',
    )
    headers.set('X-Request-ID', requestId)

    if (requiresCsrf) {
      if (!this.csrfToken) {
        throw new Error(
          'Token CSRF ausente. Obtenha um token antes de enviar uma operação de escrita.',
        )
      }

      headers.set('X-CSRFToken', this.csrfToken)
    }

    if (options.ifMatch) {
      headers.set('If-Match', options.ifMatch)
    }

    if (options.idempotencyKey) {
      headers.set('Idempotency-Key', options.idempotencyKey)
    }

    let body = options.body

    if (options.json !== undefined) {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(options.json)
    }

    let response: Response

    try {
      response = await this.fetchImplementation(url, {
        method,
        headers,
        body,
        credentials: 'include',
        signal: options.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }

      throw new ApiNetworkError('Não foi possível conectar à API.', requestId, {
        cause: error,
      })
    }

    const responseRequestId =
      response.headers.get('X-Request-ID')?.trim() || requestId

    if (!response.ok) {
      throw new ApiError({
        problem: await readProblemDetails(response),
        requestId: responseRequestId,
        response,
      })
    }

    return {
      data: await readResponseBody<T>(response),
      status: response.status,
      etag: response.headers.get('ETag'),
      requestId: responseRequestId,
      headers: response.headers,
    }
  }

  get<T>(
    pathOrUrl: string,
    options: Omit<ApiRequestOptions, 'method' | 'json' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(pathOrUrl, { ...options, method: 'GET' })
  }

  post<T>(
    pathOrUrl: string,
    json?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'json' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(pathOrUrl, { ...options, method: 'POST', json })
  }

  put<T>(
    pathOrUrl: string,
    json?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'json' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(pathOrUrl, { ...options, method: 'PUT', json })
  }

  patch<T>(
    pathOrUrl: string,
    json?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'json' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(pathOrUrl, { ...options, method: 'PATCH', json })
  }

  delete<T>(
    pathOrUrl: string,
    options: Omit<ApiRequestOptions, 'method' | 'json' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(pathOrUrl, { ...options, method: 'DELETE' })
  }
}

export function getApiBaseUrl(
  configuredUrl: string | undefined = import.meta.env.VITE_API_URL,
): string {
  if (!configuredUrl?.trim()) {
    throw new Error('VITE_API_URL deve ser definida no ambiente.')
  }

  return normalizeBaseUrl(configuredUrl)
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export const httpClient = new HttpClient()

function normalizeBaseUrl(value: string): string {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    throw new Error('VITE_API_URL não pode ser vazia.')
  }

  const url = new URL(normalizedValue)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VITE_API_URL deve usar o protocolo HTTP ou HTTPS.')
  }

  url.hash = ''
  url.search = ''
  return url.toString().replace(/\/$/, '')
}

function buildRequestUrl(
  baseUrl: string,
  pathOrUrl: string,
  query?: QueryParameters | URLSearchParams,
): string {
  const url = isAbsoluteUrl(pathOrUrl)
    ? new URL(pathOrUrl)
    : new URL(`${baseUrl}/${pathOrUrl.replace(/^\/+/, '')}`)
  const apiOrigin = new URL(baseUrl).origin

  if (url.origin !== apiOrigin) {
    throw new Error(
      'A URL da requisição não pertence à origem configurada da API.',
    )
  }

  appendQueryParameters(url.searchParams, query)
  return url.toString()
}

function appendQueryParameters(
  target: URLSearchParams,
  query?: QueryParameters | URLSearchParams,
): void {
  if (!query) return

  if (query instanceof URLSearchParams) {
    query.forEach((value, key) => target.append(key, value))
    return
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) return

    const values = Array.isArray(value) ? value : [value]
    values.forEach((item) => target.append(key, String(item)))
  })
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function isUnsafeMethod(method: HttpMethod): boolean {
  return !['GET', 'HEAD'].includes(method)
}

function createRequestId(): string {
  return globalThis.crypto.randomUUID()
}

async function readResponseBody<T>(response: Response): Promise<T> {
  if ([204, 205].includes(response.status)) {
    return undefined as T
  }

  const text = await response.text()

  if (!text) {
    return undefined as T
  }

  if (isJsonContentType(response.headers.get('Content-Type'))) {
    return JSON.parse(text) as T
  }

  return text as T
}

async function readProblemDetails(response: Response): Promise<ProblemDetails> {
  const fallback: ProblemDetails = {
    type: 'about:blank',
    title: response.statusText || 'Erro na API',
    status: response.status,
  }
  const text = await response.text()

  if (!text) return fallback

  const contentType = response.headers.get('Content-Type')

  if (!isJsonContentType(contentType)) return fallback

  try {
    const parsed = JSON.parse(text) as Partial<ProblemDetails>

    return {
      type: typeof parsed.type === 'string' ? parsed.type : fallback.type,
      title: typeof parsed.title === 'string' ? parsed.title : fallback.title,
      status:
        typeof parsed.status === 'number' ? parsed.status : fallback.status,
      ...(typeof parsed.detail === 'string' ? { detail: parsed.detail } : {}),
      ...(parsed.errors !== undefined ? { errors: parsed.errors } : {}),
    }
  } catch {
    return fallback
  }
}

function isJsonContentType(contentType: string | null): boolean {
  return Boolean(
    contentType &&
    (contentType.includes('application/json') ||
      contentType.includes('application/problem+json') ||
      contentType.includes('+json')),
  )
}
