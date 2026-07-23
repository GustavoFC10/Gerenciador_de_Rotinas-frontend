const fiscalDepartment = { id: 'dept-fiscal', name: 'Fiscal' }

const clients = [
  { id: 'client-001', code: '001', name: 'Aurora Comercio Ltda.' },
  { id: 'client-002', code: '002', name: 'Bento Arquitetura' },
  { id: 'client-003', code: '003', name: 'Cais Tecnologia S.A.' },
  { id: 'client-004', code: '004', name: 'Dalia Servicos Medicos' },
  { id: 'client-005', code: '005', name: 'Estrela Alimentos Eireli' },
  { id: 'client-006', code: '006', name: 'Forte Engenharia Ltda.' },
  { id: 'client-007', code: '007', name: 'Granito Transportes' },
  { id: 'client-008', code: '008', name: 'Horizonte Clinica Popular' },
  { id: 'client-009', code: '009', name: 'Ipiranga Servicos Digitais' },
  { id: 'client-010', code: '010', name: 'Jardim Moveis Planejados' },
  { id: 'client-011', code: '011', name: 'Kairos Consultoria' },
  { id: 'client-012', code: '012', name: 'Lumina Eventos' },
  { id: 'client-013', code: '013', name: 'Matriz Solucoes Industriais' },
  { id: 'client-014', code: '014', name: 'Norte Comercio Atacadista' },
  { id: 'client-015', code: '015', name: 'Oliva Restaurante Ltda.' },
  { id: 'client-016', code: '016', name: 'Polo Educacional' },
  { id: 'client-017', code: '017', name: 'Quartzo Materiais' },
  { id: 'client-018', code: '018', name: 'Rota Logistica Integrada' },
  { id: 'client-019', code: '019', name: 'Solar Energia e Servicos' },
  { id: 'client-020', code: '020', name: 'Tessitura Modas Ltda.' },
  { id: 'client-021', code: '021', name: 'Uniao Farma Popular' },
  { id: 'client-022', code: '022', name: 'Vale Verde Agro' },
  { id: 'client-023', code: '023', name: 'W3 Sistemas Contabeis' },
  { id: 'client-024', code: '024', name: 'Xavier Manutencao Predial' },
  { id: 'client-025', code: '025', name: 'Zeta Participacoes' },
]

const routines = [
  {
    id: 'routine-importar-notas-entrada',
    departmentId: fiscalDepartment.id,
    name: 'Importar notas Entrada',
    shortName: 'Importar Entrada',
    description: 'Importacao das notas fiscais de entrada do periodo.',
  },
  {
    id: 'routine-lancar-notas-entrada',
    departmentId: fiscalDepartment.id,
    name: 'Lançar notas Entrada',
    shortName: 'Lançar Entrada',
    description: 'Lancamento e conferencia das notas fiscais de entrada.',
  },
  {
    id: 'routine-importar-notas-saida',
    departmentId: fiscalDepartment.id,
    name: 'Importar Notas Saída',
    shortName: 'Importar Saída',
    description: 'Importacao das notas fiscais de saida do periodo.',
  },
  {
    id: 'routine-lancar-notas-saida',
    departmentId: fiscalDepartment.id,
    name: 'Lançar Notas Saída',
    shortName: 'Lançar Saída',
    description: 'Lancamento e conferencia das notas fiscais de saida.',
  },
  {
    id: 'routine-gerar-das',
    departmentId: fiscalDepartment.id,
    name: 'Gerar Das',
    shortName: 'Gerar DAS',
    description:
      'Conferencia do faturamento, apuracao e emissao da guia mensal do Simples Nacional.',
  },
  {
    id: 'routine-enviar-das',
    departmentId: fiscalDepartment.id,
    name: 'Enviar Das',
    shortName: 'Enviar DAS',
    description:
      'Envio da guia mensal do Simples Nacional apos conferencia e apuracao.',
  },
  {
    id: 'routine-efd-reinf',
    departmentId: fiscalDepartment.id,
    name: 'EFD Reinf',
    shortName: 'EFD Reinf',
    description:
      'Conferencia e transmissao dos eventos fiscais periodicos da EFD Reinf.',
  },
]

const employees = [
  { id: 'employee-001', name: 'Ana Souza' },
  { id: 'employee-002', name: 'Bruno Lima' },
  { id: 'employee-003', name: 'Carla Melo' },
  { id: 'employee-004', name: 'Diego Ramos' },
]

function getOperationalStatus(routineIndex, clientIndex) {
  const position = clientIndex + 1

  if (routineIndex === 6 && [7, 18].includes(position)) {
    return 'not_applicable'
  }

  if (routineIndex === 4 && [8, 16].includes(position)) {
    return 'no_movement'
  }

  if (routineIndex === 0) {
    if (position === 17) return 'error'
    if (position <= 22) return 'completed'
    return 'in_progress'
  }

  if (routineIndex === 1) {
    if ([8, 21].includes(position)) return 'error'
    if (position <= 14) return 'completed'
    if (position <= 24) return 'in_progress'
    return 'pending'
  }

  if (routineIndex === 2) {
    if (position === 19) return 'error'
    if (position <= 20) return 'completed'
    if (position <= 24) return 'in_progress'
    return 'pending'
  }

  if (routineIndex === 3) {
    if ([6, 15, 23].includes(position)) return 'error'
    if (position <= 7) return 'completed'
    if (position <= 20) return 'in_progress'
    return 'pending'
  }

  if (routineIndex === 4) {
    if ([4, 12].includes(position)) return 'error'
    if (position <= 6) return 'in_progress'
    return 'pending'
  }

  if (routineIndex === 5) {
    if (position === 1) return 'completed'
    if (position <= 4) return 'in_progress'
    return 'pending'
  }

  if (position <= 2) return 'in_progress'
  return 'pending'
}

function getOperationalNote(status, client, routine) {
  if (status === 'not_applicable') {
    return `${routine.shortName} nao se aplica para ${client.name} neste periodo.`
  }

  if (status === 'no_movement') {
    return `Sem movimento identificado em ${routine.shortName} para ${client.name}.`
  }

  if (status === 'error') {
    return `Pendencia identificada em ${routine.shortName} para ${client.name}.`
  }

  if (status === 'in_progress') {
    return `Etapa em execucao no fluxo atual da rotina.`
  }

  if (status === 'completed') {
    return `Rotina finalizada e conferida.`
  }

  return ''
}

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

function buildMockAttachments(taskId, count, offset = 0) {
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

function buildTask(client, routine, clientIndex, routineIndex) {
  const status = getOperationalStatus(routineIndex, clientIndex)
  const day = String(18 + ((clientIndex + routineIndex * 2) % 11)).padStart(
    2,
    '0',
  )
  const employee = employees[(clientIndex + routineIndex) % employees.length]
  const note = getOperationalNote(status, client, routine)
  const taskId = `task-${client.code}-${routine.id.replace('routine-', '')}`
  const attachmentCount = ['completed', 'no_movement'].includes(status)
    ? 2 + ((clientIndex + routineIndex) % 3)
    : (clientIndex + routineIndex) % 2
  const attachments = buildMockAttachments(
    taskId,
    attachmentCount,
    clientIndex + routineIndex * 2,
  )

  return {
    id: taskId,
    clientId: client.id,
    routineId: routine.id,
    departmentId: routine.departmentId,
    assigneeId:
      status === 'pending' && (clientIndex + routineIndex) % 7 === 0
        ? null
        : employee.id,
    status,
    period: '2026-06',
    dueDate: `2026-06-${day}`,
    completedAt: ['completed', 'no_movement', 'not_applicable'].includes(status)
      ? `2026-06-${day}T16:00:00-03:00`
      : null,
    notes: note,
    attachments,
    indicators: {
      attachments: attachments.length,
      comments: status === 'error' ? 3 : status === 'in_progress' ? 1 : 0,
      alerts: 0,
    },
  }
}

const tasks = clients.flatMap((client, clientIndex) =>
  routines.map((routine, routineIndex) =>
    buildTask(client, routine, clientIndex, routineIndex),
  ),
)

const looseTasks = [
  {
    id: 'loose-task-conferir-certificado',
    isLoose: true,
    title: 'Conferir vencimento de certificado digital',
    description:
      'Verificar certificados que vencem nos proximos 30 dias e registrar retorno.',
    clientId: null,
    routineId: null,
    departmentId: fiscalDepartment.id,
    assigneeId: 'employee-001',
    status: 'in_progress',
    period: '2026-06',
    dueDate: '2026-06-18',
    completedAt: null,
    notes: 'Priorizar empresas com emissao de nota ativa.',
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
    title: 'Organizar pendencias recebidas por e-mail',
    description:
      'Separar pendencias por empresa e encaminhar para a rotina correta quando necessario.',
    clientId: null,
    routineId: null,
    departmentId: fiscalDepartment.id,
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
    title: 'Revisar procuracoes do portal e-CAC',
    description: 'Conferir acessos vencidos antes do fechamento mensal.',
    clientId: null,
    routineId: null,
    departmentId: fiscalDepartment.id,
    assigneeId: 'employee-001',
    status: 'error',
    period: '2026-06',
    dueDate: '2026-06-19',
    completedAt: null,
    notes: 'Alguns acessos retornaram erro de permissao.',
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
      'Registrar ajustes observados durante a execucao das rotinas de junho.',
    clientId: null,
    routineId: null,
    departmentId: fiscalDepartment.id,
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

export const routineControlMock = {
  data: {
    departments: [fiscalDepartment],
    clients,
    routines,
    employees,
    tasks: [...tasks, ...looseTasks],
  },
  meta: {
    period: '2026-06',
    generatedAt: '2026-06-25T12:00:00-03:00',
  },
}
