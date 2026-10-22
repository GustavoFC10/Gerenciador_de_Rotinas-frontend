import type { OrganizationMemberResource } from '../services/organizationMemberService'
import workflows from './workflows.json'
import type {
  ModuleAccessConfiguration,
  ModuleAccess,
  ModuleSummary,
} from '../types/modules'
import type { OrganizationRole, ScheduledOccurrence } from '../types/domain'
import type {
  ProcessCatalogType,
  ProcessCreateInput,
  ProcessEntry,
  ProcessFields,
  ProcessMovementMonth,
  ProcessPermissions,
  ProcessResource,
  ProcessSector,
  ProcessStage,
} from '../types/processes'
import { centsToDecimal, decimalToCents } from '../utils/processMoney'

const types = workflows as ProcessCatalogType[]
const sectors = { com: 'Diretoria', fin: 'Financeiro', reg: 'Regularidade' }
const storageKey = 'routine-manager.features-preview.v1'
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
  members?: Record<string, OrganizationMemberResource>
  schema: 1
  actor: string
  authenticated: boolean
  accesses: Record<string, ModuleAccess[]>
  processes: ProcessResource[]
  openings: Record<string, { body: string; id: string }>
  routineStates: Record<string, string>
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
function fieldReady(process: ProcessResource, field: string) {
  if (field === 'regime') return !!process.regime
  if (field === 'honorario')
    return (
      process.honorario != null &&
      !!process.honCobranca &&
      (!process.trab || (!!process.trabQtd && process.trabValor != null)) &&
      (process.tipo !== 'inativa' || process.honAnterior != null)
    )
  return process.custo != null && !!process.pagador && !!process.parcelas
}
function analyze(process: ProcessResource) {
  process.etapas = stagesOf(process)
  const ids = new Set(
    process.etapas.flatMap((stage) => stage.tasks.map((task) => task.id)),
  )
  for (const key of Object.keys(process.tarefas))
    if (!ids.has(key)) delete process.tarefas[key]
  for (const task of process.etapas.flatMap((stage) => stage.tasks)) {
    if (task.auto || (task.campo && fieldReady(process, task.campo)))
      process.tarefas[task.id] ??= {
        s: 'feito',
        por: process.criadoPor,
        autor: process.autorAbertura,
        em: process.criadoEm,
        ...(task.auto ? { auto: true } : {}),
      }
    else if (task.campo) delete process.tarefas[task.id]
  }
  for (const stage of process.etapas)
    stage.completed = stage.tasks.every((task) => !!process.tarefas[task.id])
  const current = process.etapas.findIndex((stage) => !stage.completed)
  let release: string | null = null
  const stage = process.etapas[current]
  if (current > 0 && stage?.espera) {
    const last = process.etapas[current - 1]!.tasks.map(
      (task) => process.tarefas[task.id]?.em ?? '',
    )
      .sort()
      .at(-1)
    if (last) {
      const base = new Date(last)
      const day = base.getDate()
      base.setMonth(base.getMonth() + stage.espera)
      if (base.getDate() < day) base.setDate(0)
      release = base.toISOString().slice(0, 10)
    }
  }
  const waiting =
    process.status !== 'cancelado' && !!release && release > date()
  if (process.status !== 'cancelado') {
    process.status = current < 0 ? 'concluido' : 'andamento'
    process.concluidoEm = current < 0 ? (process.concluidoEm ?? now()) : null
  }
  process.analysis = {
    currentStage: current < 0 ? null : current,
    totalTasks: process.etapas.flatMap((stage) => stage.tasks).length,
    completedTasks: process.etapas
      .flatMap((stage) => stage.tasks)
      .filter((task) => !!process.tarefas[task.id]).length,
    releaseDate: waiting ? release : null,
    waiting,
    late:
      process.status === 'andamento' &&
      !waiting &&
      !!process.prazo &&
      process.prazo < date(),
    pendingSectors:
      process.status === 'andamento' && !waiting && stage
        ? [
            ...new Set(
              stage.tasks
                .filter((task) => !process.tarefas[task.id])
                .map((task) => task.d),
            ),
          ]
        : [],
  }
  return process
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
  const processes = types.map((type, index): ProcessResource => {
    const process: ProcessResource = {
      id: `demo-process-${type.id}`,
      organizationId: organization.id,
      tipo: type.id,
      empresa: names[index]!,
      codigo: `${type.sigla}-DEMO-${String(index + 1).padStart(3, '0')}`,
      cnpj: '12.345.678/0001-95',
      protocolo: `PROTO-DEMO-${100 + index}`,
      status: index === 8 ? 'cancelado' : 'andamento',
      version: 1,
      workflowVersion: 1,
      criadoPor: 'demo-diretoria',
      autorAbertura: 'Ana Souza',
      criadoEm: stamp(-24 - index),
      atualizadoEm: stamp(-1),
      concluidoEm: index === 8 ? stamp(-2) : null,
      prazo: index === 1 ? date(-8) : date(12 + index),
      tarefas: {},
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
      notas: [
        entry(
          'note',
          'Documentação recebida. A equipe pode seguir com a próxima etapa.',
          'Bruno Lima',
          'demo-regularidade',
        ),
      ],
      historico: [entry('opened', 'abriu o processo')],
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
    analyze(process)
    const completedStages =
      index === 6
        ? process.etapas.length - 1
        : index === 7
          ? process.etapas.length
          : index === 2
            ? 1
            : 0
    process.etapas.slice(0, completedStages).forEach((stage) =>
      stage.tasks.forEach((task) => {
        process.tarefas[task.id] = {
          s: 'feito',
          por: task.d === 'reg' ? 'demo-regularidade' : 'demo-financeiro',
          autor: task.d === 'reg' ? 'Bruno Lima' : 'Marina Costa',
          em: stamp(index === 7 ? -3 : -9),
        }
      }),
    )
    return analyze(process)
  })
  const past = structuredClone(processes[0]!)
  past.id = 'demo-process-anterior'
  past.empresa = 'Tecnologia Horizonte'
  past.codigo = 'ABE-DEMO-ANT'
  past.criadoEm = `${previousMonth(month(), -1)}-08T12:00:00-03:00`
  past.honorario = '2600.00'
  past.trab = false
  processes.push(past)
  return {
    schema: 1,
    actor: 'demo-diretoria',
    authenticated: true,
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
  constructor(private readonly store?: Store) {
    try {
      const saved = JSON.parse(
        store?.getItem(storageKey) ?? 'null',
      ) as PreviewState | null
      this.state =
        saved?.schema === 1 &&
        saved.processes &&
        previewPersonas.some((p) => p.id === saved.actor)
          ? saved
          : seed()
    } catch {
      this.state = seed()
    }
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
  project(raw: ProcessResource): ProcessResource {
    const process = structuredClone(analyze(raw))
    process.permissions = this.permissions()
    process.notas = process.notas.filter(
      (item) => !item.financial || process.permissions.viewFinancial,
    )
    process.historico = process.historico.filter(
      (item) => !item.financial || process.permissions.viewFinancial,
    )
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
    if (path.startsWith('processes')) {
      const permissions = this.permissions()
      if (!permissions.read)
        return error(
          403,
          'Este perfil não tem acesso a Processos. Troque o perfil nas opções do preview.',
        )
      if (path === 'processes/catalog')
        return json({ workflowVersion: 1, types, sectors, permissions })
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
      const processes = this.state.processes.map((p) => analyze(p))
      if (path === 'processes/indicators')
        return json({
          total: processes.length,
          active: processes.filter((p) => p.status === 'andamento').length,
          completed: processes.filter((p) => p.status === 'concluido').length,
          cancelled: processes.filter((p) => p.status === 'cancelado').length,
          late: processes.filter((p) => p.analysis.late).length,
          waiting: processes.filter((p) => p.analysis.waiting).length,
          bySector: Object.fromEntries(
            Object.keys(sectors).map((sector) => [
              sector,
              processes.filter((p) =>
                p.analysis.pendingSectors.includes(sector as ProcessSector),
              ).length,
            ]),
          ),
          byType: Object.fromEntries(
            types.map((type) => [
              type.id,
              processes.filter((p) => p.tipo === type.id).length,
            ]),
          ),
        })
      if (path === 'processes' && method === 'GET')
        return json({
          count: processes.length,
          next: null,
          previous: null,
          results: processes.map((p) => this.project(p)),
        })
      if (path === 'processes' && method === 'POST') {
        if (!permissions.create)
          return error(403, 'Somente a Diretoria abre processos.')
        const key = headers.get('Idempotency-Key') ?? ''
        if (!key) return error(400, 'Faltou a chave da abertura.')
        const replay = this.state.openings[key]
        if (replay) {
          const existing = processes.find((p) => p.id === replay.id)
          return existing && replay.body === JSON.stringify(body)
            ? json(this.project(existing))
            : error(409, 'A chave de abertura já foi usada para outros dados.')
        }
        const input = body as unknown as ProcessCreateInput
        const type = types.find((t) => t.id === input.tipo)
        if (!type || !input.empresa?.trim())
          return error(400, 'Escolha o tipo e informe a empresa.')
        const process: ProcessResource = {
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
          workflowVersion: 1,
          tarefas: {},
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
          notas: [],
          historico: [
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
        this.state.processes.unshift(analyze(process))
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
        if (method === 'GET')
          return json(this.project(process), 200, process.version)
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
          const { version: _version, ...patch } = body
          void _version
          Object.assign(process, patch)
          process.historico.push(
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
          process.notas.push(
            entry(
              'note',
              String(body.text).trim(),
              author,
              this.actor.id,
              permissions.viewFinancial,
            ),
          )
        } else if (action === 'cancel') {
          if (!permissions.cancel || process.status !== 'andamento')
            return error(409, 'Só processos em andamento podem ser cancelados.')
          process.status = 'cancelado'
          process.concluidoEm = now()
          process.historico.push(
            entry('cancelled', 'cancelou o processo', author, this.actor.id),
          )
        } else if (action === 'reopen') {
          if (!permissions.reopen)
            return error(403, 'Somente a Diretoria reabre processos.')
          if (process.status === 'concluido') {
            const last = process.etapas
              .flatMap((s) => s.tasks)
              .filter((t) => !t.auto && !t.campo)
              .at(-1)
            if (last) delete process.tarefas[last.id]
          }
          process.status = 'andamento'
          process.concluidoEm = null
          process.historico.push(
            entry('reopened', 'reabriu o processo', author, this.actor.id),
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
          process.historico.push(
            entry(
              'email_retry',
              'simulou nova tentativa dos e-mails pendentes',
              author,
              this.actor.id,
            ),
          )
        } else if (/^tasks\/.+\/transition$/.test(action)) {
          const id = action.split('/')[1]!
          const stageIndex = process.etapas.findIndex((s) =>
            s.tasks.some((t) => t.id === id),
          )
          const task = process.etapas[stageIndex]?.tasks.find(
            (t) => t.id === id,
          )
          if (!task || !permissions.executeSectors.includes(task.d))
            return error(403, 'Tarefa de outro setor.')
          if (task.auto || process.status === 'cancelado')
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
              process.analysis.waiting ||
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
          process.historico.push(
            entry(
              'task',
              `${body.state === 'pending' ? 'reabriu' : 'concluiu'}: ${task.txt}`,
              author,
              this.actor.id,
            ),
          )
        } else if (action || method !== 'PATCH')
          return error(404, 'Operação não encontrada no preview.')
        process.version++
        process.atualizadoEm = now()
        analyze(process)
        this.save()
        return json(this.project(process), 200, process.version)
      }
    }
    return this.routines(path, method, body, url, json, error)
  }

  private routines(
    path: string,
    method: string,
    body: Body,
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
    const companies = [
      'Aurora Alimentos',
      'Clínica Bem Viver',
      'Solar Engenharia',
    ].map((name, index) => ({
      id: `demo-company-${index}`,
      code: `00${index + 1}`,
      name,
      legalName: `${name} Ltda.`,
      cnpj: '12.345.678/0001-95',
      email: 'cliente@preview.example',
      mobilePhone: '11999990000',
      taxRegime: 'Simples Nacional',
      archivedAt: null,
      createdAt: stamp(-100),
    }))
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
    if (path === 'client-companies')
      return json({ count: companies.length, next: null, results: companies })
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
    if (/^client-companies\/[^/]+$/.test(path))
      return json(
        companies.find((c) => c.id === path.split('/')[1]) ?? companies[0],
      )
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
    store = window.localStorage
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
