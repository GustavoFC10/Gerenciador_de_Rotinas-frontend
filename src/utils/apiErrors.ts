/**
 * Presentation-safe helpers for errors returned by the API.
 *
 * Problem Details may carry validation errors as arrays, nested objects, or
 * a mixture of both. Keep that shape at the transport boundary, but turn it
 * into readable messages before it reaches a visual component.
 */
export interface ProblemDetailsLike {
  type?: unknown
  title?: unknown
  status?: unknown
  detail?: unknown
  errors?: unknown
}

export interface FlattenedProblemError {
  path: string[]
  message: string
}

export interface ErrorPresentation {
  message: string
  messages: string[]
  fieldErrors: Record<string, string>
  status: number | null
  requestId: string | null
  supportReference: string | null
  retryAfterSeconds: number | null
}

interface ProblemErrorLike {
  problem: ProblemDetailsLike
  status?: unknown
  requestId?: unknown
  retryAfter?: unknown
  response?: {
    headers?: {
      get?: (name: string) => string | null
    }
  }
}

interface FormatProblemDetailsOptions {
  status?: number | null
  retryAfter?: string | null
}

const DEFAULT_ERROR_MESSAGE = 'Não foi possível concluir a solicitação.'

const fieldLabels: Record<string, string> = {
  password: 'Senha',
  passwordConfirm: 'Confirmação de senha',
  newPassword: 'Nova senha',
  newPasswordConfirm: 'Confirmação da nova senha',
  email: 'E-mail',
  displayName: 'Nome',
  name: 'Nome',
}

/**
 * Flattens DRF/Problem Details validation errors without coercing nested
 * objects into "[object Object]". Array items that are messages stay attached
 * to their field; nested objects retain their field path.
 */
export function flattenProblemErrors(errors: unknown): FlattenedProblemError[] {
  const flattened: FlattenedProblemError[] = []
  const visited = new WeakSet<object>()

  function append(path: string[], value: unknown) {
    if (typeof value !== 'string' && typeof value !== 'number') return

    const message = String(value).trim()
    if (message) flattened.push({ path, message })
  }

  function visit(value: unknown, path: string[], depth: number) {
    if (depth > 12 || value === null || value === undefined) return

    if (typeof value === 'string' || typeof value === 'number') {
      append(path, value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const nestedPath = isPlainRecord(item) ? [...path, String(index)] : path
        visit(item, nestedPath, depth + 1)
      })
      return
    }

    if (!isPlainRecord(value)) return
    if (visited.has(value)) return
    visited.add(value)

    const message = nonEmptyString(value.message)
    const detail = nonEmptyString(value.detail)

    if (message || detail) {
      append(path, message ?? detail)
      return
    }

    Object.entries(value).forEach(([key, nestedValue]) => {
      // Error objects from a few serializers include a machine-readable code.
      // It is useful to clients programmatically, but not as a user message.
      if (key === 'code' || key === 'type') return
      visit(nestedValue, [...path, key], depth + 1)
    })
  }

  visit(errors, [], 0)

  return flattened.filter(
    (entry, index, entries) =>
      entries.findIndex(
        (candidate) =>
          candidate.message === entry.message &&
          candidate.path.join('.') === entry.path.join('.'),
      ) === index,
  )
}

export function formatProblemErrors(errors: unknown): string[] {
  return flattenProblemErrors(errors).map(({ path, message }) => {
    const label = formatFieldPath(path)
    return label ? `${label}: ${message}` : message
  })
}

export function getProblemFieldErrors(errors: unknown): Record<string, string> {
  return flattenProblemErrors(errors).reduce<Record<string, string>>(
    (result, { path, message }) => {
      const key = path.join('.') || 'nonFieldErrors'
      result[key] = result[key] ? `${result[key]} ${message}` : message
      return result
    },
    {},
  )
}

/**
 * Uses the contract precedence for an API problem: field errors, detail, and
 * title. Generic titles are refined with the HTTP status so the action needed
 * by the person using the application is clear.
 */
export function formatProblemDetailsMessage(
  problem: ProblemDetailsLike,
  options: FormatProblemDetailsOptions = {},
): string {
  const status = normalizeStatus(options.status ?? problem.status)
  const fieldMessages = formatProblemErrors(problem.errors)

  // A 5xx body is not a reliable user-facing message. Preserve its request ID
  // separately, while returning a safe recovery-oriented message.
  if (status !== null && status >= 500) {
    return getStatusMessage(status, options.retryAfter) ?? DEFAULT_ERROR_MESSAGE
  }

  // Retry-After is meaningful only for this response. Prefer the status-aware
  // text so people know when a repeated action may succeed.
  if (status === 429) {
    return getStatusMessage(status, options.retryAfter) ?? DEFAULT_ERROR_MESSAGE
  }

  if (fieldMessages.length > 0) return fieldMessages.join(' · ')

  const detail = nonEmptyString(problem.detail)
  if (detail) return detail

  const title = nonEmptyString(problem.title)

  if (title && !isGenericProblemTitle(title)) return title

  return (
    getStatusMessage(status, options.retryAfter) ??
    title ??
    DEFAULT_ERROR_MESSAGE
  )
}

/**
 * Produces a consistent visual representation for ApiError, ApiNetworkError,
 * and ordinary errors. It intentionally relies on the public error shape so
 * UI code does not need to import the HTTP client class at runtime.
 */
export function getErrorPresentation(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): ErrorPresentation {
  if (isProblemErrorLike(error)) {
    const status = normalizeStatus(error.status ?? error.problem.status)
    const retryAfter = getRetryAfter(error)
    const requestId = nonEmptyString(error.requestId)
    const messages =
      status === null || status < 500
        ? formatProblemErrors(error.problem.errors)
        : []

    return {
      message: formatProblemDetailsMessage(error.problem, {
        status,
        retryAfter,
      }),
      messages,
      fieldErrors:
        status === null || status < 500
          ? getProblemFieldErrors(error.problem.errors)
          : {},
      status,
      requestId: requestId ?? null,
      supportReference: requestId
        ? `Código de atendimento: ${requestId}`
        : null,
      retryAfterSeconds: getRetryAfterSeconds(retryAfter),
    }
  }

  const requestId = isPlainRecord(error)
    ? nonEmptyString(error.requestId)
    : undefined
  const message =
    error instanceof Error && error.message.trim() ? error.message : fallback

  return {
    message,
    messages: [message],
    fieldErrors: {},
    status: null,
    requestId: requestId ?? null,
    supportReference: requestId ? `Código de atendimento: ${requestId}` : null,
    retryAfterSeconds: null,
  }
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  return getErrorPresentation(error, fallback).message
}

export function getRetryAfterSeconds(
  retryAfter: string | null | undefined,
  now = Date.now(),
): number | null {
  const value = retryAfter?.trim()
  if (!value) return null

  if (/^\d+$/.test(value)) return Number(value)

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return null

  return Math.max(0, Math.ceil((timestamp - now) / 1_000))
}

function getStatusMessage(
  status: number | null,
  retryAfter: string | null | undefined,
): string | null {
  switch (status) {
    case 400:
      return 'Não foi possível validar os dados enviados.'
    case 401:
      return 'Sua sessão expirou ou não é válida. Entre novamente para continuar.'
    case 403:
      return 'Você não tem permissão para realizar esta ação. Verifique seu acesso e tente novamente.'
    case 404:
      return 'O recurso solicitado não está disponível.'
    case 405:
      return 'Esta ação não está disponível no momento.'
    case 409:
      return 'Não foi possível concluir porque os dados entraram em conflito. Atualize os dados e tente novamente.'
    case 412:
      return 'Esta informação foi alterada por outra pessoa. Atualize os dados e tente novamente.'
    case 415:
      return 'Não foi possível enviar os dados no formato esperado.'
    case 428:
      return 'Não foi possível concluir porque falta a versão atual do registro. Recarregue os dados e tente novamente.'
    case 429: {
      const seconds = getRetryAfterSeconds(retryAfter)
      if (seconds === null) {
        return 'Muitas tentativas em pouco tempo. Aguarde um momento antes de tentar novamente.'
      }
      if (seconds === 1) {
        return 'Muitas tentativas em pouco tempo. Aguarde 1 segundo antes de tentar novamente.'
      }
      return `Muitas tentativas em pouco tempo. Aguarde ${seconds} segundos antes de tentar novamente.`
    }
    case 501:
      return 'Esta funcionalidade ainda não está disponível.'
    case 503:
      return 'O serviço está indisponível temporariamente. Tente novamente em instantes.'
    default:
      return status !== null && status >= 500
        ? 'Ocorreu uma falha temporária. Tente novamente em instantes.'
        : null
  }
}

function formatFieldPath(path: string[]): string | null {
  const filteredPath = path.filter(
    (part) => !['nonFieldErrors', 'non_field_errors', '__all__'].includes(part),
  )

  if (filteredPath.length === 0) return null

  return filteredPath
    .map((part) => {
      if (/^\d+$/.test(part)) return String(Number(part) + 1)
      return fieldLabels[part] ?? humanizeFieldName(part)
    })
    .join(' · ')
}

function humanizeFieldName(value: string): string {
  const spaced = value
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()

  return spaced
    ? spaced.charAt(0).toLocaleUpperCase('pt-BR') + spaced.slice(1)
    : value
}

function getRetryAfter(error: ProblemErrorLike): string | null {
  const configured = nonEmptyString(error.retryAfter)
  if (configured) return configured

  return error.response?.headers?.get?.('Retry-After') ?? null
}

function isProblemErrorLike(error: unknown): error is ProblemErrorLike {
  return isPlainRecord(error) && isPlainRecord(error.problem)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeStatus(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function isGenericProblemTitle(title: string): boolean {
  const normalized = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()

  return [
    'requisicao invalida',
    'autenticacao necessaria',
    'acesso negado',
    'recurso nao encontrado',
    'metodo nao permitido',
    'conflito',
    'pre-condicao nao atendida',
    'precondicao nao atendida',
    'pre-condicao obrigatoria',
    'precondicao obrigatoria',
    'muitas requisicoes',
    'erro interno',
    'nao implementado',
    'servico indisponivel',
  ].includes(normalized)
}
