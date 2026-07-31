import type {
  Client,
  ClientRoutineLink,
  Department,
  DepartmentDivision,
  DivisionRoutineLink,
  Employee,
  Routine,
  RoutineControlResponse,
  RoutineStatus,
  Task,
  TaskAttachment,
  TaskLink,
} from '../types/domain'

const fiscalDepartment: Department = { id: 'dept-fiscal', name: 'Fiscal' }

const fiscalDivisionIds = {
  MEI: 'division-fiscal-mei',
  SIMPLES_NACIONAL: 'division-fiscal-simples-nacional',
  LUCRO_PRESUMIDO: 'division-fiscal-lucro-presumido',
} as const

const fiscalDivisions: DepartmentDivision[] = [
  {
    id: fiscalDivisionIds.MEI,
    departmentId: fiscalDepartment.id,
    name: 'MEI',
    slug: 'mei',
    description: 'Empresas atendidas pelo fluxo fiscal de MEI.',
    position: 1,
    active: true,
  },
  {
    id: fiscalDivisionIds.SIMPLES_NACIONAL,
    departmentId: fiscalDepartment.id,
    name: 'Simples Nacional',
    slug: 'simples-nacional',
    description: 'Empresas atendidas pelo fluxo fiscal do Simples Nacional.',
    position: 2,
    active: true,
  },
  {
    id: fiscalDivisionIds.LUCRO_PRESUMIDO,
    departmentId: fiscalDepartment.id,
    name: 'Lucro Presumido',
    slug: 'lucro-presumido',
    description: 'Empresas atendidas pelo fluxo fiscal de Lucro Presumido.',
    position: 3,
    active: true,
  },
]

const clientFiscalDivisionIds = [
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.MEI,
  fiscalDivisionIds.LUCRO_PRESUMIDO,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.LUCRO_PRESUMIDO,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.MEI,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.MEI,
  fiscalDivisionIds.MEI,
  fiscalDivisionIds.LUCRO_PRESUMIDO,
  fiscalDivisionIds.LUCRO_PRESUMIDO,
  fiscalDivisionIds.MEI,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.LUCRO_PRESUMIDO,
  fiscalDivisionIds.LUCRO_PRESUMIDO,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.SIMPLES_NACIONAL,
  fiscalDivisionIds.LUCRO_PRESUMIDO,
  fiscalDivisionIds.MEI,
  fiscalDivisionIds.MEI,
  fiscalDivisionIds.LUCRO_PRESUMIDO,
] as const

const clients: Client[] = [
  { id: 'client-001', code: '001', name: 'Aurora Comércio Ltda.' },
  { id: 'client-002', code: '002', name: 'Bento Arquitetura' },
  { id: 'client-003', code: '003', name: 'Cais Tecnologia S.A.' },
  { id: 'client-004', code: '004', name: 'Dália Serviços Médicos' },
  { id: 'client-005', code: '005', name: 'Estrela Alimentos Eireli' },
  { id: 'client-006', code: '006', name: 'Forte Engenharia Ltda.' },
  { id: 'client-007', code: '007', name: 'Granito Transportes' },
  { id: 'client-008', code: '008', name: 'Horizonte Clínica Popular' },
  { id: 'client-009', code: '009', name: 'Ipiranga Serviços Digitais' },
  { id: 'client-010', code: '010', name: 'Jardim Móveis Planejados' },
  { id: 'client-011', code: '011', name: 'Kairos Consultoria' },
  { id: 'client-012', code: '012', name: 'Lumina Eventos' },
  { id: 'client-013', code: '013', name: 'Matriz Soluções Industriais' },
  { id: 'client-014', code: '014', name: 'Norte Comércio Atacadista' },
  { id: 'client-015', code: '015', name: 'Oliva Restaurante Ltda.' },
  { id: 'client-016', code: '016', name: 'Polo Educacional' },
  { id: 'client-017', code: '017', name: 'Quartzo Materiais' },
  { id: 'client-018', code: '018', name: 'Rota Logística Integrada' },
  { id: 'client-019', code: '019', name: 'Solar Energia e Serviços' },
  { id: 'client-020', code: '020', name: 'Tessitura Modas Ltda.' },
  { id: 'client-021', code: '021', name: 'União Farma Popular' },
  { id: 'client-022', code: '022', name: 'Vale Verde Agro' },
  { id: 'client-023', code: '023', name: 'W3 Sistemas Contábeis' },
  { id: 'client-024', code: '024', name: 'Xavier Manutenção Predial' },
  { id: 'client-025', code: '025', name: 'Zeta Participações' },
].map((client, index) => {
  const divisionId = clientFiscalDivisionIds[index]

  return {
    ...client,
    code: String(index + 1).padStart(4, '0'),
    legalName: client.name,
    document: buildMockCnpj(index),
    email: `contato.${String(index + 1).padStart(4, '0')}@example.com`,
    phone: `(21) 3000-${String(index + 1).padStart(4, '0')}`,
    taxRegime:
      divisionId === fiscalDivisionIds.MEI
        ? 'mei'
        : divisionId === fiscalDivisionIds.SIMPLES_NACIONAL
          ? 'simples_nacional'
          : 'lucro_presumido',
    divisionAssignments: [
      {
        id: `assignment-${client.id}-${divisionId}`,
        departmentId: fiscalDepartment.id,
        divisionId,
      },
    ],
    active: true,
  }
})

const routines: Routine[] = [
  {
    id: 'routine-importar-notas-entrada',
    departmentId: fiscalDepartment.id,
    name: 'Importar notas de entrada',
    shortName: 'Importar entrada',
    description: 'Importação das notas fiscais de entrada do período.',
    recurrence: 'monthly',
    defaultDueDay: 8,
    active: true,
  },
  {
    id: 'routine-lancar-notas-entrada',
    departmentId: fiscalDepartment.id,
    name: 'Lançar notas de entrada',
    shortName: 'Lançar entrada',
    description: 'Lançamento e conferência das notas fiscais de entrada.',
    recurrence: 'monthly',
    defaultDueDay: 10,
    active: true,
  },
  {
    id: 'routine-importar-notas-saida',
    departmentId: fiscalDepartment.id,
    name: 'Importar notas de saída',
    shortName: 'Importar saída',
    description: 'Importação das notas fiscais de saída do período.',
    recurrence: 'monthly',
    defaultDueDay: 8,
    active: true,
  },
  {
    id: 'routine-lancar-notas-saida',
    departmentId: fiscalDepartment.id,
    name: 'Lançar notas de saída',
    shortName: 'Lançar saída',
    description: 'Lançamento e conferência das notas fiscais de saída.',
    recurrence: 'monthly',
    defaultDueDay: 12,
    active: true,
  },
  {
    id: 'routine-conferir-faturamento-mei',
    departmentId: fiscalDepartment.id,
    name: 'Conferir faturamento MEI',
    shortName: 'Conferir faturamento',
    description: 'Conferência do faturamento acumulado e do limite do MEI.',
    recurrence: 'monthly',
    defaultDueDay: 15,
    active: true,
  },
  {
    id: 'routine-gerar-das-mei',
    departmentId: fiscalDepartment.id,
    name: 'Gerar DAS-MEI',
    shortName: 'Gerar DAS-MEI',
    description: 'Apuração e emissão mensal do DAS-MEI.',
    recurrence: 'monthly',
    defaultDueDay: 20,
    active: true,
  },
  {
    id: 'routine-dasn-simei',
    departmentId: fiscalDepartment.id,
    name: 'Transmitir DASN-SIMEI',
    shortName: 'DASN-SIMEI',
    description: 'Preparação e transmissão da declaração anual do MEI.',
    recurrence: 'annual',
    recurrenceMonths: [5],
    defaultDueDay: 31,
    active: true,
  },
  {
    id: 'routine-apurar-simples-nacional',
    departmentId: fiscalDepartment.id,
    name: 'Apurar Simples Nacional',
    shortName: 'Apurar Simples',
    description: 'Conferência das receitas e apuração do Simples Nacional.',
    recurrence: 'monthly',
    defaultDueDay: 18,
    active: true,
  },
  {
    id: 'routine-gerar-das',
    departmentId: fiscalDepartment.id,
    name: 'Gerar DAS',
    shortName: 'Gerar DAS',
    description:
      'Conferência da apuração e emissão da guia mensal do Simples Nacional.',
    recurrence: 'monthly',
    defaultDueDay: 20,
    active: true,
  },
  {
    id: 'routine-enviar-das',
    departmentId: fiscalDepartment.id,
    name: 'Enviar DAS',
    shortName: 'Enviar DAS',
    description:
      'Envio da guia mensal do Simples Nacional após conferência e apuração.',
    recurrence: 'monthly',
    defaultDueDay: 20,
    active: true,
  },
  {
    id: 'routine-efd-reinf',
    departmentId: fiscalDepartment.id,
    name: 'EFD-Reinf',
    shortName: 'EFD-Reinf',
    description:
      'Conferência e transmissão dos eventos fiscais periódicos da EFD-Reinf.',
    recurrence: 'monthly',
    defaultDueDay: 15,
    active: true,
  },
  {
    id: 'routine-apurar-pis-cofins',
    departmentId: fiscalDepartment.id,
    name: 'Apurar PIS e COFINS',
    shortName: 'Apurar PIS/COFINS',
    description: 'Conferência das bases e apuração mensal de PIS e COFINS.',
    recurrence: 'monthly',
    defaultDueDay: 20,
    active: true,
  },
  {
    id: 'routine-emitir-guias-federais',
    departmentId: fiscalDepartment.id,
    name: 'Emitir guias federais',
    shortName: 'Emitir guias',
    description: 'Emissão e conferência das guias federais do período.',
    recurrence: 'monthly',
    defaultDueDay: 25,
    active: true,
  },
  {
    id: 'routine-apurar-irpj-csll',
    departmentId: fiscalDepartment.id,
    name: 'Apurar IRPJ e CSLL',
    shortName: 'Apurar IRPJ/CSLL',
    description: 'Apuração trimestral de IRPJ e CSLL.',
    recurrence: 'quarterly',
    recurrenceMonths: [3, 6, 9, 12],
    defaultDueDay: 30,
    active: true,
  },
  {
    id: 'routine-efd-contribuicoes',
    departmentId: fiscalDepartment.id,
    name: 'EFD-Contribuições',
    shortName: 'EFD-Contribuições',
    description: 'Preparação e transmissão mensal da EFD-Contribuições.',
    recurrence: 'monthly',
    defaultDueDay: 15,
    active: true,
  },
]

const divisionRoutineIds: Record<string, string[]> = {
  [fiscalDivisionIds.MEI]: [
    'routine-importar-notas-entrada',
    'routine-importar-notas-saida',
    'routine-conferir-faturamento-mei',
    'routine-gerar-das-mei',
    'routine-dasn-simei',
  ],
  [fiscalDivisionIds.SIMPLES_NACIONAL]: [
    'routine-importar-notas-entrada',
    'routine-lancar-notas-entrada',
    'routine-importar-notas-saida',
    'routine-lancar-notas-saida',
    'routine-apurar-simples-nacional',
    'routine-gerar-das',
    'routine-enviar-das',
    'routine-efd-reinf',
  ],
  [fiscalDivisionIds.LUCRO_PRESUMIDO]: [
    'routine-importar-notas-entrada',
    'routine-lancar-notas-entrada',
    'routine-importar-notas-saida',
    'routine-lancar-notas-saida',
    'routine-apurar-pis-cofins',
    'routine-emitir-guias-federais',
    'routine-apurar-irpj-csll',
    'routine-efd-contribuicoes',
    'routine-efd-reinf',
  ],
}

const divisionRoutineLinks: DivisionRoutineLink[] = fiscalDivisions.flatMap(
  (division) =>
    divisionRoutineIds[division.id].map((routineId, index) => ({
      id: `division-routine-${division.slug}-${routineId.replace('routine-', '')}`,
      divisionId: division.id,
      routineId,
      position: index + 1,
    })),
)

const employees: Employee[] = [
  {
    id: 'employee-001',
    name: 'Ana Souza',
    departmentIds: [fiscalDepartment.id],
    login: 'ana.souza@example.com',
    role: 'employee',
    credentialConfigured: true,
    active: true,
  },
  {
    id: 'employee-002',
    name: 'Bruno Lima',
    departmentIds: [fiscalDepartment.id],
    login: 'bruno.lima@example.com',
    role: 'leader',
    credentialConfigured: true,
    active: true,
  },
  {
    id: 'employee-003',
    name: 'Carla Melo',
    departmentIds: [fiscalDepartment.id],
    login: 'carla.melo@example.com',
    role: 'manager',
    credentialConfigured: true,
    active: true,
  },
  {
    id: 'employee-004',
    name: 'Diego Ramos',
    departmentIds: [fiscalDepartment.id],
    role: 'employee',
    credentialConfigured: false,
    active: true,
  },
]

const attachmentCatalog = [
  {
    name: 'Notas_entrada_junho.csv',
    mimeType: 'text/csv',
    sizeLabel: '86 KB',
    previewType: 'spreadsheet',
    previewTitle: 'Notas de entrada',
  },
  {
    name: 'NFe_352606001542.xml',
    mimeType: 'application/xml',
    sizeLabel: '24 KB',
    previewType: 'xml',
    previewTitle: 'Nota fiscal eletrônica',
  },
  {
    name: 'Memoria_de_calculo_junho.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeLabel: '118 KB',
    previewType: 'spreadsheet',
    previewTitle: 'Memória de cálculo',
  },
  {
    name: 'DAS_06-2026.pdf',
    mimeType: 'application/pdf',
    sizeLabel: '184 KB',
    previewType: 'pdf',
    previewTitle: 'Documento de arrecadação',
  },
  {
    name: 'Comprovante_de_envio.png',
    mimeType: 'image/png',
    sizeLabel: '412 KB',
    previewType: 'image',
    previewTitle: 'Comprovante de envio',
  },
  {
    name: 'Relatorio_de_conferencia.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeLabel: '76 KB',
    previewType: 'document',
    previewTitle: 'Relatório de conferência',
  },
  {
    name: 'Recibo_EFD-Reinf.pdf',
    mimeType: 'application/pdf',
    sizeLabel: '205 KB',
    previewType: 'pdf',
    previewTitle: 'Recibo de transmissão',
  },
]

function buildMockCnpj(index: number): string {
  const digits = `99${String(index + 1).padStart(6, '0')}0001${String((index * 7) % 100).padStart(2, '0')}`

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  )
}

function buildMockAttachments(
  taskId: string,
  count: number,
  offset = 0,
): TaskAttachment[] {
  return Array.from({ length: count }, (_, index) => {
    const template =
      attachmentCatalog[(offset + index) % attachmentCatalog.length]

    return {
      ...template,
      id: `${taskId}-attachment-${index + 1}`,
      uploadedAt: `2026-06-${String(18 + (index % 6)).padStart(2, '0')}T15:40:00-03:00`,
    }
  })
}

function getClientFiscalDivisionId(client: Client): string {
  const assignment = client.divisionAssignments?.find(
    (item) => item.departmentId === fiscalDepartment.id,
  )

  if (!assignment) {
    throw new Error(`Empresa sem divisão fiscal no mock: ${client.id}`)
  }

  return assignment.divisionId
}

const explicitNonApplicablePairs = new Set([
  'client-007:routine-efd-reinf',
  'client-018:routine-efd-reinf',
])

function isClientRoutineLinked(client: Client, routineId: string): boolean {
  return !explicitNonApplicablePairs.has(`${client.id}:${routineId}`)
}

function getOperationalStatus(
  routinePosition: number,
  routineCount: number,
  clientIndex: number,
): RoutineStatus {
  const completedThrough = Math.max(1, Math.floor(routineCount * 0.45))
  const pendingFrom = Math.max(
    completedThrough + 2,
    Math.ceil(routineCount * 0.72),
  )
  const isException = (clientIndex * 7 + routinePosition * 11) % 19 === 0

  if (routinePosition <= completedThrough) {
    return isException ? 'no_movement' : 'completed'
  }

  if (routinePosition >= pendingFrom) {
    return isException ? 'in_progress' : 'pending'
  }

  return isException ? 'error' : 'in_progress'
}

function getOperationalNote(
  status: RoutineStatus,
  client: Client,
  routine: Routine,
): string {
  if (status === 'no_movement') {
    return `Sem movimento identificado em ${routine.shortName} para ${client.name}.`
  }

  if (status === 'error') {
    return `Pendência identificada em ${routine.shortName} para ${client.name}.`
  }

  if (status === 'in_progress') {
    return 'Etapa em execução no fluxo atual da rotina.'
  }

  if (status === 'completed') {
    return 'Rotina finalizada e conferida.'
  }

  return ''
}

function buildMockTaskLinks(
  taskId: string,
  client: Client,
  routine: Routine,
): TaskLink[] {
  if (!routine.id.includes('importar-notas')) return []

  return [
    {
      id: `${taskId}-link-importacao`,
      label: 'Portal de importação de notas',
      url: `https://importacao.exemplo.com/notas?empresa=${encodeURIComponent(client.code)}`,
      createdAt: '2026-06-02T09:00:00-03:00',
    },
  ]
}

function buildTask(
  client: Client,
  routine: Routine,
  divisionId: string,
  routinePosition: number,
  routineCount: number,
  clientIndex: number,
): Task {
  const status = getOperationalStatus(
    routinePosition,
    routineCount,
    clientIndex,
  )
  const day = String(18 + ((clientIndex + routinePosition * 2) % 11)).padStart(
    2,
    '0',
  )
  const employee =
    employees[(clientIndex + routinePosition) % employees.length]!
  const taskId = `task-2026-06-${divisionId.replace('division-', '')}-${client.code}-${routine.id.replace('routine-', '')}`
  const attachmentCount = ['completed', 'no_movement'].includes(status)
    ? 2 + ((clientIndex + routinePosition) % 3)
    : (clientIndex + routinePosition) % 2
  const attachments = buildMockAttachments(
    taskId,
    attachmentCount,
    clientIndex + routinePosition * 2,
  )

  return {
    id: taskId,
    clientId: client.id,
    routineId: routine.id,
    departmentId: routine.departmentId,
    divisionId,
    assigneeId:
      status === 'pending' && (clientIndex + routinePosition) % 7 === 0
        ? null
        : employee.id,
    status,
    period: '2026-06',
    dueDate: `2026-06-${day}`,
    completedAt: ['completed', 'no_movement'].includes(status)
      ? `2026-06-${day}T16:00:00-03:00`
      : null,
    notes: getOperationalNote(status, client, routine),
    attachments,
    links: buildMockTaskLinks(taskId, client, routine),
    indicators: {
      attachments: attachments.length,
      comments: status === 'error' ? 3 : status === 'in_progress' ? 1 : 0,
      alerts: 0,
    },
  }
}

const routinesById = new Map(routines.map((routine) => [routine.id, routine]))

const clientRoutineLinks: ClientRoutineLink[] = clients.flatMap((client) => {
  const divisionId = getClientFiscalDivisionId(client)

  return divisionRoutineLinks.flatMap((divisionRoutineLink) => {
    if (
      divisionRoutineLink.divisionId !== divisionId ||
      !isClientRoutineLinked(client, divisionRoutineLink.routineId)
    ) {
      return []
    }

    return [
      {
        id: `link-${client.id}-${divisionId}-${divisionRoutineLink.routineId}`,
        clientId: client.id,
        routineId: divisionRoutineLink.routineId,
      },
    ]
  })
})

const clientsById = new Map(clients.map((client) => [client.id, client]))

const tasks: Task[] = clientRoutineLinks.map((clientRoutineLink) => {
  const client = clientsById.get(clientRoutineLink.clientId)
  const routine = routinesById.get(clientRoutineLink.routineId)

  if (!client || !routine) {
    throw new Error(`Vínculo inválido no mock: ${clientRoutineLink.id}`)
  }

  const divisionId = getClientFiscalDivisionId(client)
  const divisionRoutineLink = divisionRoutineLinks.find(
    (item) =>
      item.divisionId === divisionId &&
      item.routineId === clientRoutineLink.routineId,
  )

  if (!divisionRoutineLink) {
    throw new Error(
      `Rotina fora da divisão da empresa no mock: ${clientRoutineLink.id}`,
    )
  }

  return buildTask(
    client,
    routine,
    divisionId,
    divisionRoutineLink.position,
    divisionRoutineIds[divisionId].length,
    clients.indexOf(client),
  )
})

const looseTasks: Task[] = [
  {
    id: 'loose-task-conferir-certificado',
    isLoose: true,
    title: 'Conferir vencimento de certificado digital',
    description:
      'Verificar certificados que vencem nos próximos 30 dias e registrar retorno.',
    clientId: null,
    routineId: null,
    departmentId: fiscalDepartment.id,
    divisionId: null,
    assigneeId: 'employee-001',
    status: 'in_progress',
    period: '2026-06',
    dueDate: '2026-06-18',
    completedAt: null,
    notes: 'Priorizar empresas com emissão de nota ativa.',
    attachments: buildMockAttachments('loose-task-conferir-certificado', 1, 2),
    indicators: {
      attachments: 1,
      comments: 0,
      alerts: 0,
    },
  },
  {
    id: 'loose-task-organizar-pendencias',
    isLoose: true,
    title: 'Organizar pendências recebidas por e-mail',
    description:
      'Separar pendências por empresa e encaminhar para a rotina correta quando necessário.',
    clientId: null,
    routineId: null,
    departmentId: fiscalDepartment.id,
    divisionId: null,
    assigneeId: 'employee-001',
    status: 'pending',
    period: '2026-06',
    dueDate: '2026-06-21',
    completedAt: null,
    notes: '',
    attachments: [],
    indicators: {
      attachments: 0,
      comments: 0,
      alerts: 0,
    },
  },
  {
    id: 'loose-task-revisar-procuracoes',
    isLoose: true,
    title: 'Revisar procurações do portal e-CAC',
    description: 'Conferir acessos vencidos antes do fechamento mensal.',
    clientId: null,
    routineId: null,
    departmentId: fiscalDepartment.id,
    divisionId: null,
    assigneeId: 'employee-001',
    status: 'error',
    period: '2026-06',
    dueDate: '2026-06-19',
    completedAt: null,
    notes: 'Alguns acessos retornaram erro de permissão.',
    attachments: [],
    indicators: {
      attachments: 0,
      comments: 2,
      alerts: 0,
    },
  },
  {
    id: 'loose-task-atualizar-checklist',
    isLoose: true,
    title: 'Atualizar checklist interno do fiscal',
    description:
      'Registrar ajustes observados durante a execução das rotinas de junho.',
    clientId: null,
    routineId: null,
    departmentId: fiscalDepartment.id,
    divisionId: null,
    assigneeId: 'employee-001',
    status: 'completed',
    period: '2026-06',
    dueDate: '2026-06-16',
    completedAt: '2026-06-16T15:30:00-03:00',
    notes: 'Checklist atualizado com os novos prazos.',
    attachments: buildMockAttachments('loose-task-atualizar-checklist', 2, 5),
    indicators: {
      attachments: 2,
      comments: 0,
      alerts: 0,
    },
  },
]

export const routineControlMock: RoutineControlResponse = {
  data: {
    departments: [fiscalDepartment],
    divisions: fiscalDivisions,
    clients,
    routines,
    divisionRoutineLinks,
    clientRoutineLinks,
    employees,
    tasks: [...tasks, ...looseTasks],
  },
  meta: {
    period: '2026-06',
    generatedAt: '2026-06-25T12:00:00-03:00',
  },
}
