import type {
  ProcessCatalog,
  ProcessPermissions,
  ProcessResource,
} from '../../types/processes'

export const processTestPermissions: ProcessPermissions = {
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

export const processTestCatalog: ProcessCatalog = {
  workflowVersion: 1,
  sectors: { com: 'Diretoria', fin: 'Financeiro', reg: 'Regularidade' },
  permissions: processTestPermissions,
  types: [
    {
      id: 'abertura',
      nome: 'Abertura de empresa',
      sigla: 'ABE',
      icon: 'building',
      desc: 'Constituição de novo CNPJ',
      etapas: [
        {
          t: 'Definições',
          tasks: [
            { id: 'abc', d: 'com', txt: 'Definir custo', campo: 'custo' },
            {
              id: 'abh',
              d: 'com',
              txt: 'Definir honorário',
              campo: 'honorario',
            },
            { id: 'abr', d: 'com', txt: 'Definir regime', campo: 'regime' },
          ],
        },
        {
          t: 'Registro',
          tasks: [
            { id: 'ab3', d: 'fin', txt: 'Contatar o cliente' },
            { id: 'ab4', d: 'reg', txt: 'Regularizar documentos', opt: true },
          ],
        },
        {
          t: 'Alinhamento',
          tasks: [
            {
              id: 'ab9',
              d: 'fin',
              txt: 'Agendar primeira visita',
              reuniao: 'alinhamento',
            },
          ],
        },
        {
          t: 'Acompanhamento',
          espera: 4,
          tasks: [
            {
              id: 'ab13',
              d: 'fin',
              txt: 'Agendar segunda visita',
              reuniao: 'acompanhamento',
            },
          ],
        },
      ],
    },
    {
      id: 'alteracao',
      nome: 'Alteração contratual',
      sigla: 'ALT',
      icon: 'pen',
      desc: 'Sócios, endereço e capital',
      etapas: [
        {
          t: 'Definições',
          tasks: [
            { id: 'ald', d: 'com', txt: 'Definições da alteração', auto: true },
          ],
        },
      ],
    },
    {
      id: 'inatividade',
      nome: 'Paralisação de empresa',
      sigla: 'PAR',
      icon: 'pause',
      desc: 'Paralisação',
      etapas: [
        {
          t: 'Definições',
          tasks: [
            {
              id: 'ina',
              d: 'com',
              txt: 'Definições da paralisação',
              auto: true,
            },
          ],
        },
      ],
    },
    {
      id: 'inativa',
      nome: 'Inatividade de empresa',
      sigla: 'INA',
      icon: 'moon',
      desc: 'Inatividade',
      etapas: [
        {
          t: 'Definições',
          tasks: [
            {
              id: 'iah',
              d: 'com',
              txt: 'Definir honorário',
              campo: 'honorario',
            },
          ],
        },
      ],
    },
    {
      id: 'saida',
      nome: 'Saída de cliente',
      sigla: 'SAI',
      icon: 'out',
      desc: 'Transferência',
      etapas: [
        {
          t: 'Definições',
          tasks: [
            { id: 'sad', d: 'com', txt: 'Definições da saída', auto: true },
          ],
        },
      ],
    },
    {
      id: 'reativacao',
      nome: 'Reativação de empresa',
      sigla: 'REA',
      icon: 'refresh',
      desc: 'Retomada',
      etapas: [
        {
          t: 'Definições',
          tasks: [
            {
              id: 'reh',
              d: 'com',
              txt: 'Definir honorário',
              campo: 'honorario',
            },
          ],
        },
        {
          t: 'Retomada',
          tasks: [
            {
              id: 're11',
              d: 'fin',
              txt: 'Alinhamento',
              reuniao: 'alinhamento',
            },
            {
              id: 're12',
              d: 'fin',
              txt: 'Acompanhamento',
              reuniao: 'acompanhamento',
            },
          ],
        },
      ],
    },
  ],
}

export function makeProcessTestResource(
  overrides: Partial<ProcessResource> = {},
): ProcessResource {
  return {
    id: 'process-1',
    organizationId: 'org-1',
    empresa: 'Empresa Exemplo',
    tipo: 'abertura',
    codigo: 'ABE-2610-TEST',
    status: 'andamento',
    version: 4,
    workflowVersion: 1,
    criadoPor: 'member-1',
    autorAbertura: 'Ana Silva',
    criadoEm: '2026-10-22T12:00:00Z',
    atualizadoEm: '2026-10-22T12:00:00Z',
    concluidoEm: null,
    etapas: processTestCatalog.types[0]!.etapas.slice(1),
    tarefas: {},
    analysis: {
      currentStage: 0,
      completedTasks: 0,
      totalTasks: 4,
      releaseDate: null,
      waiting: false,
      late: false,
      pendingSectors: ['fin', 'reg'],
    },
    notas: [],
    historico: [],
    permissions: processTestPermissions,
    ...overrides,
  }
}
