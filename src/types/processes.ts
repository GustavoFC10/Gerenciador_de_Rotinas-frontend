/** Contrato do módulo Processos descrito na seção 17 de ENDPOINTS.md. */
export type ProcessSector = 'com' | 'fin' | 'reg'

export type ProcessTypeId =
  | 'abertura'
  | 'mei'
  | 'outro'
  | 'alteracao'
  | 'inatividade'
  | 'inativa'
  | 'reativacao'
  | 'baixa'
  | 'saida'
  | 'exclusao'

export type ProcessStatus =
  'andamento' | 'agendado' | 'atrasado' | 'concluido' | 'cancelado'

export const PROCESS_CONTRACT_VERSION = 2 as const
export const PROCESS_WORKFLOW_VERSION = 2 as const
export type ProcessTaskTransition = 'feito' | 'na' | 'pending'
export type ProcessField = 'custo' | 'honorario' | 'regime' | 'altdef'
export type ProcessPayer = 'cliente' | 'jaralcon'
export type ProcessTaxRegime = 'simples' | 'presumido' | 'real'
export type ProcessAlterationItem =
  | 'societario'
  | 'capital'
  | 'bens'
  | 'endereco'
  | 'razao'
  | 'atividades'
  | 'outros'
export type ProcessReason =
  | 'encerramento'
  | 'honorarios'
  | 'atendimento'
  | 'concorrente'
  | 'inadimplencia'
  | 'venda'
  | 'reducao'
  | 'outros'

/** Valores em BRL permanecem decimais em string para preservar sua precisão. */
export interface ProcessFields {
  empresa: string
  companyId?: string | null
  cnpj?: string
  protocolo?: string
  prazo?: string | null
  inicioInat?: string | null
  obs?: string
  custo?: string | null
  pagador?: ProcessPayer | null
  parcelas?: number | null
  honorario?: string | null
  honCobranca?: string | null
  trab?: boolean
  trabQtd?: number | null
  trabValor?: string | null
  honAnterior?: string | null
  honPerdido?: string | null
  altItens?: ProcessAlterationItem[]
  altDesc?: string
  motivo?: ProcessReason | null
  motivoObs?: string
  regime?: ProcessTaxRegime | null
  regimeObs?: string
  contato?: string
  novoContador?: boolean
  contadorNome?: string
  contadorContato?: string
  reatJunta?: boolean
  reunAlinh?: boolean
  reunAcomp?: boolean
}

export interface ProcessCreateInput extends ProcessFields {
  tipo: ProcessTypeId
}

/** Atualizações enviam somente os campos alterados; o tipo é imutável. */
export type ProcessPatchInput = Partial<ProcessFields> & { version: number }

export interface ProcessPermissions {
  read: boolean
  create: boolean
  edit: boolean
  delete: boolean
  cancel: boolean
  reopen: boolean
  note: boolean
  viewFinancial: boolean
  viewMovements: boolean
  executeSectors: ProcessSector[]
  sectors: ProcessSector[]
}

export interface ProcessTask {
  id: string
  d: ProcessSector
  txt: string
  campo?: ProcessField
  auto?: boolean
  opt?: boolean
  guia?: boolean
  marco?: boolean
  /** Identifies the send task paired with this Leggacy return task. */
  cob?: string
  reuniao?: 'alinhamento' | 'acompanhamento'
}

export interface ProcessStage {
  t: string
  tasks: ProcessTask[]
  tSem?: string
  note?: string
  espera?: number
  opcional?: string
  seNao?: string
  index?: number
  completed?: boolean
}

export interface ProcessCatalogType {
  id: ProcessTypeId
  sigla: string
  icon: string
  nome: string
  desc: string
  etapas: ProcessStage[]
}

export interface ProcessCatalog {
  contractVersion: 2
  workflowVersion: number
  statuses: Record<ProcessStatus, string>
  openStatuses: ProcessStatus[]
  types: ProcessCatalogType[]
  sectors: Record<ProcessSector, string>
  permissions: ProcessPermissions
}

export interface ProcessTaskState {
  s: 'feito' | 'na'
  por: string
  autor?: string
  em: string
  auto?: boolean
}

export interface ProcessAnalysis {
  currentStage: number | null
  completedTasks: number
  totalTasks: number
  releaseDate: string | null
  waiting: boolean
  late: boolean
  pendingSectors: ProcessSector[]
}

export interface ProcessEntry {
  id: string
  por: string
  autor: string
  em: string
  kind: string
  financial: boolean
  text: string
  details: unknown
}

export type ProcessNotificationStatus =
  'pending' | 'sending' | 'sent' | 'failed' | 'uncertain' | 'skipped'

export type ProcessNotifications = Partial<
  Record<ProcessNotificationStatus, number>
>

/** Minimal company reference authorized by Processos read access. */
export interface ProcessCompanyReference {
  id: string
  code: string | null
  name: string
  legalName: string
  cnpj: string
  status: 'active' | 'archived'
}

/** Campos privados omitidos pela API nunca devem ser substituídos por zero. */
export interface ProcessSummaryDto {
  id: string
  organizationId: string
  empresa: string
  companyId: string | null
  companyLinkRequired?: boolean
  companyReference?: ProcessCompanyReference | null
  cnpj: string
  protocolo: string
  prazo: string | null
  tipo: ProcessTypeId
  codigo: string
  status: ProcessStatus
  statusChangedAt: string
  statusNextEvaluationAt: string | null
  responsibleSectors: ProcessSector[]
  criadoPor: string
  autorAbertura: string
  criadoEm: string
  atualizadoEm: string
  concluidoEm: string | null
  version: number
  workflowVersion: number
  analysis: ProcessAnalysis
  permissions: ProcessPermissions
}

/** The collection never contains business fields, tasks, or audit arrays. */
export type ProcessSummary = Readonly<ProcessSummaryDto>

/** Validated transport detail, independent of form input. */
export interface ProcessDetailDto
  extends ProcessSummaryDto, Omit<ProcessFields, keyof ProcessSummaryDto> {
  tarefas: Record<string, ProcessTaskState>
  etapas: ProcessStage[]
  leggacy: LeggacyTracking[]
  notifications?: ProcessNotifications
}

export type ProcessResource = Readonly<ProcessDetailDto>

export interface ProcessFilters {
  page?: number
  pageSize?: number
  tipo?: ProcessTypeId
  status?: readonly ProcessStatus[]
  responsibleSector?: ProcessSector
  queueSector?: ProcessSector
  q?: string
  month?: string
}

export interface ProcessPage {
  count: number
  next: string | null
  previous: string | null
  results: ProcessSummary[]
}

export interface ProcessEntriesFilters {
  kind?: 'note' | 'event'
  page?: number
  pageSize?: number
}

export interface ProcessEntriesPage {
  count: number
  next: string | null
  previous: string | null
  results: ProcessEntry[]
}

export interface ProcessIndicators {
  total: number
  active: number
  completed: number
  cancelled: number
  late: number
  waiting: number
  byStatus: Record<ProcessStatus, number>
  bySector: Partial<Record<ProcessSector, number>>
  byType: Partial<Record<ProcessTypeId, number>>
}

export interface ProcessMovementItem {
  processId: string
  empresa: string
  tipo: ProcessTypeId
  value: string | null
}

export interface ProcessMovementMonth {
  month: string
  gain: string
  loss: string
  balance: string
  missingValues: number
  entries: ProcessMovementItem[]
  exits: ProcessMovementItem[]
  lossesByType: Partial<Record<ProcessTypeId, string>>
}

export interface ProcessMonthlyReport extends ProcessMovementMonth {
  previousMonth: ProcessMovementMonth
  history: ProcessMovementMonth[]
}

/** Waiting conditions are computed by the server in the organization's timezone. */
export interface LeggacyTracking {
  sendTaskId: string
  returnTaskId: string
  sentAt: string
  dueOn: string
  daysWaiting: number
  awaitingReturn: boolean
  followUpDue: boolean
}

export interface ProcessFollowUp {
  id: string
  processId: string
  empresa: string
  sendTaskId: string
  returnTaskId: string
  sentAt: string
  dueOn: string
  createdAt: string
  state: 'pending' | 'completed' | 'resolved'
  completedAt: string | null
  completedBy: string | null
  resolvedAt: string | null
  resolution: '' | 'process_closed' | 'return_or_reset'
  version: number
}

export interface ProcessFollowUpFilters {
  processId?: string
  state?: ProcessFollowUp['state']
  page?: number
  pageSize?: number
}

export interface ProcessFollowUpPage {
  count: number
  next: string | null
  previous: string | null
  results: ProcessFollowUp[]
}

export interface AlertRecipient {
  memberId: string
  name: string
  email: string
}

export interface ProcessAlert {
  id: string
  processId: string
  empresa: string
  codigo: string
  kind: 'leggacy' | 'overdue'
  followUpId: string | null
  /** Original zero-based snapshot stage index. */
  stageIndex: number | null
  subject: string
  body: string
  defaultSectors: ProcessSector[]
  selectedSectors: ProcessSector[]
  selectedMemberIds: string[]
  recipients: AlertRecipient[]
  createdAt: string
  sentAt: string | null
  sentBy: string | null
  resolvedAt: string | null
  status: 'pending' | 'sent' | 'resolved'
  deliveryMode: 'manual'
  version: number
}

export interface ProcessAlertFilters {
  processId?: string
  kind?: ProcessAlert['kind']
  status?: ProcessAlert['status']
  page?: number
  pageSize?: number
}

export interface ProcessAlertPage {
  count: number
  next: string | null
  previous: string | null
  results: ProcessAlert[]
}

export interface ProcessAlertRecipientOption extends AlertRecipient {
  sectors: ProcessSector[]
}

export interface ProcessAlertRecipientFilters {
  q?: string
  sector?: ProcessSector
  page?: number
  pageSize?: number
}

export interface ProcessAlertRecipientPage {
  count: number
  next: string | null
  previous: string | null
  results: ProcessAlertRecipientOption[]
}

export interface ProcessAlertSelection {
  version: number
  sectors?: ProcessSector[]
  memberIds?: string[]
}

export interface PreparedProcessAlert {
  alertId: string
  version: number
  subject: string
  body: string
  recipients: AlertRecipient[]
  copyText: string
}
