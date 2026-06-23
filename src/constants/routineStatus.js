export const ROUTINE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  ERROR: 'error',
  COMPLETED: 'completed',
}

export const routineStatusConfig = {
  [ROUTINE_STATUS.PENDING]: {
    label: 'Pendente',
    dotClass: 'border border-slate-300 bg-white',
    surfaceClass: 'border-slate-300 bg-white text-slate-700',
  },
  [ROUTINE_STATUS.IN_PROGRESS]: {
    label: 'Em andamento',
    dotClass: 'bg-amber-400',
    surfaceClass: 'border-amber-300 bg-amber-50 text-amber-900',
  },
  [ROUTINE_STATUS.ERROR]: {
    label: 'Erro',
    dotClass: 'bg-red-500',
    surfaceClass: 'border-red-200 bg-red-50 text-red-900',
  },
  [ROUTINE_STATUS.COMPLETED]: {
    label: 'Concluído',
    dotClass: 'bg-emerald-500',
    surfaceClass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
}
