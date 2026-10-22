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

export type ProcessStatus = 'andamento' | 'concluido' | 'cancelado'
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
  workflowVersion: number
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

/** Campos privados omitidos pela API nunca devem ser substituídos por zero. */
export interface ProcessResource extends ProcessFields {
  id: string
  organizationId: string
  tipo: ProcessTypeId
  codigo: string
  status: ProcessStatus
  criadoPor: string
  autorAbertura: string
  criadoEm: string
  atualizadoEm: string
  concluidoEm: string | null
  version: number
  workflowVersion: number
  tarefas: Record<string, ProcessTaskState>
  etapas: ProcessStage[]
  analysis: ProcessAnalysis
  notas: ProcessEntry[]
  historico: ProcessEntry[]
  permissions: ProcessPermissions
  notifications?: ProcessNotifications
}

export interface ProcessFilters {
  page?: number
  tipo?: ProcessTypeId
  status?: ProcessStatus
  setor?: ProcessSector
  q?: string
  late?: boolean
  waiting?: boolean
  month?: string
}

export interface ProcessPage {
  count: number
  next: string | null
  previous: string | null
  results: ProcessResource[]
}

export interface ProcessIndicators {
  total: number
  active: number
  completed: number
  cancelled: number
  late: number
  waiting: number
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
