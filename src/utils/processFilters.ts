import type { ProcessFilters, ProcessStatus } from '../types/processes'

/** Navigation maps directly to the persisted status. It has no workflow rules. */
export const PROCESS_VIEWS: Record<
  string,
  {
    title: string
    description: string
    statuses?: readonly ProcessStatus[]
  }
> = {
  ativos: {
    title: 'Abertos',
    description: 'Em andamento, aguardando liberação e atrasados.',
    statuses: ['andamento', 'agendado', 'atrasado'],
  },
  andamento: {
    title: 'Em andamento',
    description: 'Processos em andamento.',
    statuses: ['andamento'],
  },
  atrasados: {
    title: 'Atrasados',
    description: 'Processos classificados como atrasados pelo servidor.',
    statuses: ['atrasado'],
  },
  agendados: {
    title: 'Aguardando liberação',
    description: 'Processos aguardando a liberação da próxima etapa.',
    statuses: ['agendado'],
  },
  concluidos: {
    title: 'Concluídos',
    description: 'Processos concluídos.',
    statuses: ['concluido'],
  },
  encerrados: {
    title: 'Cancelados',
    description: 'Processos cancelados.',
    statuses: ['cancelado'],
  },
  todos: {
    title: 'Todos os processos',
    description: 'Processos em todas as situações.',
  },
  responsabilidade: {
    title: 'Responsabilidade',
    description:
      'Processos sob responsabilidade do setor, incluindo os que aguardam liberação.',
  },
  fila: {
    title: 'Minha fila',
    description: 'Ações liberadas para execução pelo seu setor.',
    statuses: ['andamento', 'atrasado'],
  },
  outrosSetores: {
    title: 'Com outros setores',
    description: 'Processos em execução sem pendências do setor selecionado.',
    statuses: ['andamento', 'atrasado'],
  },
}

export function processViewFilters(
  view: string,
): Pick<ProcessFilters, 'status'> {
  const status = PROCESS_VIEWS[view]?.statuses
  return status ? { status } : {}
}
