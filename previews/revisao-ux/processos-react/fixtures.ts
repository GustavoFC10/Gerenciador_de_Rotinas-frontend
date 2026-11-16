import workflowFixtures from '../../../src/preview/workflows.json'
import type {
  ProcessCatalog,
  ProcessIndicators,
  ProcessMonthlyReport,
  ProcessMovementMonth,
  ProcessPermissions,
  ProcessStatus,
  ProcessSummary,
  ProcessLeggacyMetric,
} from '../../../src/types/processes'
import { shiftMonth } from '../../../src/utils/processPresentation'

// Declarative, fictional API-shaped resources. Never used by the application.
const permissions: ProcessPermissions = {
  read: true,
  create: true,
  edit: true,
  delete: true,
  cancel: true,
  reopen: true,
  note: true,
  viewFinancial: true,
  viewMovements: true,
  executeSectors: ['com', 'fin', 'reg'],
  sectors: ['com'],
}
export const catalog: ProcessCatalog = {
  contractVersion: 2,
  workflowVersion: 2,
  statuses: {
    andamento: 'Em andamento',
    agendado: 'Aguardando liberação',
    atrasado: 'Atrasado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  },
  openStatuses: ['andamento', 'agendado', 'atrasado'],
  sectors: { com: 'Diretoria', fin: 'Financeiro', reg: 'Regularidade' },
  permissions,
  types: [
    ...(workflowFixtures as ProcessCatalog['types']),
    ...(['aumento_honorarios', 'reducao_honorarios'] as const).map((id) => ({
      id,
      nome:
        id === 'aumento_honorarios'
          ? 'Aumento de honorários contábeis'
          : 'Redução de honorários contábeis',
      sigla: id === 'aumento_honorarios' ? 'AHC' : 'RHC',
      icon: id === 'aumento_honorarios' ? 'up' : 'swap',
      desc: 'Reajuste dos honorários contábeis',
      etapas: [
        {
          t: 'Financeiro',
          tasks: [
            {
              id: id + '-1',
              d: 'fin' as const,
              txt: 'Ajustar honorário no sistema contábil',
            },
          ],
        },
      ],
    })),
  ],
}
const companies = [
  'Aurora Comércio',
  'Horizonte Serviços',
  'Cedro Tecnologia',
  'Norte Saúde',
  'Solar Arquitetura',
  'Ponte Engenharia',
  'Estação Alimentos',
  'Vale Sereno',
  'Bento Arquitetura',
  'Cais Tecnologia',
  'Ipê Consultoria',
  'Mira Educação',
  'Álamo Turismo',
  'Vila Verde',
  'Veredas Engenharia',
  'Orla Serviços',
  'Prumo Comercial',
  'Bosque Alimentos',
]
const statuses: ProcessStatus[] = [
  ...Array<ProcessStatus>(6).fill('andamento'),
  ...Array<ProcessStatus>(3).fill('atrasado'),
  ...Array<ProcessStatus>(3).fill('agendado'),
  ...Array<ProcessStatus>(5).fill('concluido'),
  'cancelado',
]
const types: ProcessSummary['tipo'][] = [
  'abertura',
  'alteracao',
  'reativacao',
  'outro',
  'inatividade',
  'aumento_honorarios',
  'baixa',
  'mei',
  'saida',
  'inativa',
  'reducao_honorarios',
  'exclusao',
  'outros',
  'mei',
  'abertura',
  'alteracao',
  'reativacao',
  'baixa',
]
export const processes: ProcessSummary[] = companies.map((empresa, i) => {
  const sector = (['com', 'fin', 'reg'] as const)[i % 3]!
  const status = statuses[i]!
  const terminal = status === 'concluido' || status === 'cancelado'
  return {
    id: `review-process-${i + 1}`,
    organizationId: 'review-office',
    empresa,
    companyId: `review-company-${i + 1}`,
    companyLinkRequired: false,
    companyReference: null,
    cnpj: '',
    protocolo: '',
    prazo: status === 'atrasado' ? '2026-11-10' : '2026-11-24',
    tipo: types[i]!,
    codigo: `PROC-2611-${String(i + 1).padStart(3, '0')}`,
    status,
    statusChangedAt: '2026-11-15T12:00:00Z',
    statusNextEvaluationAt: null,
    responsibleSectors: terminal ? [] : [sector],
    criadoPor: 'review-member',
    autorAbertura: 'Mariana Costa',
    criadoEm: '2026-11-03T12:00:00Z',
    atualizadoEm: '2026-11-15T12:00:00Z',
    concluidoEm: status === 'concluido' ? '2026-11-12T12:00:00Z' : null,
    version: 1,
    workflowVersion: 2,
    analysis: {
      currentStage: terminal ? null : 1,
      completedTasks: terminal ? 8 : 3,
      totalTasks: 8,
      releaseDate: status === 'agendado' ? '2027-03-03' : null,
      waiting: status === 'agendado',
      late: status === 'atrasado',
      pendingSectors: terminal ? [] : [sector],
    },
    permissions,
    nextTask: terminal
      ? null
      : {
          id: `review-task-${i + 1}`,
          sector,
          text:
            sector === 'fin'
              ? 'Conferir pagamento e contatar o cliente'
              : sector === 'reg'
                ? 'Conferir documentação para registro'
                : 'Completar definições da diretoria',
          stageTitle: 'Documentação e início dos trabalhos',
        },
    pendingTaskCount: terminal ? 0 : 2,
  }
})
export const indicators: ProcessIndicators = {
  total: 18,
  active: 12,
  completed: 5,
  cancelled: 1,
  late: 3,
  waiting: 3,
  dueSoon: 4,
  completedThisMonth: 5,
  completedThisYear: 5,
  averageOverdueDays: 5,
  maxOverdueDays: 5,
  averageCompletionDays: 9,
  averageOpenAgeDays: 12,
  byStatus: {
    andamento: 6,
    atrasado: 3,
    agendado: 3,
    concluido: 5,
    cancelado: 1,
  },
  bySector: { com: 3, fin: 3, reg: 3 },
  byType: Object.fromEntries(
    catalog.types.map((type) => [
      type.id,
      processes.filter((p) => p.tipo === type.id).length,
    ]),
  ),
}
export const leggacyMetrics: ProcessLeggacyMetric[] = [
  {
    tipo: 'abertura',
    completedCount: 8,
    waitingCount: 3,
    averageDays: 12,
    minDays: 6,
    maxDays: 21,
  },
  {
    tipo: 'alteracao',
    completedCount: 5,
    waitingCount: 2,
    averageDays: 9,
    minDays: 4,
    maxDays: 15,
  },
  {
    tipo: 'baixa',
    completedCount: 3,
    waitingCount: 1,
    averageDays: 15,
    minDays: 10,
    maxDays: 23,
  },
]
function movementMonth(month: string): ProcessMovementMonth {
  const step = (Number(month.slice(5)) + Number(month.slice(0, 4))) % 3
  const entries: ProcessMovementMonth['entries'] = [
    {
      processId: processes[0]!.id,
      empresa: 'Aurora Comércio',
      tipo: 'abertura',
      value: (1200 + step * 100).toFixed(2),
    },
    {
      processId: processes[2]!.id,
      empresa: 'Cedro Tecnologia',
      tipo: 'reativacao',
      value: '650.00',
    },
    {
      processId: processes[5]!.id,
      empresa: 'Ponte Engenharia',
      tipo: 'aumento_honorarios',
      value: '450.00',
    },
    {
      processId: processes[3]!.id,
      empresa: 'Norte Saúde',
      tipo: 'outro',
      value: '900.00',
    },
    {
      processId: processes[7]!.id,
      empresa: 'Vale Sereno',
      tipo: 'mei',
      value: null,
    },
  ]
  const exits: ProcessMovementMonth['exits'] = [
    {
      processId: processes[6]!.id,
      empresa: 'Estação Alimentos',
      tipo: 'baixa',
      value: '400.00',
    },
    {
      processId: processes[8]!.id,
      empresa: 'Bento Arquitetura',
      tipo: 'saida',
      value: '650.00',
    },
    {
      processId: processes[9]!.id,
      empresa: 'Cais Tecnologia',
      tipo: 'inativa',
      value: '200.00',
    },
    {
      processId: processes[10]!.id,
      empresa: 'Ipê Consultoria',
      tipo: 'reducao_honorarios',
      value: '150.00',
    },
    {
      processId: processes[11]!.id,
      empresa: 'Mira Educação',
      tipo: 'exclusao',
      value: null,
    },
  ]
  const gain = entries.reduce((sum, item) => sum + Number(item.value ?? 0), 0)
  const loss = exits.reduce((sum, item) => sum + Number(item.value ?? 0), 0)
  return {
    month,
    gain: gain.toFixed(2),
    loss: loss.toFixed(2),
    balance: (gain - loss).toFixed(2),
    missingValues: 2,
    entries,
    exits,
    lossesByType: {
      baixa: '400.00',
      saida: '650.00',
      inativa: '200.00',
      reducao_honorarios: '150.00',
    },
  }
}
export function reportFor(month: string): ProcessMonthlyReport {
  return {
    ...movementMonth(month),
    previousMonth: movementMonth(shiftMonth(month, -1)),
    history: Array.from({ length: 12 }, (_, i) =>
      movementMonth(shiftMonth(month, i - 11)),
    ),
  }
}
