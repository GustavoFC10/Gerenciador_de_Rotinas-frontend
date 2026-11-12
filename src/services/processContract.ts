import type {
  PreparedProcessAlert,
  ProcessAlert,
  ProcessAlertFilters,
  ProcessAlertPage,
  ProcessAlertRecipientFilters,
  ProcessAlertRecipientPage,
  ProcessCatalog,
  ProcessLeggacyMetric,
  ProcessEntriesFilters,
  ProcessEntriesPage,
  ProcessFilters,
  ProcessFollowUp,
  ProcessFollowUpFilters,
  ProcessFollowUpPage,
  ProcessIndicators,
  ProcessMonthlyReport,
  ProcessPage,
  ProcessResource,
  ProcessSummary,
  ProcessSector,
} from '../types/processes'
import {
  PROCESS_CONTRACT_VERSION,
  PROCESS_WORKFLOW_VERSION,
} from '../types/processes'

const statuses = [
  'andamento',
  'agendado',
  'atrasado',
  'concluido',
  'cancelado',
] as const
const sectors = ['com', 'fin', 'reg'] as const
const types = [
  'abertura',
  'mei',
  'outro',
  'outros',
  'alteracao',
  'inatividade',
  'inativa',
  'reativacao',
  'baixa',
  'saida',
  'exclusao',
  'aumento_honorarios',
  'reducao_honorarios',
] as const
const privateFields = [
  'valorProcesso',
  'custo',
  'pagador',
  'parcelas',
  'honorario',
  'honCobranca',
  'trab',
  'trabQtd',
  'trabValor',
  'honAnterior',
  'honVariacao',
  'honPerdido',
  'obs',
  'altDesc',
  'regimeObs',
  'motivoObs',
  'contadorContato',
]

export class ProcessContractError extends Error {
  constructor(
    readonly field: string,
    readonly requestId: string | null = null,
  ) {
    super(
      `Resposta incompatível com o contrato de Processos (revisão 2): ${field}.${requestId ? ` Requisição: ${requestId}.` : ''}`,
    )
    this.name = 'ProcessContractError'
  }
}

type Validator = (value: unknown, path: string) => void
type Fields = Record<string, Validator>
function fail(path: string): never {
  throw new ProcessContractError(path)
}
const string: Validator = (v, p) => {
  if (typeof v !== 'string') fail(p)
}
const uuid: Validator = (v, p) => {
  string(v, p)
  if (
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      v as string,
    )
  )
    fail(p)
}
const boolean: Validator = (v, p) => {
  if (typeof v !== 'boolean') fail(p)
}
const integer: Validator = (v, p) => {
  if (!Number.isInteger(v) || (v as number) < 0) fail(p)
}
const positive: Validator = (v, p) => {
  integer(v, p)
  if ((v as number) < 1) fail(p)
}
const days: Validator = (v, p) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) fail(p)
}
const nullable =
  (check: Validator): Validator =>
  (v, p) => {
    if (v !== null) check(v, p)
  }
const optional =
  (check: Validator): Validator =>
  (v, p) => {
    if (v !== undefined) check(v, p)
  }
const oneOf =
  (values: readonly unknown[]): Validator =>
  (v, p) => {
    if (!values.includes(v)) fail(p)
  }
const array =
  (check: Validator): Validator =>
  (v, p) => {
    if (!Array.isArray(v)) fail(p)
    v.forEach((item, i) => check(item, `${p}[${i}]`))
  }
function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    fail(path)
  return value as Record<string, unknown>
}
const shape =
  (fields: Fields, strict = false): Validator =>
  (v, p) => {
    const data = object(v, p)
    for (const [key, check] of Object.entries(fields))
      check(data[key], `${p}.${key}`)
    if (strict)
      for (const key of Object.keys(data))
        if (!(key in fields)) fail(`${p}.${key}`)
  }
const record =
  (check: Validator, keys?: readonly string[]): Validator =>
  (v, p) => {
    for (const [key, value] of Object.entries(object(v, p))) {
      if (keys && !keys.includes(key)) fail(`${p}.${key}`)
      check(value, `${p}.${key}`)
    }
  }
const date: Validator = (v, p) => {
  string(v, p)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v as string) ||
    !Number.isFinite(Date.parse(v as string)) ||
    new Date(v as string).toISOString().slice(0, 10) !== v
  )
    fail(p)
}
const competence: Validator = (v, p) => {
  string(v, p)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v as string)) fail(p)
}
const timestamp: Validator = (v, p) => {
  string(v, p)
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(v as string) ||
    !Number.isFinite(Date.parse(v as string))
  )
    fail(p)
}
const decimal: Validator = (v, p) => {
  string(v, p)
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(v as string)) fail(p)
}
const permissions = shape({
  read: boolean,
  create: boolean,
  edit: boolean,
  delete: boolean,
  cancel: boolean,
  reopen: boolean,
  note: boolean,
  viewFinancial: boolean,
  viewMovements: boolean,
  executeSectors: array(oneOf(sectors)),
  sectors: array(oneOf(sectors)),
})
const analysis = shape({
  currentStage: nullable(integer),
  completedTasks: integer,
  totalTasks: integer,
  releaseDate: nullable(date),
  waiting: boolean,
  late: boolean,
  pendingSectors: array(oneOf(sectors)),
})
const task = shape({
  id: string,
  d: oneOf(sectors),
  txt: string,
  campo: optional(oneOf(['custo', 'honorario', 'regime', 'altdef'])),
  auto: optional(boolean),
  opt: optional(boolean),
  guia: optional(boolean),
  marco: optional(boolean),
  cob: optional(string),
  reuniao: optional(oneOf(['alinhamento', 'acompanhamento'])),
})
const stage = shape({
  t: string,
  tasks: array(task),
  tSem: optional(string),
  note: optional(string),
  espera: optional(integer),
  opcional: optional(string),
  seNao: optional(string),
  index: optional(integer),
  completed: optional(boolean),
})
const summaryFields: Fields = {
  id: string,
  organizationId: string,
  tipo: oneOf(types),
  codigo: string,
  empresa: string,
  companyId: nullable(string),
  companyLinkRequired: boolean,
  companyReference: nullable(
    shape(
      {
        id: uuid,
        code: nullable(string),
        name: string,
        legalName: string,
        cnpj: string,
        status: oneOf(['active', 'archived']),
      },
      true,
    ),
  ),
  cnpj: string,
  protocolo: string,
  prazo: nullable(date),
  criadoPor: string,
  autorAbertura: string,
  criadoEm: timestamp,
  atualizadoEm: timestamp,
  concluidoEm: nullable(timestamp),
  status: oneOf(statuses),
  statusChangedAt: timestamp,
  statusNextEvaluationAt: nullable(timestamp),
  responsibleSectors: array(oneOf(sectors)),
  version: positive,
  workflowVersion: oneOf([1, PROCESS_WORKFLOW_VERSION]),
  analysis,
  permissions,
  nextTask: optional(
    nullable(
      shape(
        {
          id: string,
          sector: oneOf(sectors),
          text: string,
          stageTitle: string,
        },
        true,
      ),
    ),
  ),
  pendingTaskCount: optional(integer),
}
const detailFields: Fields = {
  ...summaryFields,
  descricaoProcesso: optional(string),
  valorProcesso: optional(decimal),
  departamentoSolicitado: optional(oneOf(['fin', 'reg'])),
  acionarLeggacy: optional(boolean),
  inicioInat: optional(nullable(date)),
  competenciaInicioAtividade: optional(nullable(competence)),
  competenciaInicioInatividade: optional(nullable(competence)),
  ultimaCompetenciaTrabalho: optional(nullable(competence)),
  obs: optional(string),
  custo: optional(nullable(decimal)),
  pagador: optional(nullable(oneOf(['cliente', 'jaralcon']))),
  parcelas: optional(nullable(positive)),
  honorario: optional(nullable(decimal)),
  honCobranca: optional(nullable(date)),
  trab: optional(boolean),
  trabQtd: optional(nullable(positive)),
  trabValor: optional(nullable(decimal)),
  honAnterior: optional(nullable(decimal)),
  honVariacao: optional(decimal),
  honPerdido: optional(nullable(decimal)),
  altItens: optional(
    array(
      oneOf([
        'societario',
        'capital',
        'bens',
        'endereco',
        'razao',
        'atividades',
        'outros',
      ]),
    ),
  ),
  altDesc: optional(string),
  motivo: optional(
    nullable(
      oneOf([
        'encerramento',
        'honorarios',
        'atendimento',
        'concorrente',
        'inadimplencia',
        'venda',
        'reducao',
        'outros',
      ]),
    ),
  ),
  motivoObs: optional(string),
  regime: optional(nullable(oneOf(['simples', 'presumido', 'real']))),
  regimeObs: optional(string),
  contato: optional(string),
  novoContador: optional(boolean),
  contadorNome: optional(string),
  contadorContato: optional(string),
  reatJunta: optional(boolean),
  reunAlinh: optional(boolean),
  reunAcomp: optional(boolean),
  tarefas: record(
    shape({
      s: oneOf(['feito', 'na']),
      por: string,
      autor: optional(string),
      em: timestamp,
      auto: optional(boolean),
    }),
  ),
  etapas: array(stage),
  leggacy: array(
    shape({
      sendTaskId: string,
      returnTaskId: string,
      sentAt: timestamp,
      dueOn: date,
      daysWaiting: integer,
      awaitingReturn: boolean,
      followUpDue: boolean,
    }),
  ),
  notifications: optional(
    record(integer, [
      'pending',
      'sending',
      'sent',
      'failed',
      'uncertain',
      'skipped',
    ]),
  ),
}
const summary: Validator = (value, path) => {
  shape(summaryFields, true)(value, path)
  const data = object(value, path)
  if ((data.nextTask === undefined) !== (data.pendingTaskCount === undefined))
    fail(`${path}.nextTask/pendingTaskCount`)
  if (
    data.nextTask !== undefined &&
    (data.nextTask === null
      ? data.pendingTaskCount !== 0
      : (data.pendingTaskCount as number) < 1)
  )
    fail(`${path}.pendingTaskCount`)
}
const entryShape = shape({
  id: string,
  por: string,
  autor: string,
  em: timestamp,
  kind: string,
  financial: boolean,
  text: string,
  details: (v, p) => {
    if (v === undefined) fail(p)
  },
})
const entry: Validator = (value, path) => {
  entryShape(value, path)
  const data = object(value, path)
  if (data.kind === 'status_changed') {
    shape({
      from: oneOf(statuses),
      to: oneOf(statuses),
      trigger: oneOf(['command', 'clock', 'migration', 'migration_reverse']),
    })(data.details, `${path}.details`)
  }
}
const page = (item: Validator): Validator =>
  shape({
    count: integer,
    next: nullable(string),
    previous: nullable(string),
    results: array(item),
  })

const followUp = shape({
  id: uuid,
  processId: uuid,
  empresa: string,
  sendTaskId: string,
  returnTaskId: string,
  sentAt: timestamp,
  dueOn: date,
  createdAt: timestamp,
  state: oneOf(['pending', 'completed', 'resolved']),
  completedAt: nullable(timestamp),
  completedBy: nullable(uuid),
  resolvedAt: nullable(timestamp),
  resolution: oneOf(['', 'process_closed', 'return_or_reset']),
  version: positive,
})
const recipient = shape({ memberId: uuid, name: string, email: string })
const alert = shape({
  id: uuid,
  processId: uuid,
  empresa: string,
  codigo: string,
  kind: oneOf(['leggacy', 'overdue']),
  followUpId: nullable(uuid),
  stageIndex: nullable(integer),
  subject: string,
  body: string,
  defaultSectors: array(oneOf(sectors)),
  selectedSectors: array(oneOf(sectors)),
  selectedMemberIds: array(uuid),
  recipients: array(recipient),
  createdAt: timestamp,
  sentAt: nullable(timestamp),
  sentBy: nullable(uuid),
  resolvedAt: nullable(timestamp),
  status: oneOf(['pending', 'sent', 'resolved']),
  deliveryMode: oneOf(['manual']),
  version: positive,
})

/** Validate the wire DTO before producing a separate, owned component model. */
function decode<T>(
  value: unknown,
  check: Validator,
  requestId?: string | null,
): T {
  try {
    check(value, 'response')
    return structuredClone(value) as T
  } catch (error) {
    if (error instanceof ProcessContractError)
      throw new ProcessContractError(error.field, requestId)
    throw error
  }
}

export function parseProcessCatalog(
  value: unknown,
  requestId?: string | null,
): ProcessCatalog {
  const result = decode<ProcessCatalog>(
    value,
    shape({
      contractVersion: oneOf([PROCESS_CONTRACT_VERSION]),
      workflowVersion: oneOf([PROCESS_WORKFLOW_VERSION]),
      statuses: shape(
        Object.fromEntries(statuses.map((s) => [s, string])),
        true,
      ),
      openStatuses: array(oneOf(['andamento', 'agendado', 'atrasado'])),
      types: array(
        shape({
          id: oneOf(types),
          sigla: string,
          icon: string,
          nome: string,
          desc: string,
          etapas: array(stage),
        }),
      ),
      sectors: shape({ com: string, fin: string, reg: string }, true),
      permissions,
    }),
    requestId,
  )
  if (
    result.openStatuses.length !== 3 ||
    new Set(result.openStatuses).size !== 3
  )
    throw new ProcessContractError('response.openStatuses', requestId)
  return result
}

export function parseProcessSummary(
  value: unknown,
  requestId?: string | null,
): ProcessSummary {
  return decode(value, summary, requestId)
}

export function parseProcessDetail(
  value: unknown,
  requestId?: string | null,
): ProcessResource {
  const result = decode<ProcessResource>(
    value,
    shape(detailFields, true),
    requestId,
  )
  if (!result.permissions.viewFinancial) {
    for (const key of privateFields)
      if (Object.hasOwn(result, key))
        throw new ProcessContractError(
          `response.${key} (conteúdo confidencial sem permissão)`,
          requestId,
        )
  }
  if (
    result.honVariacao !== undefined &&
    !['aumento_honorarios', 'reducao_honorarios'].includes(result.tipo)
  )
    throw new ProcessContractError(
      'response.honVariacao (tipo sem reajuste)',
      requestId,
    )
  if (!result.permissions.create && result.notifications !== undefined)
    throw new ProcessContractError(
      'response.notifications (sem permissão)',
      requestId,
    )
  return result
}

export function parseProcessPage(
  value: unknown,
  requestId?: string | null,
  taskSector?: ProcessSector,
): ProcessPage {
  const result = decode<ProcessPage>(value, page(summary), requestId)
  result.results.forEach((item, index) => {
    const path = `response.results[${index}]`
    if (taskSector) {
      if (
        item.nextTask === undefined ||
        item.pendingTaskCount === undefined ||
        (item.nextTask === null
          ? item.pendingTaskCount !== 0
          : item.pendingTaskCount < 1 || item.nextTask.sector !== taskSector) ||
        (['agendado', 'concluido', 'cancelado'].includes(item.status) &&
          item.nextTask !== null)
      )
        throw new ProcessContractError(
          `${path}.nextTask/pendingTaskCount`,
          requestId,
        )
    } else if (
      item.nextTask !== undefined ||
      item.pendingTaskCount !== undefined
    ) {
      throw new ProcessContractError(
        `${path}.nextTask (sem taskSector)`,
        requestId,
      )
    }
  })
  return result
}

export function parseProcessEntriesPage(
  value: unknown,
  requestId?: string | null,
): ProcessEntriesPage {
  return decode(value, page(entry), requestId)
}

export function parseProcessIndicators(
  value: unknown,
  requestId?: string | null,
): ProcessIndicators {
  return decode(
    value,
    shape({
      total: integer,
      active: integer,
      completed: integer,
      cancelled: integer,
      late: integer,
      waiting: integer,
      dueSoon: integer,
      completedThisMonth: integer,
      completedThisYear: integer,
      averageOverdueDays: nullable(days),
      maxOverdueDays: nullable(days),
      averageCompletionDays: nullable(days),
      averageOpenAgeDays: nullable(days),
      byStatus: shape(
        Object.fromEntries(statuses.map((s) => [s, integer])),
        true,
      ),
      bySector: record(integer, sectors),
      byType: record(integer, types),
    }),
    requestId,
  )
}

export function parseProcessLeggacyMetrics(
  value: unknown,
  requestId?: string | null,
): ProcessLeggacyMetric[] {
  const result = decode<ProcessLeggacyMetric[]>(
    value,
    array(
      shape({
        tipo: oneOf(['abertura', 'alteracao', 'baixa']),
        completedCount: integer,
        waitingCount: integer,
        averageDays: nullable(days),
        minDays: nullable(days),
        maxDays: nullable(days),
      }),
    ),
    requestId,
  )
  if (
    result.length !== 3 ||
    new Set(result.map((item) => item.tipo)).size !== 3
  )
    throw new ProcessContractError(
      'response (métricas dos três tipos da Leggacy)',
      requestId,
    )
  return result
}

export function parseProcessMonthlyReport(
  value: unknown,
  requestId?: string | null,
): ProcessMonthlyReport {
  const movementFields = {
    month: string,
    gain: decimal,
    loss: decimal,
    balance: decimal,
    missingValues: integer,
    entries: array(
      shape({
        processId: string,
        empresa: string,
        tipo: oneOf(types),
        value: nullable(decimal),
      }),
    ),
    exits: array(
      shape({
        processId: string,
        empresa: string,
        tipo: oneOf(types),
        value: nullable(decimal),
      }),
    ),
    lossesByType: record(decimal, types),
  }
  return decode(
    value,
    shape({
      ...movementFields,
      previousMonth: shape(movementFields),
      history: array(shape(movementFields)),
    }),
    requestId,
  )
}

/** Sorting the set of statuses makes HTTP and cache scopes identical. */
export function normalizeProcessFilters(
  filters: ProcessFilters = {},
): ProcessFilters {
  const allowed = [
    'page',
    'pageSize',
    'tipo',
    'status',
    'responsibleSector',
    'queueSector',
    'otherSector',
    'taskSector',
    'ordering',
    'q',
    'month',
  ]
  for (const key of Object.keys(filters))
    if (!allowed.includes(key))
      throw new Error(`Filtro de Processos não suportado: ${key}.`)
  if (
    filters.status !== undefined &&
    (!Array.isArray(filters.status) ||
      filters.status.length === 0 ||
      filters.status.some((s) => !statuses.includes(s)))
  )
    throw new Error('Filtro status inválido.')
  for (const key of ['page', 'pageSize'] as const)
    if (
      filters[key] !== undefined &&
      (!Number.isInteger(filters[key]) ||
        filters[key]! < 1 ||
        (key === 'pageSize' && filters[key]! > 100))
    )
      throw new Error(`Filtro ${key} inválido.`)
  if (filters.tipo !== undefined && !types.includes(filters.tipo))
    throw new Error('Filtro tipo inválido.')
  for (const key of [
    'responsibleSector',
    'queueSector',
    'otherSector',
    'taskSector',
  ] as const)
    if (filters[key] !== undefined && !sectors.includes(filters[key]!))
      throw new Error(`Filtro ${key} inválido.`)
  if (filters.queueSector && filters.otherSector)
    throw new Error('Não combine queueSector e otherSector.')
  if (
    filters.ordering !== undefined &&
    !['recent', 'urgency'].includes(filters.ordering)
  )
    throw new Error('Filtro ordering inválido.')
  if (
    filters.month !== undefined &&
    (!/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month) ||
      Number(filters.month.slice(0, 4)) < 1 ||
      Number(filters.month.slice(0, 4)) > 9998)
  )
    throw new Error('Filtro month inválido.')
  if (
    filters.q !== undefined &&
    (typeof filters.q !== 'string' || filters.q.trim().length > 200)
  )
    throw new Error('Filtro q inválido.')
  return {
    ...(filters.tipo ? { tipo: filters.tipo } : {}),
    ...(filters.status ? { status: [...new Set(filters.status)].sort() } : {}),
    ...(filters.responsibleSector
      ? { responsibleSector: filters.responsibleSector }
      : {}),
    ...(filters.queueSector ? { queueSector: filters.queueSector } : {}),
    ...(filters.otherSector ? { otherSector: filters.otherSector } : {}),
    ...(filters.taskSector ? { taskSector: filters.taskSector } : {}),
    ordering: filters.ordering ?? 'recent',
    ...(filters.q?.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.month ? { month: filters.month } : {}),
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
  }
}

export function normalizeProcessEntriesFilters(
  filters: ProcessEntriesFilters = {},
): Required<Pick<ProcessEntriesFilters, 'page' | 'pageSize'>> &
  Pick<ProcessEntriesFilters, 'kind'> {
  for (const key of Object.keys(filters))
    if (!['kind', 'page', 'pageSize'].includes(key))
      throw new Error(`Filtro de entradas não suportado: ${key}.`)
  if (filters.kind !== undefined && !['note', 'event'].includes(filters.kind))
    throw new Error('Filtro kind inválido.')
  const { page, pageSize } = normalizeProcessFilters({
    page: filters.page,
    pageSize: filters.pageSize,
  })
  return {
    ...(filters.kind ? { kind: filters.kind } : {}),
    page: page!,
    pageSize: pageSize!,
  }
}

export function parseProcessFollowUp(
  value: unknown,
  requestId?: string | null,
): ProcessFollowUp {
  return decode(value, followUp, requestId)
}

export function parseProcessFollowUpPage(
  value: unknown,
  requestId?: string | null,
): ProcessFollowUpPage {
  return decode(value, page(followUp), requestId)
}

export function parseProcessAlert(
  value: unknown,
  requestId?: string | null,
): ProcessAlert {
  return decode(value, alert, requestId)
}

export function parseProcessAlertPage(
  value: unknown,
  requestId?: string | null,
): ProcessAlertPage {
  return decode(value, page(alert), requestId)
}

export function parseProcessAlertRecipientPage(
  value: unknown,
  requestId?: string | null,
): ProcessAlertRecipientPage {
  return decode(
    value,
    page(
      shape({
        memberId: uuid,
        name: string,
        email: string,
        sectors: array(oneOf(sectors)),
      }),
    ),
    requestId,
  )
}

export function parsePreparedProcessAlert(
  value: unknown,
  requestId?: string | null,
): PreparedProcessAlert {
  return decode(
    value,
    shape({
      alertId: uuid,
      version: positive,
      subject: string,
      body: string,
      recipients: array(recipient),
      copyText: string,
    }),
    requestId,
  )
}

/** These collections are independent resources, each with its own filters/version. */
export function normalizeProcessFollowUpFilters(
  filters: ProcessFollowUpFilters = {},
): ProcessFollowUpFilters {
  assertFilterKeys(filters, ['processId', 'state', 'page', 'pageSize'])
  if (filters.processId !== undefined)
    uuid(filters.processId, 'filters.processId')
  if (
    filters.state !== undefined &&
    !['pending', 'completed', 'resolved'].includes(filters.state)
  )
    throw new Error('Filtro state inválido.')
  return {
    ...paginationFilters(filters),
    ...(filters.processId ? { processId: filters.processId } : {}),
    ...(filters.state ? { state: filters.state } : {}),
  }
}

export function normalizeProcessAlertFilters(
  filters: ProcessAlertFilters = {},
): ProcessAlertFilters {
  assertFilterKeys(filters, ['processId', 'kind', 'status', 'page', 'pageSize'])
  if (filters.processId !== undefined)
    uuid(filters.processId, 'filters.processId')
  if (
    filters.kind !== undefined &&
    !['leggacy', 'overdue'].includes(filters.kind)
  )
    throw new Error('Filtro kind inválido.')
  if (
    filters.status !== undefined &&
    !['pending', 'sent', 'resolved'].includes(filters.status)
  )
    throw new Error('Filtro status inválido.')
  return {
    ...paginationFilters(filters),
    ...(filters.processId ? { processId: filters.processId } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
}

export function normalizeProcessAlertRecipientFilters(
  filters: ProcessAlertRecipientFilters = {},
): ProcessAlertRecipientFilters {
  assertFilterKeys(filters, ['q', 'sector', 'page', 'pageSize'])
  if (filters.sector !== undefined && !sectors.includes(filters.sector))
    throw new Error('Filtro sector inválido.')
  if (
    filters.q !== undefined &&
    (typeof filters.q !== 'string' || filters.q.trim().length > 200)
  )
    throw new Error('Filtro q inválido.')
  return {
    ...paginationFilters(filters),
    ...(filters.q?.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.sector ? { sector: filters.sector } : {}),
  }
}

function assertFilterKeys(filters: object, allowed: string[]): void {
  for (const key of Object.keys(filters))
    if (!allowed.includes(key)) throw new Error(`Filtro não suportado: ${key}.`)
}

function paginationFilters(filters: { page?: number; pageSize?: number }): {
  page: number
  pageSize: number
} {
  const { page, pageSize } = normalizeProcessFilters({
    page: filters.page,
    pageSize: filters.pageSize,
  })
  return { page: page!, pageSize: pageSize! }
}
