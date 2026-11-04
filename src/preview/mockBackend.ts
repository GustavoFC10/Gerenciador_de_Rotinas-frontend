import type { OrganizationMemberResource } from '../services/organizationMemberService'
import type { ClientCompanyResource } from '../services/companyService'
import workflows from './workflows.json'
import {
  communicationMembers,
  createCommunicationFixtures,
  recordedLeggacyTracking,
} from './processCommunicationsFixtures'
import type {
  ModuleAccessConfiguration,
  ModuleAccess,
  ModuleSummary,
} from '../types/modules'
import type { OrganizationRole, ScheduledOccurrence } from '../types/domain'
import type {
  AlertRecipient,
  ProcessAlert,
  ProcessAlertRecipientOption,
  ProcessCatalogType,
  ProcessCreateInput,
  ProcessDetailDto,
  ProcessEntry,
  ProcessFields,
  ProcessFollowUp,
  ProcessMovementMonth,
  ProcessPermissions,
  ProcessResource,
  ProcessSector,
  ProcessStage,
  ProcessStatus,
  ProcessSummary,
} from '../types/processes'
import { centsToDecimal, decimalToCents } from '../utils/processMoney'

const types = workflows as ProcessCatalogType[]
const sectors = { com: 'Diretoria', fin: 'Financeiro', reg: 'Regularidade' }
const storageKey = 'routine-manager.features-preview.v2'
const statuses: Record<ProcessStatus, string> = {
  andamento: 'Em andamento',
  agendado: 'Aguardando liberação',
  atrasado: 'Atrasado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}
const openStatuses: ProcessStatus[] = ['andamento', 'agendado', 'atrasado']
const editableFields = [
  'empresa',
  'companyId',
  'cnpj',
  'protocolo',
  'prazo',
  'inicioInat',
  'obs',
  'custo',
  'pagador',
  'parcelas',
  'honorario',
  'honCobranca',
  'trab',
  'trabQtd',
  'trabValor',
  'honAnterior',
  'honPerdido',
  'altItens',
  'altDesc',
  'motivo',
  'motivoObs',
  'regime',
  'regimeObs',
  'contato',
  'novoContador',
  'contadorNome',
  'contadorContato',
  'reatJunta',
  'reunAlinh',
  'reunAcomp',
] as const
const organization = {
  id: 'demo-office',
  name: 'Jaralcon · demonstração',
  slug: 'demo',
  timezone: 'America/Sao_Paulo',
}
const departments = [
  {
    id: 'demo-fiscal',
    name: 'Fiscal',
    description: 'Departamento fiscal',
    accessRole: 'lead',
  },
  {
    id: 'demo-pessoal',
    name: 'Pessoal',
    description: 'Departamento pessoal',
    accessRole: 'lead',
  },
]
export const previewPersonas = [
  {
    id: 'demo-diretoria',
    name: 'Ana · Diretoria',
    description: 'Administração, valores e todos os setores',
    role: 'owner' as OrganizationRole,
  },
  {
    id: 'demo-financeiro',
    name: 'Marina · Financeiro',
    description: 'Valores, relatórios e tarefas do Financeiro',
    role: 'member' as OrganizationRole,
  },
  {
    id: 'demo-regularidade',
    name: 'Bruno · Regularidade',
    description: 'Tarefas operacionais, sem valores financeiros',
    role: 'member' as OrganizationRole,
  },
  {
    id: 'demo-rotinas',
    name: 'Clara · Rotinas',
    description: 'Somente o módulo de Rotinas',
    role: 'member' as OrganizationRole,
  },
  {
    id: 'demo-admin',
    name: 'Lucas · Administrador',
    description: 'Administra a organização; Equipe é exclusiva do proprietário',
    role: 'admin' as OrganizationRole,
  },
]

interface PreviewState {
  clientCompanies?: ClientCompanyResource[]
  members?: Record<string, OrganizationMemberResource>
  schema: 2
  actor: string
  authenticated: boolean
  accesses: Record<string, ModuleAccess[]>
  processes: PreviewProcess[]
  openings: Record<string, { body: string; id: string }>
  routineStates: Record<string, string>
}
/** Audit data is stored separately from the public detail projection. */
interface PreviewProcess extends ProcessDetailDto {
  entries: ProcessEntry[]
  resumeSnapshot?: {
    status: ProcessStatus
    stage: number | null
    sectors: ProcessSector[]
    releaseDate: string | null
  }
}
type Store = Pick<Storage, 'getItem' | 'setItem'>
type Body = Record<string, unknown>

const now = () => new Date().toISOString()
const date = (days = 0) => {
  const value = new Date()
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}
const month = (value = now()) => value.slice(0, 7)
const stamp = (days: number) => `${date(days)}T12:00:00-03:00`
function seedClientCompanies(): ClientCompanyResource[] {
  return [
    'Aurora Comércio de Alimentos',
    'Ateliê Horizonte',
    'Clínica Bem Viver',
    'Solar Engenharia',
    'Oficina Caminho Novo',
    'Livraria Ipê',
    'Café Estação',
    'Papelaria Primavera',
    'Studio Essência',
    'Mercado das Flores',
    'Tecnologia Horizonte',
  ].map((name, index) => ({
    id: `00000000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`,
    code: `EMP-${String(index + 1).padStart(3, '0')}`,
    name,
    legalName: `${name} Ltda.`,
    cnpj: `12.345.678/0001-${String(95 + index).padStart(2, '0')}`,
    email: `empresa${index + 1}@preview.example`,
    mobilePhone: '11999990000',
    taxRegime: 'Simples Nacional',
    status: 'active',
    version: 1,
    archivedAt: null,
    createdAt: stamp(-100),
    updatedAt: stamp(-1),
  }))
}
const previousMonth = (value: string, offset: number) => {
  const d = new Date(`${value}-15T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + offset)
  return month(d.toISOString())
}
const fullPermissions: ProcessPermissions = {
  read: true,
  create: true,
  edit: true,
  delete: true,
  cancel: true,
  reopen: true,
  note: true,
  viewFinancial: true,
  viewMovements: true,
  sectors: ['com'],
  executeSectors: ['com', 'fin', 'reg'],
}
const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
const isProcessSector = (value: unknown): value is ProcessSector =>
  typeof value === 'string' && ['com', 'fin', 'reg'].includes(value)

function stagesOf(process: ProcessResource): ProcessStage[] {
  const type = types.find((type) => type.id === process.tipo)!
  return type.etapas
    .filter(
      (stage) =>
        (!stage.opcional ||
          process[stage.opcional as keyof ProcessFields] !== false) &&
        (!stage.seNao || !process[stage.seNao as keyof ProcessFields]),
    )
    .map((stage, index) => ({
      ...structuredClone(stage),
      index,
      tasks: stage.tasks.filter(
        (task) =>
          !task.reuniao ||
          (task.reuniao === 'alinhamento'
            ? process.reunAlinh !== false
            : process.reunAcomp !== false),
      ),
    }))
    .filter((stage) => stage.tasks.length)
}
/** Recorded snapshots: reads never evaluate the clock or recalculate status. */
function fixtureSnapshot(
  process: PreviewProcess,
  status: ProcessStatus,
  currentStage: number | null,
  responsibleSectors: ProcessSector[],
  releaseDate: string | null = null,
) {
  process.status = status
  process.statusChangedAt = process.atualizadoEm
  process.statusNextEvaluationAt =
    status === 'agendado' && releaseDate
      ? `${releaseDate}T00:00:00-03:00`
      : null
  process.responsibleSectors = responsibleSectors
  process.concluidoEm = ['concluido', 'cancelado'].includes(status)
    ? process.atualizadoEm
    : null
  process.etapas.forEach((stage, index) => {
    stage.completed = currentStage === null || index < currentStage
    if (stage.completed)
      stage.tasks.forEach((task) => {
        process.tarefas[task.id] ??= {
          s: 'feito',
          por: 'demo-diretoria',
          autor: 'Ana Souza',
          em: process.atualizadoEm,
        }
      })
  })
  process.analysis = {
    currentStage,
    completedTasks: Object.keys(process.tarefas).length,
    totalTasks: process.etapas.flatMap((stage) => stage.tasks).length,
    releaseDate,
    waiting: status === 'agendado',
    late: status === 'atrasado',
    pendingSectors: ['andamento', 'atrasado'].includes(status)
      ? [...responsibleSectors]
      : [],
  }
  return process
}

/** Explicit command response fixtures, without a time-based workflow engine. */
const commandFixtures: Record<
  string,
  readonly {
    stage: number | null
    status: ProcessStatus
    sectors: ProcessSector[]
  }[]
> = {
  abertura: [
    { stage: 1, status: 'andamento', sectors: ['fin'] },
    { stage: 2, status: 'andamento', sectors: ['fin', 'reg'] },
    { stage: 3, status: 'andamento', sectors: ['fin', 'reg'] },
    { stage: 4, status: 'agendado', sectors: ['fin'] },
    { stage: null, status: 'concluido', sectors: [] },
  ],
  mei: [
    { stage: 1, status: 'andamento', sectors: ['fin'] },
    { stage: 2, status: 'andamento', sectors: ['fin', 'reg'] },
    { stage: 3, status: 'andamento', sectors: ['fin', 'reg'] },
    { stage: 4, status: 'agendado', sectors: ['fin'] },
    { stage: null, status: 'concluido', sectors: [] },
  ],
  outro: [
    { stage: 1, status: 'andamento', sectors: ['fin', 'reg'] },
    { stage: 2, status: 'andamento', sectors: ['fin', 'reg'] },
    { stage: 3, status: 'agendado', sectors: ['fin'] },
    { stage: null, status: 'concluido', sectors: [] },
  ],
  reativacao: [
    { stage: 1, status: 'andamento', sectors: ['fin'] },
    { stage: 2, status: 'andamento', sectors: ['fin'] },
    { stage: 3, status: 'andamento', sectors: ['reg'] },
    { stage: 4, status: 'andamento', sectors: ['fin'] },
    { stage: 5, status: 'agendado', sectors: ['fin'] },
    { stage: null, status: 'concluido', sectors: [] },
  ],
}
function entry(
  kind: string,
  text: string,
  author = 'Ana Souza',
  memberId = 'demo-diretoria',
  financial = false,
  details: unknown = {},
): ProcessEntry {
  return {
    id: crypto.randomUUID(),
    kind,
    text,
    por: memberId,
    autor: author,
    em: now(),
    financial,
    details,
  }
}

function queryError(url: URL, allowed: readonly string[]) {
  const keys = [...new Set(url.searchParams.keys())]
  for (const key of keys) {
    if (!allowed.includes(key)) return `Parâmetro desconhecido: ${key}.`
    if (key !== 'status' && url.searchParams.getAll(key).length > 1)
      return `O parâmetro ${key} não pode ser repetido.`
  }
  for (const key of ['page', 'pageSize']) {
    const value = url.searchParams.get(key)
    if (
      value !== null &&
      (!/^[1-9]\d*$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        (key === 'pageSize' && Number(value) > 100))
    )
      return `O parâmetro ${key} é inválido.`
  }
  return null
}

function collectionQueryError(url: URL) {
  const invalid = queryError(url, [
    'status',
    'tipo',
    'q',
    'month',
    'responsibleSector',
    'queueSector',
    'page',
    'pageSize',
  ])
  if (invalid) return invalid
  if (url.searchParams.getAll('status').some((status) => !(status in statuses)))
    return 'Situação inválida.'
  const tipo = url.searchParams.get('tipo')
  if (tipo !== null && !types.some((type) => type.id === tipo))
    return 'Tipo de processo inválido.'
  for (const key of ['responsibleSector', 'queueSector']) {
    const sector = url.searchParams.get(key)
    if (sector !== null && !(sector in sectors)) return 'Setor inválido.'
  }
  const selectedMonth = url.searchParams.get('month')
  if (selectedMonth !== null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth))
    return 'Mês inválido.'
  return null
}

function filteredProcesses(processes: PreviewProcess[], url: URL) {
  const selectedStatuses = url.searchParams.getAll('status')
  const tipo = url.searchParams.get('tipo')
  const responsibleSector = url.searchParams.get('responsibleSector')
  const queueSector = url.searchParams.get('queueSector')
  const selectedMonth = url.searchParams.get('month')
  const search = url.searchParams.get('q')?.trim().toLocaleLowerCase('pt-BR')
  return processes.filter((process) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: organization.timezone,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date(process.criadoEm))
    const createdMonth = `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}`
    return (
      (!selectedStatuses.length || selectedStatuses.includes(process.status)) &&
      (!tipo || process.tipo === tipo) &&
      (!responsibleSector ||
        process.responsibleSectors.includes(
          responsibleSector as ProcessSector,
        )) &&
      (!queueSector ||
        (['andamento', 'atrasado'].includes(process.status) &&
          process.analysis.pendingSectors.includes(
            queueSector as ProcessSector,
          ))) &&
      (!selectedMonth || createdMonth === selectedMonth) &&
      (!search ||
        [process.empresa, process.cnpj, process.protocolo, process.codigo].some(
          (value) => value?.toLocaleLowerCase('pt-BR').includes(search),
        ))
    )
  })
}

function paginated<T>(results: T[], url: URL) {
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '50')
  const link = (target: number) => {
    const next = new URL(url)
    next.searchParams.set('page', String(target))
    return next.pathname + next.search
  }
  return {
    count: results.length,
    next: page * pageSize < results.length ? link(page + 1) : null,
    previous: page > 1 ? link(page - 1) : null,
    results: results.slice((page - 1) * pageSize, page * pageSize),
  }
}
function seed(): PreviewState {
  const names = [
    'Aurora Comércio de Alimentos',
    'Ateliê Horizonte',
    'Clínica Bem Viver',
    'Solar Engenharia',
    'Oficina Caminho Novo',
    'Livraria Ipê',
    'Café Estação',
    'Papelaria Primavera',
    'Studio Essência',
    'Mercado das Flores',
  ]
  const processes = types.map((type, index): PreviewProcess => {
    const process: PreviewProcess = {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      organizationId: organization.id,
      tipo: type.id,
      empresa: names[index]!,
      codigo: `${type.sigla}-DEMO-${String(index + 1).padStart(3, '0')}`,
      cnpj: '12.345.678/0001-95',
      protocolo: `PROTO-DEMO-${100 + index}`,
      status: index === 8 ? 'cancelado' : 'andamento',
      version: 1,
      workflowVersion: 2,
      statusChangedAt: stamp(-1),
      statusNextEvaluationAt: null,
      responsibleSectors: [],
      companyId: null,
      companyLinkRequired: false,
      companyReference: null,
      criadoPor: 'demo-diretoria',
      autorAbertura: 'Ana Souza',
      criadoEm: stamp(-24 - index),
      atualizadoEm: stamp(-1),
      concluidoEm: index === 8 ? stamp(-2) : null,
      prazo: index === 1 ? date(-8) : date(12 + index),
      tarefas: {},
      leggacy: [],
      etapas: [],
      analysis: {
        currentStage: 0,
        completedTasks: 0,
        totalTasks: 0,
        releaseDate: null,
        waiting: false,
        late: false,
        pendingSectors: [],
      },
      entries: [
        entry(
          'note',
          'Documentação recebida. A equipe pode seguir com a próxima etapa.',
          'Bruno Lima',
          'demo-regularidade',
        ),
        entry('opened', 'abriu o processo'),
      ],
      permissions: fullPermissions,
      custo: '750.00',
      pagador: 'cliente',
      parcelas: 3,
      honorario: '1800.00',
      honCobranca: date(15),
      honAnterior: '2200.00',
      honPerdido: '1400.00',
      trab: index === 0,
      trabQtd: index === 0 ? 8 : null,
      trabValor: index === 0 ? '55.00' : null,
      regime: 'simples',
      regimeObs: 'Dados de demonstração: comércio e prestação de serviços.',
      obs: 'Exemplo fictício para explorar o módulo. Nenhuma informação pertence a um cliente real.',
      altItens: ['endereco', 'atividades'],
      altDesc:
        'Transferência para uma nova sede e inclusão de atividade secundária.',
      motivo: 'reducao',
      motivoObs: 'Empresa em reorganização operacional.',
      novoContador: false,
      reatJunta: true,
      reunAlinh: true,
      reunAcomp: true,
      notifications: {
        sent: 2,
        pending: index === 0 ? 1 : 0,
        failed: index === 0 ? 1 : 0,
        uncertain: index === 0 ? 1 : 0,
        sending: 0,
        skipped: 0,
      },
    }
    if (['inativa', 'inatividade'].includes(type.id)) {
      process.inicioInat = date(-5)
      process.prazo = null
    }
    if (index === 1) {
      process.custo = null
      process.honorario = null
      process.regime = null
    }
    process.etapas = stagesOf(process)
    if (index === 0) return fixtureSnapshot(process, 'andamento', 1, ['fin'])
    if (index === 1) return fixtureSnapshot(process, 'atrasado', 0, ['com'])
    if (index === 2 || index === 6)
      return fixtureSnapshot(
        process,
        'agendado',
        process.etapas.length - 1,
        ['fin'],
        date(90),
      )
    if (index === 7) return fixtureSnapshot(process, 'concluido', null, [])
    if (index === 8) return fixtureSnapshot(process, 'cancelado', 0, [])
    return fixtureSnapshot(process, 'andamento', 0, ['com'])
  })
  // All four second-visit workflows have a persisted waiting snapshot.
  for (const tipo of ['abertura', 'mei'] as const) {
    const waiting = structuredClone(
      processes.find((process) => process.tipo === tipo)!,
    )
    waiting.id = `00000000-0000-4000-8000-${String(processes.length + 1).padStart(12, '0')}`
    waiting.empresa += ' · aguardando acompanhamento'
    waiting.codigo += '-AGE'
    waiting.tarefas = {}
    fixtureSnapshot(
      waiting,
      'agendado',
      waiting.etapas.length - 1,
      ['fin'],
      date(90),
    )
    waiting.entries.push(
      entry(
        'status_changed',
        'Aguardando a reunião de acompanhamento',
        'Ana Souza',
        'demo-diretoria',
        false,
        { from: 'andamento', to: 'agendado', trigger: 'command' },
      ),
    )
    processes.push(waiting)
  }
  const past = structuredClone(processes[0]!)
  past.id = '00000000-0000-4000-8000-000000000099'
  past.empresa = 'Tecnologia Horizonte'
  past.codigo = 'ABE-DEMO-ANT'
  past.criadoEm = `${previousMonth(month(), -1)}-08T12:00:00-03:00`
  past.honorario = '2600.00'
  past.trab = false
  processes.push(past)
  // A recorded synthetic server snapshot makes the Leggacy section reviewable.
  const tracked = processes[0]!
  tracked.leggacy = [structuredClone(recordedLeggacyTracking)]
  tracked.tarefas.ab4 = {
    s: 'feito',
    por: 'demo-financeiro',
    autor: 'Marina Costa',
    em: recordedLeggacyTracking.sentAt,
  }
  tracked.analysis.completedTasks = Object.keys(tracked.tarefas).length
  return {
    schema: 2,
    actor: 'demo-diretoria',
    authenticated: true,
    clientCompanies: seedClientCompanies(),
    processes,
    openings: {},
    routineStates: {},
    accesses: Object.fromEntries(
      previewPersonas.map((persona, index) => [
        persona.id,
        [
          ...(index < 3
            ? [
                {
                  module: 'processes' as const,
                  sector: ['com', 'fin', 'reg'][index]!,
                  role: ['com', 'fin', 'reg'][index] as ProcessSector,
                  jobTitle: [
                    'Diretora',
                    'Analista financeiro',
                    'Analista de regularidade',
                  ][index]!,
                },
              ]
            : []),
          ...(index === 0 || index === 3
            ? [
                {
                  module: 'routines' as const,
                  sector: 'demo-fiscal',
                  role: 'lead' as const,
                  jobTitle: '',
                },
              ]
            : []),
        ],
      ]),
    ),
  }
}

export class PreviewBackend {
  state: PreviewState
  private communications: {
    followUps: ProcessFollowUp[]
    alerts: ProcessAlert[]
  }
  constructor(private readonly store?: Store) {
    try {
      const saved = JSON.parse(
        store?.getItem(storageKey) ?? 'null',
      ) as PreviewState | null
      this.state =
        saved?.schema === 2 &&
        saved.processes &&
        previewPersonas.some((p) => p.id === saved.actor)
          ? saved
          : seed()
      this.state.clientCompanies ??= seedClientCompanies()
    } catch {
      this.state = seed()
    }
    this.communications = createCommunicationFixtures(this.state.processes)
  }
  save() {
    try {
      this.store?.setItem(storageKey, JSON.stringify(this.state))
    } catch {
      /* A navegação permanece disponível sem storage. */
    }
  }
  reset() {
    this.state = seed()
    this.communications = createCommunicationFixtures(this.state.processes)
    this.save()
  }
  selectActor(id: string) {
    if (previewPersonas.some((persona) => persona.id === id)) {
      this.state.actor = id
      this.state.authenticated = true
      this.save()
    }
  }
  get actor() {
    const persona = previewPersonas.find(
      (persona) => persona.id === this.state.actor,
    )!
    const profile = this.state.members?.[persona.id]
    return profile
      ? { ...persona, name: profile.displayName, role: profile.role }
      : persona
  }
  permissions(): ProcessPermissions {
    const granted = (this.state.accesses[this.state.actor] ?? [])
      .filter((access) => access.module === 'processes')
      .map((access) => access.sector as ProcessSector)
    const manage = granted.includes('com')
    const financial = manage || granted.includes('fin')
    return {
      read: !!granted.length,
      create: manage,
      edit: manage,
      delete: manage,
      cancel: manage,
      reopen: manage,
      note: !!granted.length,
      viewFinancial: financial,
      viewMovements: financial,
      sectors: granted,
      executeSectors: manage ? ['com', 'fin', 'reg'] : granted,
    }
  }
  modules(memberId = this.state.actor): ModuleSummary[] {
    const persona = this.member(memberId)
    const configuration = persona.moduleAccesses?.find(
      (item) => item.module === 'routines',
    )
    const global = configuration?.enabled && configuration.role === 'admin'
    const grants = this.state.accesses[memberId] ?? []
    const routines = grants.filter((access) => access.module === 'routines')
    const processes = grants.filter((access) => access.module === 'processes')
    const manage = processes.some((access) => access.sector === 'com')
    const financial =
      manage || processes.some((access) => access.sector === 'fin')
    return [
      // The demo owner/admin personas are seeded with an explicit Companies grant.
      ...(['demo-diretoria', 'demo-rotinas'].includes(memberId)
        ? [
            {
              module: 'companies' as const,
              role: 'manager',
              globalAccess: false,
              sectors: [],
              actions: [
                'read',
                'create',
                'edit',
                'archive',
                'restore',
                'readArchived',
              ],
            },
          ]
        : []),
      ...((configuration?.enabled ??
      (persona.role !== 'member' || !!routines.length))
        ? [
            {
              module: 'routines' as const,
              globalAccess: !!global,
              actions: ['read', 'create', 'edit'],
              sectors: departments
                .filter(
                  (department) =>
                    global ||
                    routines.some((access) => access.sector === department.id),
                )
                .map((department) => ({
                  id: department.id,
                  name: department.name,
                  role:
                    routines.find((access) => access.sector === department.id)
                      ?.role ?? 'lead',
                  actions: ['read', 'edit'],
                })),
            },
          ]
        : []),
      ...(processes.length
        ? [
            {
              module: 'processes' as const,
              globalAccess: false,
              actions: [
                'read',
                'note',
                ...(manage
                  ? ['create', 'edit', 'delete', 'cancel', 'reopen']
                  : []),
                ...(financial ? ['viewFinancial', 'viewMovements'] : []),
              ],
              sectors: processes.map((access) => ({
                id: access.sector,
                name: sectors[access.sector as ProcessSector],
                role: access.role,
                jobTitle: access.jobTitle,
                actions: ['read', 'execute'],
              })),
              executeSectors: manage
                ? ['com', 'fin', 'reg']
                : processes.map((access) => access.sector),
            },
          ]
        : []),
    ]
  }
  member(id: string): OrganizationMemberResource {
    const persona = previewPersonas.find((item) => item.id === id)
    const saved = this.state.members?.[id]
    const grants = this.state.accesses[id] ?? []
    const routineGrants = grants.filter((item) => item.module === 'routines')
    const role = saved?.role ?? persona?.role ?? 'member'
    return {
      id,
      displayName: persona?.name.split(' · ')[0] ?? '',
      email: id + '@preview.example',
      role,
      status: 'active',
      joinedAt: stamp(-120),
      createdAt: stamp(-120),
      updatedAt: stamp(-1),
      ...saved,
      departmentAccesses: routineGrants.map((item) => ({
        id: id + '-' + item.sector,
        departmentId: item.sector,
        departmentName:
          departments.find((department) => department.id === item.sector)
            ?.name ?? item.sector,
        role: item.role as 'lead' | 'contributor' | 'viewer',
        createdAt: stamp(-120),
        updatedAt: now(),
      })),
      moduleAccesses: saved?.moduleAccesses ?? [
        {
          module: 'routines',
          enabled: role !== 'member' || !!routineGrants.length,
          role: role !== 'member' ? 'admin' : 'departments',
          ...(role === 'member'
            ? {
                sectors: routineGrants.map((item) => ({
                  sector: item.sector,
                  role: item.role,
                })),
              }
            : {}),
        },
        {
          module: 'processes',
          enabled: grants.some((item) => item.module === 'processes'),
          sectors: grants
            .filter((item) => item.module === 'processes')
            .map((item) => ({
              sector: item.sector,
              role: item.role,
              jobTitle: item.jobTitle,
            })),
        },
      ],
    }
  }
  updateMember(
    member: OrganizationMemberResource,
    body: Body,
  ): OrganizationMemberResource | string {
    if ('displayName' in body && !String(body.displayName).trim())
      return 'Informe o nome do colaborador.'
    const configs = (body.moduleAccesses ?? []) as ModuleAccessConfiguration[]
    if (!Array.isArray(configs)) return 'Configuração de módulos inválida.'
    for (const config of configs) {
      if (!['routines', 'processes'].includes(config.module))
        return 'Módulo inválido.'
      if (!config.enabled) continue
      if (!['active', 'pending'].includes(member.status))
        return 'Acessos disponíveis apenas para contas ativas ou pendentes.'
      if (config.module === 'routines' && config.role === 'admin') continue
      if (!config.sectors?.length)
        return 'Escolha ao menos um setor ou departamento.'
      for (const sector of config.sectors) {
        if (
          config.module === 'routines' &&
          (!departments.some((item) => item.id === sector.sector) ||
            !['lead', 'contributor', 'viewer'].includes(sector.role))
        )
          return 'Departamento ou papel inválido.'
        if (
          config.module === 'processes' &&
          (!(sector.sector in sectors) || sector.role !== sector.sector)
        )
          return 'Setor de Processos inválido.'
      }
    }
    return {
      ...member,
      displayName:
        'displayName' in body
          ? String(body.displayName).trim()
          : member.displayName,
      role: (body.role ?? member.role) as OrganizationRole,
      updatedAt: now(),
      moduleAccesses: [
        ...(member.moduleAccesses ?? []).filter(
          (item) => !configs.some((config) => config.module === item.module),
        ),
        ...structuredClone(configs),
      ],
    }
  }
  storeMember(member: OrganizationMemberResource) {
    this.state.members ??= {}
    this.state.members[member.id] = member
    this.state.accesses[member.id] = (member.moduleAccesses ?? []).flatMap(
      (config) =>
        config.enabled
          ? (config.sectors ?? []).map((sector) => ({
              module: config.module,
              sector: sector.sector,
              role: sector.role,
              jobTitle: sector.jobTitle ?? '',
            }))
          : [],
    )
    this.save()
  }
  session() {
    const membership = {
      id: this.actor.id,
      displayName: this.actor.name.split(' · ')[0],
      role: this.actor.role,
      status: 'active',
      organization,
      modules: this.modules(),
    }
    return {
      user: {
        id: this.actor.id,
        email: `${this.actor.id}@preview.example`,
        isPlatformStaff: false,
      },
      memberships: [membership],
      activeMembership: membership,
    }
  }
  project(raw: PreviewProcess): ProcessResource {
    const {
      entries: _entries,
      resumeSnapshot: _resume,
      ...detail
    } = structuredClone(raw)
    void _entries
    void _resume
    const process: ProcessDetailDto = detail
    process.companyLinkRequired ??= false
    process.companyReference ??= null
    process.permissions = this.permissions()
    if (!process.permissions.create) delete process.notifications
    if (!process.permissions.viewFinancial) {
      for (const key of [
        'custo',
        'pagador',
        'parcelas',
        'honorario',
        'honCobranca',
        'trab',
        'trabQtd',
        'trabValor',
        'honAnterior',
        'honPerdido',
        'obs',
        'altDesc',
        'regimeObs',
        'motivoObs',
        'contato',
        'contadorContato',
      ] as const)
        delete process[key]
      process.etapas.forEach((stage) =>
        stage.tasks.forEach((task) => {
          if (task.guia) task.txt = 'Enviar a guia de pagamento'
        }),
      )
    }
    return process
  }
  summary(raw: PreviewProcess): ProcessSummary {
    const process = this.project(raw)
    return {
      id: process.id,
      organizationId: process.organizationId,
      tipo: process.tipo,
      codigo: process.codigo,
      empresa: process.empresa,
      companyId: process.companyId ?? null,
      companyLinkRequired: process.companyLinkRequired,
      companyReference: process.companyReference,
      cnpj: process.cnpj ?? '',
      protocolo: process.protocolo ?? '',
      prazo: process.prazo ?? null,
      criadoPor: process.criadoPor,
      autorAbertura: process.autorAbertura,
      criadoEm: process.criadoEm,
      atualizadoEm: process.atualizadoEm,
      concluidoEm: process.concluidoEm,
      status: process.status,
      statusChangedAt: process.statusChangedAt,
      statusNextEvaluationAt: process.statusNextEvaluationAt,
      responsibleSectors: process.responsibleSectors,
      version: process.version,
      workflowVersion: process.workflowVersion,
      analysis: process.analysis,
      permissions: process.permissions,
    }
  }
  report(value: string): ProcessMovementMonth {
    const result: ProcessMovementMonth = {
      month: value,
      gain: '0.00',
      loss: '0.00',
      balance: '0.00',
      missingValues: 0,
      entries: [],
      exits: [],
      lossesByType: {},
    }
    let gain = 0n
    let loss = 0n
    for (const process of this.state.processes.filter(
      (item) => item.status !== 'cancelado' && month(item.criadoEm) === value,
    )) {
      const total =
        process.honorario == null
          ? null
          : decimalToCents(process.honorario) +
            (process.trab && process.trabValor != null
              ? BigInt(process.trabQtd ?? 0) * decimalToCents(process.trabValor)
              : 0n)
      if (['abertura', 'mei', 'outro'].includes(process.tipo)) {
        result.entries.push({
          processId: process.id,
          empresa: process.empresa,
          tipo: process.tipo,
          value: total == null ? null : centsToDecimal(total),
        })
        if (total == null) result.missingValues++
        else gain += total
      }
      if (
        ['baixa', 'saida', 'exclusao', 'inatividade', 'inativa'].includes(
          process.tipo,
        )
      ) {
        let lost =
          process.tipo === 'inativa'
            ? process.honAnterior != null && total != null
              ? decimalToCents(process.honAnterior) - total
              : null
            : process.honPerdido == null
              ? null
              : decimalToCents(process.honPerdido)
        if (lost != null && lost < 0n) lost = 0n
        result.exits.push({
          processId: process.id,
          empresa: process.empresa,
          tipo: process.tipo,
          value: lost == null ? null : centsToDecimal(lost),
        })
        if (lost == null) result.missingValues++
        else {
          loss += lost
          result.lossesByType[process.tipo] = centsToDecimal(
            decimalToCents(result.lossesByType[process.tipo] ?? '0.00') + lost,
          )
        }
      }
    }
    return {
      ...result,
      gain: centsToDecimal(gain),
      loss: centsToDecimal(loss),
      balance: centsToDecimal(gain - loss),
    }
  }

  private communicationRecipients(): ProcessAlertRecipientOption[] {
    return communicationMembers
      .flatMap((fixture) => {
        const sourceId = fixture.actorId ?? fixture.memberId
        const profile = this.state.members?.[sourceId]
        if (profile && profile.status !== 'active') return []
        const grants = this.state.accesses[sourceId]
        const granted =
          grants === undefined
            ? fixture.sectors
            : grants
                .filter((access) => access.module === 'processes')
                .map((access) => access.sector as ProcessSector)
        const configuration = profile?.moduleAccesses?.find(
          (access) => access.module === 'processes',
        )
        if (configuration?.enabled === false || !granted.length) return []
        return [
          {
            memberId: fixture.memberId,
            name: profile?.displayName ?? fixture.name,
            email: profile?.email ?? fixture.email,
            sectors: [...new Set(granted)],
          },
        ]
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  private resolveCommunicationSelection(body: Body):
    | {
        selectedSectors: ProcessSector[]
        selectedMemberIds: string[]
        recipients: AlertRecipient[]
      }
    | string {
    if (
      Object.keys(body).some(
        (key) => !['version', 'sectors', 'memberIds'].includes(key),
      )
    )
      return 'A seleção contém campos não aceitos.'
    const sectorsInput = body.sectors ?? []
    const membersInput = body.memberIds ?? []
    if (
      !Array.isArray(sectorsInput) ||
      sectorsInput.length > 3 ||
      sectorsInput.some((value) => !isProcessSector(value))
    )
      return 'Selecione setores válidos de Processos.'
    if (
      !Array.isArray(membersInput) ||
      membersInput.length > 500 ||
      membersInput.some((value) => !isUuid(value))
    )
      return 'Selecione membros válidos.'
    const selectedSectors = [...new Set(sectorsInput)] as ProcessSector[]
    const selectedMemberIds = [...new Set(membersInput)] as string[]
    const eligible = this.communicationRecipients()
    if (
      selectedMemberIds.some(
        (id) => !eligible.some((member) => member.memberId === id),
      )
    )
      return 'Selecione membros ativos e autorizados desta organização.'
    const recipients = eligible
      .filter(
        (member) =>
          selectedMemberIds.includes(member.memberId) ||
          member.sectors.some((sector) => selectedSectors.includes(sector)),
      )
      .map(({ memberId, name, email }) => ({ memberId, name, email }))
    if (!recipients.length)
      return 'Selecione ao menos uma pessoa ou setor com membros ativos.'
    return { selectedSectors, selectedMemberIds, recipients }
  }

  /** Only explicit commands close recorded fixtures; reads never evaluate time. */
  private closeCommunicationSituations(
    process: PreviewProcess,
    deadlineChanged = false,
  ) {
    const active = ['andamento', 'atrasado', 'agendado'].includes(
      process.status,
    )
    const tasks = stagesOf(process).flatMap((stage) => stage.tasks)
    const closedFollowUps = new Set<string>()
    const currentStage =
      process.etapas[process.analysis.currentStage ?? -1]?.index ??
      process.analysis.currentStage
    for (const followUp of this.communications.followUps.filter(
      (item) => item.processId === process.id && item.state !== 'resolved',
    )) {
      const valid =
        active &&
        tasks.some((task) => task.id === followUp.returnTaskId) &&
        process.tarefas[followUp.sendTaskId]?.s === 'feito' &&
        !process.tarefas[followUp.returnTaskId]
      if (valid) continue
      followUp.state = 'resolved'
      followUp.resolvedAt = now()
      followUp.resolution = active ? 'return_or_reset' : 'process_closed'
      followUp.version++
      closedFollowUps.add(followUp.id)
      process.entries.push(
        entry(
          'followup_closed',
          'encerrou a cobrança complementar da Leggacy',
          'Sistema',
          '',
          false,
          { trigger: 'clock', followUpId: followUp.id },
        ),
      )
    }
    for (const alert of this.communications.alerts.filter(
      (item) => item.processId === process.id && !item.resolvedAt,
    )) {
      const close =
        !active ||
        (alert.kind === 'leggacy'
          ? !!alert.followUpId && closedFollowUps.has(alert.followUpId)
          : deadlineChanged ||
            process.status !== 'atrasado' ||
            alert.stageIndex !== currentStage)
      if (!close) continue
      alert.resolvedAt = now()
      if (!alert.sentAt) alert.status = 'resolved'
      alert.version++
    }
    process.leggacy = process.leggacy
      .filter(
        (item) =>
          process.tarefas[item.sendTaskId]?.s === 'feito' &&
          tasks.some((task) => task.id === item.returnTaskId),
      )
      .map((item) => ({
        ...item,
        awaitingReturn: !process.tarefas[item.returnTaskId],
        followUpDue:
          item.followUpDue && active && !process.tarefas[item.returnTaskId],
      }))
  }

  private communicationResponse(
    path: string,
    method: string,
    body: Body,
    url: URL,
    json: (data: unknown, status?: number, version?: number) => Response,
    error: (status: number, detail: string) => Response,
  ): Response {
    const permissions = this.permissions()
    if (
      !permissions.read ||
      this.member(this.state.actor).status !== 'active' ||
      (path.startsWith('process-alerts') && !permissions.create)
    )
      return error(403, 'Sem acesso a esta área de Processos.')
    const visible = (processId: string) =>
      this.state.processes.some(
        (process) =>
          process.id === processId &&
          process.organizationId === organization.id,
      )
    const page = <T>(values: T[]) => {
      const result = paginated(values, url)
      return Number(url.searchParams.get('page') ?? 1) > 1 &&
        !result.results.length
        ? error(404, 'Página não encontrada.')
        : json(result)
    }
    if (
      method === 'GET' &&
      [
        'process-follow-ups',
        'process-alerts',
        'process-alerts/recipient-options',
      ].includes(path)
    ) {
      const allowed =
        path === 'process-follow-ups'
          ? ['processId', 'state', 'page', 'pageSize']
          : path === 'process-alerts'
            ? ['processId', 'kind', 'status', 'page', 'pageSize']
            : ['q', 'sector', 'page', 'pageSize']
      const invalid = queryError(url, allowed)
      if (
        invalid ||
        [...url.searchParams.keys()].some(
          (key) => url.searchParams.getAll(key).length > 1,
        )
      )
        return error(400, invalid ?? 'Os parâmetros não podem ser repetidos.')
      const processId = url.searchParams.get('processId')
      if (processId !== null && !isUuid(processId))
        return error(400, 'Processo inválido.')
      if (path === 'process-follow-ups') {
        const state = url.searchParams.get('state')
        if (
          state !== null &&
          !['pending', 'completed', 'resolved'].includes(state)
        )
          return error(400, 'Situação de cobrança inválida.')
        return page(
          this.communications.followUps.filter(
            (item) =>
              visible(item.processId) &&
              (!processId || item.processId === processId) &&
              (!state || item.state === state),
          ),
        )
      }
      if (path === 'process-alerts') {
        const kind = url.searchParams.get('kind')
        const status = url.searchParams.get('status')
        if (kind !== null && !['leggacy', 'overdue'].includes(kind))
          return error(400, 'Tipo de aviso inválido.')
        if (
          status !== null &&
          !['pending', 'sent', 'resolved'].includes(status)
        )
          return error(400, 'Situação de aviso inválida.')
        return page(
          this.communications.alerts.filter(
            (item) =>
              visible(item.processId) &&
              (!processId || item.processId === processId) &&
              (!kind || item.kind === kind) &&
              (!status || item.status === status),
          ),
        )
      }
      const sector = url.searchParams.get('sector')
      const q =
        url.searchParams.get('q')?.trim().toLocaleLowerCase('pt-BR') ?? ''
      if (sector !== null && !isProcessSector(sector))
        return error(400, 'Setor inválido.')
      if (q.length > 200)
        return error(400, 'A busca permite até 200 caracteres.')
      return page(
        this.communicationRecipients().filter(
          (member) =>
            (!sector || member.sectors.includes(sector as ProcessSector)) &&
            (!q ||
              [member.name, member.email].some((value) =>
                value.toLocaleLowerCase('pt-BR').includes(q),
              )),
        ),
      )
    }
    const match =
      /^(process-alerts|process-follow-ups)\/([^/]+)(?:\/(.*))?$/.exec(path)
    if (!match || !isUuid(match[2]))
      return error(404, 'Registro não encontrado.')
    const action = match[3] ?? ''
    const collection =
      match[1] === 'process-alerts'
        ? this.communications.alerts
        : this.communications.followUps
    const resource = collection.find(
      (item) => item.id === match[2] && visible(item.processId),
    )
    if (!resource) return error(404, 'Registro não encontrado.')
    if (method === 'GET' && !action) return json(resource)
    if (method !== 'POST') return error(405, 'Operação indisponível.')
    if (!Number.isSafeInteger(body.version) || Number(body.version) < 1)
      return error(400, 'Informe a versão atual do registro.')
    if (body.version !== resource.version)
      return error(
        409,
        'Outra operação alterou o registro. Recarregue e revise a seleção.',
      )
    const process = this.state.processes.find(
      (item) => item.id === resource.processId,
    )!
    const memberId =
      communicationMembers.find((member) => member.actorId === this.state.actor)
        ?.memberId ?? '30000000-0000-4000-8000-000000000099'
    const author = this.session().activeMembership.displayName
    if (match[1] === 'process-follow-ups') {
      const followUp = resource as ProcessFollowUp
      if (action !== 'complete') return error(404, 'Operação indisponível.')
      if (!permissions.executeSectors.includes('fin'))
        return error(
          403,
          'Somente o Financeiro ou a Diretoria registra a cobrança.',
        )
      if (Object.keys(body).some((key) => key !== 'version'))
        return error(400, 'A cobrança recebe somente a versão atual.')
      if (followUp.state !== 'pending')
        return error(409, 'A cobrança já foi registrada ou encerrada.')
      followUp.state = 'completed'
      followUp.completedAt = now()
      followUp.completedBy = memberId
      followUp.version++
      process.entries.push(
        entry(
          'followup_done',
          'registrou a cobrança realizada com a Leggacy',
          author,
          memberId,
          false,
          { followUpId: followUp.id },
        ),
      )
      this.save()
      return json(followUp)
    }
    const alert = resource as ProcessAlert
    if (!['prepare', 'declare-sent'].includes(action))
      return error(404, 'Operação indisponível.')
    if (alert.status !== 'pending')
      return error(409, 'Este aviso já foi declarado ou encerrado.')
    const selection = this.resolveCommunicationSelection(body)
    if (typeof selection === 'string') return error(400, selection)
    if (action === 'prepare')
      return json({
        alertId: alert.id,
        version: alert.version,
        subject: alert.subject,
        body: alert.body,
        recipients: selection.recipients,
        copyText: `Para: ${selection.recipients.map((member) => member.email).join(', ')}\nAssunto: ${alert.subject}\n\n${alert.body}`,
      })
    alert.status = 'sent'
    alert.sentAt = now()
    alert.sentBy = memberId
    alert.recipients = structuredClone(selection.recipients)
    alert.selectedSectors = selection.selectedSectors
    alert.selectedMemberIds = selection.selectedMemberIds
    alert.version++
    process.entries.push(
      entry(
        'alert_sent',
        'declarou o envio manual do aviso por e-mail',
        author,
        memberId,
        false,
        { alertId: alert.id },
      ),
    )
    this.save()
    return json(alert)
  }

  async handle(
    url: URL,
    method = 'GET',
    body: Body = {},
    headers = new Headers(),
  ): Promise<Response> {
    const path = url.pathname.replace(/^\/api\/v1\//, '').replace(/\/$/, '')
    const json = (data: unknown, status = 200, version?: number) =>
      new Response(status === 204 ? null : JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...(version ? { ETag: `"${version}"` } : {}),
        },
      })
    const error = (status: number, detail: string) =>
      json(
        { type: 'preview-error', title: 'Preview local', detail, status },
        status,
      )
    if (path === 'auth/csrf') return json({ csrfToken: 'local-preview-csrf' })
    if (path === 'auth/login') {
      this.state.authenticated = true
      this.save()
      return json({ ...this.session(), csrfToken: 'local-preview-csrf' })
    }
    if (path === 'auth/logout') {
      this.state.authenticated = false
      this.save()
      return json(null, 204)
    }
    if (!this.state.authenticated)
      return error(
        403,
        'Entre na demonstração usando qualquer e-mail e senha fictícios.',
      )
    if (path === 'auth/session' || path === 'auth/active-membership')
      return json(this.session())
    if (path === 'module-permissions') return json({ modules: this.modules() })
    if (path === 'organization-members') {
      const ids = [
        ...new Set([
          ...previewPersonas.map((persona) => persona.id),
          ...Object.keys(this.state.members ?? {}),
        ]),
      ]
      const results = ids.map((id) => this.member(id))
      return json({
        count: results.length,
        next: null,
        previous: null,
        results,
      })
    }
    if (path === 'membership-invitations' && method === 'POST') {
      if (this.actor.role === 'member')
        return error(403, 'Somente administradores gerenciam os colaboradores.')
      if (body.role === 'owner' && this.actor.role !== 'owner')
        return error(403, 'Somente um proprietário pode atribuir esse cargo.')
      const email = String(body.email ?? '')
        .trim()
        .toLowerCase()
      const existing = [
        ...previewPersonas.map((persona) => this.member(persona.id)),
        ...Object.values(this.state.members ?? {}),
      ].find((member) => member.email === email)
      if (existing && existing.status !== 'pending')
        return error(409, 'Este e-mail já está cadastrado na organização.')
      const id = existing?.id ?? crypto.randomUUID()
      const member: OrganizationMemberResource = existing ?? {
        id,
        email,
        displayName: '',
        role: 'member',
        status: 'pending',
        joinedAt: null,
        departmentAccesses: [],
        createdAt: now(),
        updatedAt: now(),
        moduleAccesses: [
          { module: 'routines', enabled: false },
          { module: 'processes', enabled: false },
        ],
      }
      const next = this.updateMember(member, body)
      if (typeof next === 'string') return error(400, next)
      this.storeMember(next)
      return json(
        {
          id: crypto.randomUUID(),
          memberId: id,
          email,
          displayName: next.displayName,
          role: next.role,
          moduleAccesses: next.moduleAccesses,
          createdAt: now(),
          expiresAt: stamp(7),
        },
        201,
      )
    }
    const profilePath = /^organization-members\/([^/]+)(\/offboard)?$/.exec(
      path,
    )
    if (profilePath) {
      const id = profilePath[1]!
      if (
        !previewPersonas.some((persona) => persona.id === id) &&
        !this.state.members?.[id]
      )
        return error(404, 'Colaborador não encontrado.')
      const member = this.member(id)
      if (method === 'GET') return json(member)
      if (
        this.actor.role === 'member' ||
        (member.role === 'owner' && this.actor.role !== 'owner')
      )
        return error(403, 'Você não pode alterar este perfil.')
      if (body.role === 'owner' && this.actor.role !== 'owner')
        return error(403, 'Somente um proprietário pode atribuir esse cargo.')
      if (profilePath[2] && method === 'POST') {
        const next = {
          ...member,
          status: 'inactive' as const,
          updatedAt: now(),
        }
        this.storeMember(next)
        return json(next)
      }
      if (method === 'PATCH') {
        const next = this.updateMember(member, body)
        if (typeof next === 'string') return error(400, next)
        this.storeMember(next)
        return json(next)
      }
    }
    const memberAccess =
      /^organization-members\/([^/]+)\/module-accesses$/.exec(path)
    if (memberAccess) {
      if (this.actor.role === 'member')
        return error(403, 'Somente administradores gerenciam os acessos.')
      const id = memberAccess[1]!
      const target = previewPersonas.find((p) => p.id === id)
      if (!target) return error(404, 'Colaborador não encontrado.')
      if (
        method !== 'GET' &&
        this.actor.role !== 'owner' &&
        target.role === 'owner'
      )
        return error(
          403,
          'Somente um proprietário altera os acessos de outro proprietário.',
        )
      let accesses = this.state.accesses[id] ?? []
      if (method === 'PUT' || method === 'DELETE') {
        accesses = accesses.filter(
          (a) => a.module !== body.module || a.sector !== body.sector,
        )
        if (method === 'PUT')
          accesses.push({
            module: body.module,
            sector: body.sector,
            role: body.role,
            jobTitle: body.jobTitle ?? '',
          } as ModuleAccess)
        this.state.accesses[id] = accesses
        this.save()
      }
      return method === 'DELETE' ? json(null, 204) : json(accesses)
    }
    if (/organization-members\/[^/]+\/avatar$/.test(path))
      return json({ file: null, version: 1 }, 200, 1)
    if (
      path === 'process-follow-ups' ||
      path.startsWith('process-follow-ups/') ||
      path === 'process-alerts' ||
      path.startsWith('process-alerts/')
    ) {
      return this.communicationResponse(path, method, body, url, json, error)
    }
    if (path.startsWith('processes')) {
      const permissions = this.permissions()
      if (!permissions.read)
        return error(
          403,
          'Este perfil não tem acesso a Processos. Troque o perfil nas opções do preview.',
        )
      if (path === 'processes/catalog')
        return json({
          contractVersion: 2,
          workflowVersion: 2,
          statuses,
          openStatuses,
          types,
          sectors,
          permissions,
        })
      if (path === 'processes/company-options' && method === 'GET') {
        const invalid = queryError(url, ['search', 'page', 'pageSize'])
        if (invalid) return error(400, invalid)
        const search =
          url.searchParams.get('search')?.trim().toLocaleLowerCase('pt-BR') ??
          ''
        if (search.length > 200)
          return error(400, 'A busca permite até 200 caracteres.')
        const companies = (this.state.clientCompanies ?? seedClientCompanies())
          .filter((company) => !company.archivedAt)
          .filter((company) =>
            [company.code, company.name, company.legalName, company.cnpj]
              .join(' ')
              .toLocaleLowerCase('pt-BR')
              .includes(search),
          )
          .map(({ id, code, name, legalName, cnpj }) => ({
            id,
            code,
            name,
            legalName,
            cnpj,
            status: 'active' as const,
          }))
        const optionsUrl = new URL(url)
        if (!optionsUrl.searchParams.has('pageSize'))
          optionsUrl.searchParams.set('pageSize', '20')
        const result = paginated(companies, optionsUrl)
        if (
          Number(optionsUrl.searchParams.get('page') ?? 1) > 1 &&
          !result.results.length
        )
          return error(404, 'Página não encontrada.')
        return json(result)
      }
      if (path === 'processes/reports/monthly') {
        if (!permissions.viewMovements)
          return error(403, 'Relatórios restritos à Diretoria e ao Financeiro.')
        const selected = url.searchParams.get('month') ?? month()
        return json({
          ...this.report(selected),
          previousMonth: this.report(previousMonth(selected, -1)),
          history: Array.from({ length: 12 }, (_, i) =>
            this.report(previousMonth(selected, i - 11)),
          ),
        })
      }
      const processes = this.state.processes
      const collectionRead =
        method === 'GET' &&
        (path === 'processes' || path === 'processes/indicators')
      if (collectionRead) {
        const invalid = collectionQueryError(url)
        if (invalid) return error(400, invalid)
        const queueSector = url.searchParams.get('queueSector')
        if (
          queueSector &&
          !permissions.executeSectors.includes(queueSector as ProcessSector)
        )
          return error(
            403,
            'Sem autorização para executar tarefas neste setor.',
          )
      }
      const filtered = collectionRead
        ? filteredProcesses(processes, url)
        : processes
      if (path === 'processes/indicators')
        return json({
          total: filtered.length,
          active: filtered.filter((p) => openStatuses.includes(p.status))
            .length,
          completed: filtered.filter((p) => p.status === 'concluido').length,
          cancelled: filtered.filter((p) => p.status === 'cancelado').length,
          late: filtered.filter((p) => p.status === 'atrasado').length,
          waiting: filtered.filter((p) => p.status === 'agendado').length,
          byStatus: Object.fromEntries(
            Object.keys(statuses).map((status) => [
              status,
              filtered.filter((p) => p.status === status).length,
            ]),
          ),
          bySector: Object.fromEntries(
            Object.keys(sectors).map((sector) => [
              sector,
              filtered.filter(
                (p) =>
                  ['andamento', 'atrasado'].includes(p.status) &&
                  p.analysis.pendingSectors.includes(sector as ProcessSector),
              ).length,
            ]),
          ),
          byType: Object.fromEntries(
            types.map((type) => [
              type.id,
              filtered.filter((p) => p.tipo === type.id).length,
            ]),
          ),
        })
      if (path === 'processes' && method === 'GET') {
        const page = paginated(filtered, url)
        if (
          Number(url.searchParams.get('page') ?? 1) > 1 &&
          !page.results.length
        )
          return error(404, 'Página não encontrada.')
        return json({
          ...page,
          results: page.results.map((p) => this.summary(p)),
        })
      }
      if (path === 'processes' && method === 'POST') {
        if (!permissions.create)
          return error(403, 'Somente a Diretoria abre processos.')
        const creationFields = editableFields.filter(
          (field) => field !== 'empresa' && field !== 'cnpj',
        )
        if (
          Object.keys(body).some(
            (key) =>
              key !== 'tipo' &&
              !(creationFields as readonly string[]).includes(key),
          )
        )
          return error(
            400,
            'A abertura contém campos não aceitos pelo contrato.',
          )
        const key = headers.get('Idempotency-Key') ?? ''
        if (!key) return error(400, 'Faltou a chave da abertura.')
        const replay = this.state.openings[key]
        if (replay) {
          const existing = processes.find((p) => p.id === replay.id)
          return existing && replay.body === JSON.stringify(body)
            ? json(this.project(existing))
            : error(409, 'A chave de abertura já foi usada para outros dados.')
        }
        const input = body as unknown as Omit<
          ProcessCreateInput,
          'empresa' | 'cnpj'
        >
        const type = types.find((t) => t.id === input.tipo)
        const company = (this.state.clientCompanies ?? []).find(
          (item) => item.id === input.companyId && !item.archivedAt,
        )
        if (!type || !company)
          return error(400, 'Escolha o tipo e uma empresa ativa cadastrada.')
        const process: PreviewProcess = {
          companyId: company.id,
          companyLinkRequired: true,
          companyReference: {
            id: company.id,
            code: company.code,
            name: company.name,
            legalName: company.legalName,
            cnpj: company.cnpj,
            status: company.status,
          },
          empresa: company.name,
          cnpj: company.cnpj,
          protocolo: '',
          prazo: null,
          ...input,
          id: crypto.randomUUID(),
          organizationId: organization.id,
          codigo: `${type.sigla}-DEMO-${String(processes.length + 1).padStart(3, '0')}`,
          criadoEm: now(),
          atualizadoEm: now(),
          criadoPor: this.actor.id,
          autorAbertura: this.session().activeMembership.displayName,
          concluidoEm: null,
          status: 'andamento',
          version: 1,
          workflowVersion: 2,
          statusChangedAt: now(),
          statusNextEvaluationAt: null,
          responsibleSectors: ['com'],
          tarefas: {},
          leggacy: [],
          etapas: [],
          analysis: {
            currentStage: 0,
            totalTasks: 0,
            completedTasks: 0,
            releaseDate: null,
            waiting: false,
            late: false,
            pendingSectors: [],
          },
          entries: [
            entry(
              'opened',
              'abriu o processo',
              this.session().activeMembership.displayName,
              this.actor.id,
            ),
          ],
          notifications: {
            sent: 3,
            pending: 0,
            failed: 0,
            uncertain: 0,
            sending: 0,
            skipped: 0,
          },
          permissions,
        }
        process.etapas = stagesOf(process)
        fixtureSnapshot(process, 'andamento', 0, ['com'])
        this.state.processes.unshift(process)
        this.state.openings[key] = {
          id: process.id,
          body: JSON.stringify(body),
        }
        this.save()
        return json(this.project(process), 201, process.version)
      }
      const match = /^processes\/([^/]+)(?:\/(.*))?$/.exec(path)
      if (match) {
        const process = processes.find((p) => p.id === match[1])
        const action = match[2] ?? ''
        if (!process)
          return error(404, 'Processo não encontrado na demonstração.')
        if (method === 'GET') {
          if (action === 'entries') {
            const invalid = queryError(url, ['kind', 'page', 'pageSize'])
            if (invalid) return error(400, invalid)
            const kind = url.searchParams.get('kind')
            if (kind !== null && kind !== 'note' && kind !== 'event')
              return error(400, 'Tipo de entrada inválido.')
            const entries = process.entries
              .filter((item) => !item.financial || permissions.viewFinancial)
              .filter(
                (item) => item.kind !== 'alert_sent' || permissions.create,
              )
              .filter(
                (item) =>
                  !kind ||
                  (kind === 'note'
                    ? item.kind === 'note'
                    : item.kind !== 'note'),
              )
              .slice()
              .reverse()
              .sort((a, b) => b.em.localeCompare(a.em))
            const page = paginated(entries, url)
            if (
              Number(url.searchParams.get('page') ?? 1) > 1 &&
              !page.results.length
            )
              return error(404, 'Página não encontrada.')
            return json(page)
          }
          if (action) return error(404, 'Recurso não encontrado no preview.')
          return json(this.project(process), 200, process.version)
        }
        if (body.version !== process.version)
          return error(
            409,
            'Outra operação alterou o processo. Recarregue e tente novamente.',
          )
        const author = this.session().activeMembership.displayName
        if (!action && method === 'DELETE') {
          if (!permissions.delete)
            return error(403, 'Somente a Diretoria exclui processos.')
          this.state.processes = processes.filter((p) => p.id !== process.id)
          this.save()
          return json(null, 204)
        }
        if (!action && method === 'PATCH') {
          if (!permissions.edit || process.status === 'cancelado')
            return error(403, 'Este perfil não pode editar o processo.')
          if (
            Object.keys(body).some(
              (key) =>
                key !== 'version' &&
                !(editableFields as readonly string[]).includes(key),
            )
          )
            return error(
              400,
              'A edição contém campos não aceitos pelo contrato.',
            )
          if ('empresa' in body && !String(body.empresa ?? '').trim())
            return error(400, 'Informe a empresa.')
          const { version: _version, ...patch } = body
          void _version
          Object.assign(process, patch)
          process.entries.push(
            entry(
              'edited',
              'editou os dados do processo',
              author,
              this.actor.id,
              false,
              { fields: Object.keys(patch) },
            ),
          )
        } else if (action === 'notes') {
          if (!permissions.note || !String(body.text ?? '').trim())
            return error(400, 'Escreva o comentário.')
          if (String(body.text).trim().length > 5000)
            return error(400, 'O comentário aceita até 5000 caracteres.')
          process.entries.push(
            entry(
              'note',
              String(body.text).trim(),
              author,
              this.actor.id,
              permissions.viewFinancial,
            ),
          )
        } else if (action === 'cancel') {
          if (!permissions.cancel)
            return error(403, 'Somente a Diretoria cancela processos.')
          if (!openStatuses.includes(process.status))
            return error(409, 'Somente processos abertos podem ser cancelados.')
          const from = process.status
          process.resumeSnapshot = {
            status: process.status,
            stage: process.analysis.currentStage,
            sectors: [...process.responsibleSectors],
            releaseDate: process.analysis.releaseDate,
          }
          process.atualizadoEm = now()
          fixtureSnapshot(
            process,
            'cancelado',
            process.analysis.currentStage,
            [],
          )
          process.entries.push(
            entry(
              'status_changed',
              'cancelou o processo',
              author,
              this.actor.id,
              false,
              { from, to: 'cancelado', trigger: 'command' },
            ),
          )
        } else if (action === 'reopen') {
          if (!permissions.reopen)
            return error(403, 'Somente a Diretoria reabre processos.')
          if (!['concluido', 'cancelado'].includes(process.status))
            return error(409, 'Este processo já está aberto.')
          const from = process.status
          if (process.status === 'concluido') {
            const last = process.etapas
              .flatMap((s) => s.tasks)
              .filter((t) => !t.auto && !t.campo)
              .at(-1)
            if (last) delete process.tarefas[last.id]
          }
          const resume = process.resumeSnapshot ?? {
            status: 'andamento' as const,
            stage:
              process.status === 'concluido' ? process.etapas.length - 1 : 0,
            sectors: ['fin'] as ProcessSector[],
            releaseDate: null,
          }
          process.atualizadoEm = now()
          fixtureSnapshot(
            process,
            resume.status,
            resume.stage,
            resume.sectors,
            resume.releaseDate,
          )
          delete process.resumeSnapshot
          process.entries.push(
            entry(
              'status_changed',
              'reabriu o processo',
              author,
              this.actor.id,
              false,
              { from, to: process.status, trigger: 'command' },
            ),
          )
        } else if (action === 'notifications/retry') {
          if (!permissions.create)
            return error(403, 'Somente a Diretoria acompanha as notificações.')
          const counts = process.notifications ?? {}
          counts.sent =
            (counts.sent ?? 0) + (counts.pending ?? 0) + (counts.failed ?? 0)
          counts.pending = 0
          counts.failed = 0
          process.notifications = counts
          process.entries.push(
            entry(
              'email_retry',
              'simulou nova tentativa dos e-mails pendentes',
              author,
              this.actor.id,
            ),
          )
        } else if (/^tasks\/.+\/transition$/.test(action)) {
          if (!['feito', 'na', 'pending'].includes(String(body.state)))
            return error(400, 'Transição de tarefa inválida.')
          const id = action.split('/')[1]!
          const stageIndex = process.etapas.findIndex((s) =>
            s.tasks.some((t) => t.id === id),
          )
          const task = process.etapas[stageIndex]?.tasks.find(
            (t) => t.id === id,
          )
          if (!task || !permissions.executeSectors.includes(task.d))
            return error(403, 'Tarefa de outro setor.')
          if (
            task.auto ||
            !['andamento', 'atrasado', 'concluido'].includes(process.status)
          )
            return error(409, 'Esta tarefa não pode ser alterada.')
          if (body.state === 'pending') {
            process.etapas.slice(stageIndex + 1).forEach((s) =>
              s.tasks.forEach((t) => {
                delete process.tarefas[t.id]
              }),
            )
            delete process.tarefas[id]
          } else {
            if (
              !['andamento', 'atrasado'].includes(process.status) ||
              stageIndex !== process.analysis.currentStage
            )
              return error(
                409,
                'Conclua a etapa anterior ou aguarde a data de liberação.',
              )
            if (body.state === 'na' && !task.opt)
              return error(400, 'Esta tarefa é obrigatória.')
            process.tarefas[id] = {
              s: body.state === 'na' ? 'na' : 'feito',
              por: this.actor.id,
              autor: author,
              em: now(),
            }
          }
          process.entries.push(
            entry(
              'task',
              `${body.state === 'pending' ? 'reabriu' : 'concluiu'}: ${task.txt}`,
              author,
              this.actor.id,
            ),
          )
          const currentStage = process.etapas[stageIndex]!
          if (body.state === 'pending') {
            // Explicit preview reopening response; no calendar evaluation.
            fixtureSnapshot(process, 'andamento', stageIndex, [task.d])
          } else if (
            currentStage.tasks.every((item) => !!process.tarefas[item.id])
          ) {
            const snapshot = commandFixtures[process.tipo]?.[stageIndex]
            if (snapshot) {
              const from = process.status
              fixtureSnapshot(
                process,
                snapshot.status,
                snapshot.stage,
                snapshot.sectors,
                snapshot.status === 'agendado' ? date(90) : null,
              )
              if (from !== process.status)
                process.entries.push(
                  entry(
                    'status_changed',
                    'atualizou a situação do processo',
                    author,
                    this.actor.id,
                    false,
                    { from, to: process.status, trigger: 'command' },
                  ),
                )
            } else {
              // Other workflows have fixed snapshots; the preview does not
              // reproduce the production domain engine for unsupported paths.
              process.analysis.completedTasks = Object.keys(
                process.tarefas,
              ).length
            }
          } else {
            process.analysis.completedTasks = Object.keys(
              process.tarefas,
            ).length
            process.responsibleSectors = [
              ...new Set(
                currentStage.tasks
                  .filter((item) => !process.tarefas[item.id])
                  .map((item) => item.d),
              ),
            ]
            process.analysis.pendingSectors = [...process.responsibleSectors]
          }
        } else if (action || method !== 'PATCH')
          return error(404, 'Operação não encontrada no preview.')
        if (action !== 'notes' && action !== 'notifications/retry')
          this.closeCommunicationSituations(
            process,
            method === 'PATCH' && 'prazo' in body,
          )
        process.version++
        process.atualizadoEm = now()
        this.save()
        return json(this.project(process), 200, process.version)
      }
    }
    return this.routines(path, method, body, headers, url, json, error)
  }

  private routines(
    path: string,
    method: string,
    body: Body,
    headers: Headers,
    url: URL,
    json: (data: unknown, status?: number, version?: number) => Response,
    error: (status: number, detail: string) => Response,
  ): Response {
    if (path === 'departments')
      return json({
        count: departments.length,
        next: null,
        results: departments,
      })
    const companies = this.state.clientCompanies ?? seedClientCompanies()
    const routines = ['Apuração de impostos', 'Entrega de declarações'].map(
      (name, index) => ({
        id: `demo-routine-${index}`,
        departmentId: 'demo-fiscal',
        name,
        shotname: ['IMP', 'DEC'][index],
        archivedAt: null,
        createdAt: stamp(-100),
        currentVersion: {
          id: `version-${index}`,
          version: 1,
          description: 'Rotina demonstrativa do escritório.',
          recurrence: 'monthly',
          defaultDueDays: 20,
          defaultAssigneeMemberId: 'demo-rotinas',
          recurrenceMonths: [],
        },
      }),
    )
    if (path === 'client-companies') {
      if (method === 'GET') {
        if (url.searchParams.has('includeArchived'))
          return error(400, 'Use status para filtrar empresas.')
        const statuses = url.searchParams.getAll('status')
        const selected = statuses.length ? statuses : ['active']
        const results = companies.filter((company) =>
          selected.includes(
            company.status ?? (company.archivedAt ? 'archived' : 'active'),
          ),
        )
        return json({
          count: results.length,
          next: null,
          previous: null,
          results,
        })
      }
      if (method !== 'POST')
        return error(405, 'Operação indisponível para empresas.')
      if (!['owner', 'admin'].includes(this.actor.role))
        return error(403, 'Somente administradores cadastram empresas.')
      if (
        Object.keys(body).some(
          (key) =>
            ![
              'code',
              'name',
              'legalName',
              'cnpj',
              'email',
              'mobilePhone',
              'taxRegime',
            ].includes(key),
        )
      )
        return error(400, 'O cadastro contém campos não aceitos.')
      const name = String(body.name ?? '').trim()
      if (!name) return error(400, 'Informe o nome da empresa.')
      const company: ClientCompanyResource = {
        id: crypto.randomUUID(),
        code: String(body.code ?? '').trim() || null,
        name,
        legalName: String(body.legalName ?? '').trim(),
        cnpj: String(body.cnpj ?? '').trim(),
        email: String(body.email ?? '').trim(),
        mobilePhone: String(body.mobilePhone ?? '').trim(),
        taxRegime: String(body.taxRegime ?? '').trim(),
        status: 'active',
        version: 1,
        archivedAt: null,
        createdAt: now(),
        updatedAt: now(),
      }
      companies.unshift(company)
      this.state.clientCompanies = companies
      this.save()
      return json(company, 201, company.version)
    }
    if (path === 'routines')
      return json({ count: routines.length, next: null, results: routines })
    const screen = {
      id: 'demo-screen',
      name: 'Planilha Fiscal',
      type: 'spreadsheet',
      departmentId: 'demo-fiscal',
      departmentName: 'Fiscal',
      position: 1,
      version: 1,
      archivedAt: null,
      createdAt: stamp(-100),
      updatedAt: now(),
      companies: companies.map((c, i) => ({ ...c, position: i + 1 })),
      routines: routines.map((r, i) => ({ ...r, position: i + 1 })),
    }
    if (path === 'screens')
      return json({ count: 1, next: null, results: [screen] })
    if (path === 'screens/demo-screen') return json(screen)
    const period =
      /by-period\/([^/]+)/.exec(path)?.[1] ??
      url.searchParams.get('period') ??
      month()
    const occurrences: ScheduledOccurrence[] = companies.flatMap((company, i) =>
      routines.map((routine, j) => {
        const id = `demo-occurrence-${i}-${j}`
        const key = `${period}:${id}`
        return {
          attachmentCount: 0,
          occurrenceKey: id,
          taskId: null,
          etag: '"1"',
          persistence: 'virtual',
          referenceMonth: period,
          kind: 'scheduled',
          departmentId: 'demo-fiscal',
          departmentName: 'Fiscal',
          clientCompanyId: company.id,
          companyCode: company.code,
          companyName: company.name,
          companyLegalName: company.legalName,
          routineId: routine.id,
          routineVersionId: `version-${j}`,
          sourceAssignmentId: `assignment-${i}-${j}`,
          routineShotname: routine.shotname!,
          routineName: routine.name,
          routineVersionNumber: 1,
          routineDescription: 'Exemplo da operação de Rotinas.',
          title: routine.name,
          description: 'Dados fictícios para navegar entre os módulos.',
          observation: '',
          links: [],
          dueDate: `${period}-20`,
          status: (this.state.routineStates[key] ??
            ['completed', 'in_progress', 'pending'][
              (i + j) % 3
            ]) as ScheduledOccurrence['status'],
          assignee: { id: 'demo-rotinas', displayName: 'Clara' },
          sourceRevision: 1,
          version: null,
          materializationReason: null,
          materializedAt: null,
          archivedAt: null,
          createdAt: null,
          updatedAt: null,
          isOverdue: false,
        }
      }),
    )
    if (path === 'screens/demo-screen/projection')
      return json({
        type: 'spreadsheet',
        screen,
        competenceId: null,
        period,
        rows: screen.companies,
        columns: screen.routines,
        cells: companies.flatMap((company) =>
          routines.map((routine) => ({
            companyId: company.id,
            routineId: routine.id,
            tasks: occurrences.filter(
              (t) =>
                t.clientCompanyId === company.id && t.routineId === routine.id,
            ),
          })),
        ),
      })
    const occurrenceMatch =
      /^competences\/by-period\/[^/]+\/task-occurrences\/([^/]+)(?:\/(transition))?$/.exec(
        path,
      )
    if (occurrenceMatch) {
      const occurrence = occurrences.find(
        (t) => t.occurrenceKey === occurrenceMatch[1],
      )
      if (!occurrence) return error(404, 'Tarefa não encontrada.')
      if (method !== 'GET') {
        if (body.targetStatus)
          occurrence.status = body.targetStatus as ScheduledOccurrence['status']
        this.state.routineStates[`${period}:${occurrence.occurrenceKey}`] =
          occurrence.status
        this.save()
      }
      return json(occurrence, 200, 1)
    }
    if (/^competences\/by-period\/[^/]+\/task-occurrences$/.test(path))
      return json({ next: null, previous: null, results: occurrences })
    if (/^competences\/by-period\/[^/]+$/.test(path))
      return json({
        id: null,
        period,
        status: 'projected',
        persistence: 'virtual',
        version: null,
        taskOccurrenceCount: occurrences.length,
        scheduleRevision: 1,
        warning: null,
      })
    if (
      path.includes('/attachments') ||
      path.endsWith('/assignees') ||
      path.endsWith('/tasks')
    )
      return json({ count: 0, next: null, previous: null, results: [] })
    const companyMatch = /^client-companies\/([^/]+)(\/restore)?$/.exec(path)
    if (companyMatch) {
      const company = companies.find((item) => item.id === companyMatch[1])
      if (!company) return error(404, 'Empresa não encontrada.')
      if (method === 'GET' && !companyMatch[2])
        return json(company, 200, company.version)
      if (!['owner', 'admin'].includes(this.actor.role))
        return error(403, 'Somente administradores editam empresas.')
      const expected = `"${company.version}"`
      if (headers.get('If-Match') !== expected)
        return error(
          409,
          'A empresa foi atualizada. Recarregue e tente novamente.',
        )
      if (companyMatch[2] && method === 'POST') {
        company.archivedAt = null
        company.status = 'active'
        company.version++
        company.updatedAt = now()
        this.save()
        return json(company, 200, company.version)
      }
      if (method === 'PATCH') {
        if (
          Object.keys(body).some(
            (key) =>
              ![
                'code',
                'name',
                'legalName',
                'cnpj',
                'email',
                'mobilePhone',
                'taxRegime',
              ].includes(key),
          )
        )
          return error(400, 'A edição contém campos não aceitos.')
        if ('name' in body && !String(body.name ?? '').trim())
          return error(400, 'Informe o nome da empresa.')
        if ('code' in body)
          company.code = String(body.code ?? '').trim() || null
        if ('name' in body) company.name = String(body.name).trim()
        if ('legalName' in body)
          company.legalName = String(body.legalName ?? '').trim()
        if ('cnpj' in body) company.cnpj = String(body.cnpj ?? '').trim()
        if ('email' in body) company.email = String(body.email ?? '').trim()
        if ('mobilePhone' in body)
          company.mobilePhone = String(body.mobilePhone ?? '').trim()
        if ('taxRegime' in body)
          company.taxRegime = String(body.taxRegime ?? '').trim()
        company.version++
        company.updatedAt = now()
        this.save()
        return json(company, 200, company.version)
      }
      if (method === 'DELETE') {
        company.archivedAt = now()
        company.status = 'archived'
        company.version++
        company.updatedAt = now()
        this.save()
        return json(null, 204, company.version)
      }
      return error(405, 'Operação indisponível para empresas.')
    }
    if (path.startsWith('files/'))
      return error(
        400,
        'Uploads não enviam arquivos neste preview. Use os fluxos de Processos e as configurações de acesso.',
      )
    return error(
      404,
      'Este recurso não faz parte da demonstração das novas funcionalidades.',
    )
  }
}

let installed: PreviewBackend | undefined
export function installPreviewBackend() {
  if (installed) return installed
  let store: Store | undefined
  try {
    // Demonstration data is fictional and stays within this browser session.
    store = window.sessionStorage
  } catch {
    /* Storage pode estar bloqueado. */
  }
  const backend = new PreviewBackend(store)
  const nativeFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    )
    if (!url.pathname.startsWith('/api/v1/')) return nativeFetch(input, init)
    const signal =
      init?.signal ?? (input instanceof Request ? input.signal : undefined)
    signal?.throwIfAborted()
    await new Promise((resolve) => setTimeout(resolve, 60))
    signal?.throwIfAborted()
    const text =
      typeof init?.body === 'string'
        ? init.body
        : input instanceof Request
          ? await input.clone().text()
          : ''
    const body = text ? (JSON.parse(text) as Body) : {}
    return backend.handle(
      url,
      init?.method ?? (input instanceof Request ? input.method : 'GET'),
      body,
      new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      ),
    )
  }
  if (location.pathname === '/') history.replaceState(null, '', '/hub')
  installed = backend
  return backend
}
