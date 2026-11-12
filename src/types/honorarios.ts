/** Contrato do módulo Honorários. Valores monetários da API são strings decimais. */
export type HonorariosRegime = 'mei' | 'simples' | 'presumido' | 'real'
export type HonorariosRole = 'viewer' | 'editor' | 'manager'
export type HonorariosAlignment = 'abaixo' | 'alinhado' | 'acima'
export type HonorariosQuoteStatus =
  'rascunho' | 'enviado' | 'aceito' | 'recusado'
export type HonorariosAdjustmentMode = 'indice' | 'parametro' | 'manter'

export interface HonorariosProfile {
  regime: HonorariosRegime
  segmento: string
  inativa: boolean
  funcionarios: number
  socios: number
  xml: number
  notas: number
  emiteNF: boolean
  filiais: number
  filiaisInativas: number
  faturamento: string
  usarHoras: boolean
  horas: string
  servicos: string[]
  anomalias: string[]
}

export interface HonorariosBand {
  ate: number | null
  pct: number
}
export interface HonorariosPlanLevel {
  id: string
  nome: string
  descricao: string
  ativo: boolean
  destaque: boolean
  emiteNF: boolean
  servicos: string[]
  ajuste: number
}
export interface HonorariosParams {
  segmentos: Array<{
    id: string
    nome: string
    base: Record<HonorariosRegime, number>
  }>
  servicos: Array<{ id: string; nome: string; valor: number }>
  anomalias: Array<{ id: string; nome: string; pct: number }>
  faixasSimples: HonorariosBand[]
  faixasPresumido: HonorariosBand[]
  faixasReal: HonorariosBand[]
  fatorRegime: Record<HonorariosRegime, number>
  inativa: Record<HonorariosRegime, number>
  funcionarios: { incluidos: number; valor: number }
  socios: { ativo: boolean; incluidos: number; valor: number }
  xml: { ativo: boolean; bloco: number; franquia: number; valorBloco: number }
  nf: { fixo: number; franquia: number; porNota: number }
  filial: {
    modo: 'fixo' | 'pct'
    pct: number
    valor: number
    valorInativa: number
  }
  horas: { custoHora: number; margem: number; metodo: 'maior' | 'horas' }
  planos: { ativo: boolean; niveis: HonorariosPlanLevel[] }
  indices: {
    usar: 'ipca' | 'igpm' | 'fixo'
    ipca: { nome: string; pct: number }
    igpm: { nome: string; pct: number }
    fixo: { nome: string; pct: number }
    periodicidade: 'aniversario' | 'janeiro'
    carencia: number
    referencia: string
  }
  arredondamento: number
  decimoTerceiro: boolean
  descontoMax: number
  reajusteMax: number
  reajusteTeto: boolean
  tolerancia: number
  vencimento: number
}

export interface HonorariosOffice {
  nome: string
  crc: string
  cidade: string
  telefone: string
  email: string
  site: string
  logo: string
  validadeDias: number
  condicoes: string
  escopoExtra: string
  units: Array<{ name: string; address: string; phone: string }>
}
export interface HonorariosPermissions {
  role?: HonorariosRole | null
  [action: string]: boolean | string | null | undefined
}
export interface HonorariosConfiguration {
  version: number
  params: HonorariosParams
  office: HonorariosOffice
  permissions: HonorariosPermissions
}
export type HonorariosConfigurationInput = Pick<
  HonorariosConfiguration,
  'version' | 'params' | 'office'
>

export interface HonorariosCalculation {
  total: string
  anual: string
  tabela: string
  custo: string
  valorHoras: string
  ajuste: string
  linhas: Array<{ label: string; value: string }>
}
export interface HonorariosPlan {
  id: string
  nome: string
  descricao?: string
  destaque: boolean
  profile: HonorariosProfile
  calculation: HonorariosCalculation
  value: string
  suggested?: string
  annualValue?: string
}
export interface HonorariosCalculateResponse {
  paramsVersion: number
  calculation: HonorariosCalculation
  plans: HonorariosPlan[]
}
export interface HonorariosCompanyOption {
  id: string
  name: string
  cnpj: string
  code?: string | null
  archivedAt?: string | null
}
/** A prévia de reajuste é somente leitura; o servidor recalcula ao confirmar. */
export interface HonorariosAdjustment {
  dueDate: string
  days: number
  notice: boolean
  current: string
  full: string
  value: string
  table: string
  limited: boolean
  blocked: boolean
  index: { nome: string; pct: number | string }
}
export interface HonorariosClientInput {
  companyId: string
  profile: HonorariosProfile
  currentFee: string
  adjustmentDate?: string | null
  contact?: string
  notes?: string
}
export type HonorariosClientPatch = Partial<
  Omit<HonorariosClientInput, 'companyId'>
> & { version: number }
export interface HonorariosClient {
  id: string
  companyId: string
  company: HonorariosCompanyOption
  profile: HonorariosProfile
  currentFee: string
  adjustmentDate: string | null
  contact: string
  notes: string
  version: number
  paramsVersion: number
  archivedAt: string | null
  calculation: HonorariosCalculation
  difference: string
  alignment: HonorariosAlignment
  adjustment: HonorariosAdjustment | null
  createdAt?: string
  updatedAt?: string
}
export interface HonorariosAdjustmentInput {
  version: number
  paramsVersion: number
  mode: HonorariosAdjustmentMode
}
export interface HonorariosQuoteInput {
  requestId: string
  prospect: string
  companyId?: string | null
  contact?: string
  profile: HonorariosProfile
  value: string
  validityDays?: number
  decimoTerceiro?: boolean
  inicioCobranca?: number
  aberturaValor?: string
  aberturaParcelas?: number
  offerPlans?: boolean
  planValues?: Record<string, string>
  revisionOf?: string
  sourceVersion?: number
}
export interface HonorariosQuoteSnapshot {
  paramsVersion: number
  params: HonorariosParams
  office: HonorariosOffice
  profile: HonorariosProfile
  company: HonorariosCompanyOption | null
  prospect: string
  contact: string
  calculation: HonorariosCalculation
  plans: HonorariosPlan[]
  value: string
  annualValue: string
  warnings: Array<{ code: string; planId?: string } | string>
  validUntil: string
  decimoTerceiro: boolean
  inicioCobranca: number
  aberturaValor: string
  aberturaParcelas: number
  vencimento: number
  revisionOf: string | null
}
export interface HonorariosQuote {
  id: string
  number: string
  revision: number
  version: number
  status: HonorariosQuoteStatus
  selectedPlan: string | null
  companyId: string | null
  convertedClientId: string | null
  archivedAt: string | null
  createdAt: string
  snapshot: HonorariosQuoteSnapshot
  isLatest?: boolean
  superseded?: boolean
  supersededBy?: string | null
}
export interface HonorariosQuoteStateInput {
  version: number
  status: HonorariosQuoteStatus
  selectedPlan?: string
}
export interface HonorariosQuoteConvertInput {
  version: number
  companyId: string
}
export interface HonorariosHistoryEvent {
  id: string
  kind: string
  actorId: string | null
  createdAt: string
  details: unknown
}
export interface HonorariosPage<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
export interface HonorariosPageFilters {
  page?: number
  pageSize?: number
}
export interface HonorariosClientFilters extends HonorariosPageFilters {
  q?: string
  archived?: boolean
  regime?: HonorariosRegime
  alignment?: HonorariosAlignment
}
export interface HonorariosQuoteFilters extends HonorariosPageFilters {
  q?: string
  archived?: boolean
  status?: HonorariosQuoteStatus
  allRevisions?: boolean
}
export interface HonorariosImportResult {
  count: number
  ids: string[]
}
export interface HonorariosDashboard {
  paramsVersion: number
  year: number
  clients: {
    count: number
    current: string
    suggested: string
    potential: string
    byAlignment: Record<HonorariosAlignment, number>
    adjustmentsDue: number
    adjustmentPlan: {
      maxIncreasePct: number
      count: number
      monthlyGain: string
      annualGain: string
      entries: Array<{
        clientId: string
        current: string
        proposed: string
        gain: string
        full: boolean
      }>
    }
  }
  quotes: {
    count: number
    byStatus: Record<HonorariosQuoteStatus, number>
    acceptedValue: string
    openCount: number
    openValue: string
    expiringCount: number
    acceptanceRate: number | null
  }
}
