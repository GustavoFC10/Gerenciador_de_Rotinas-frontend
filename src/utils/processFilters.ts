import type { ProcessResource, ProcessSector } from '../types/processes'

export const PROCESS_VIEWS: Record<
  string,
  { title: string; description: string }
> = {
  ativos: {
    title: 'Em andamento',
    description: 'Processos abertos, da etapa atual até a conclusão.',
  },
  atrasados: {
    title: 'Atrasados',
    description: 'Processos em andamento com o prazo vencido.',
  },
  agendados: {
    title: 'Agendados',
    description: 'Processos aguardando a data de liberação da próxima etapa.',
  },
  concluidos: {
    title: 'Concluídos',
    description: 'Processos com todas as etapas finalizadas.',
  },
  encerrados: {
    title: 'Cancelados',
    description:
      'Processos cancelados, que podem ser reabertos pela Diretoria.',
  },
  todos: {
    title: 'Todos os processos',
    description: 'Histórico completo, em todas as situações.',
  },
  fila: {
    title: 'Minha fila',
    description: 'Processos com tarefa do seu setor na etapa atual.',
  },
}

export function inProcessView(
  process: ProcessResource,
  view: string,
  sector?: ProcessSector,
) {
  if (view === 'ativos') return process.status === 'andamento'
  if (view === 'atrasados') return process.analysis.late
  if (view === 'agendados') return process.analysis.waiting
  if (view === 'concluidos') return process.status === 'concluido'
  if (view === 'encerrados') return process.status === 'cancelado'
  if (view === 'fila')
    return (
      !!sector &&
      process.status === 'andamento' &&
      !process.analysis.waiting &&
      process.analysis.pendingSectors.includes(sector)
    )
  return true
}
