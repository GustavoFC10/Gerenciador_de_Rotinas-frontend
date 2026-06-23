import { ROUTINE_STATUS } from '../../../constants/routineStatus.js'

export const routineListStatusOrder = [
  ROUTINE_STATUS.ERROR,
  ROUTINE_STATUS.IN_PROGRESS,
  ROUTINE_STATUS.PENDING,
  ROUTINE_STATUS.COMPLETED,
]

export const routineListStatusLabel = {
  [ROUTINE_STATUS.ERROR]: 'Erro',
  [ROUTINE_STATUS.IN_PROGRESS]: 'Em andamento',
  [ROUTINE_STATUS.PENDING]: 'Pendente',
  [ROUTINE_STATUS.COMPLETED]: 'Concluido',
}

export function sortRoutineListItems(items) {
  return [...items].sort((first, second) => {
    const codeCompare = first.companyCode.localeCompare(
      second.companyCode,
      'pt-BR',
      { numeric: true },
    )

    if (codeCompare !== 0) return codeCompare

    return first.companyName.localeCompare(second.companyName, 'pt-BR')
  })
}

export function groupRoutineListItemsByStatus(items) {
  const groups = new Map(
    routineListStatusOrder.map((status) => [status, []]),
  )

  sortRoutineListItems(items).forEach((item) => {
    const group = groups.get(item.status) ?? []
    group.push(item)
    groups.set(item.status, group)
  })

  return routineListStatusOrder.map((status) => ({
    status,
    label: routineListStatusLabel[status],
    items: groups.get(status) ?? [],
  }))
}

export function formatShortDate(dateValue) {
  if (!dateValue) return 'Sem prazo'

  const [, month, day] = dateValue.split('-')

  return `${day}/${month}`
}

export const routineListStatusTone = {
  error: {
    card: 'border-red-200 bg-red-50/35 hover:bg-red-50/70',
    accent: 'bg-red-500',
    border: 'border-l-red-500',
    code: 'bg-red-100 text-red-800',
    field: 'border-red-100 bg-white/80 focus:border-red-300 focus:ring-red-100',
  },
  in_progress: {
    card: 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/75',
    accent: 'bg-amber-400',
    border: 'border-l-amber-400',
    code: 'bg-amber-100 text-amber-900',
    field:
      'border-amber-100 bg-white/80 focus:border-amber-300 focus:ring-amber-100',
  },
  pending: {
    card: 'border-slate-200 bg-white hover:bg-slate-50',
    accent: 'bg-slate-300',
    border: 'border-l-slate-300',
    code: 'bg-slate-100 text-slate-700',
    field:
      'border-slate-200 bg-white focus:border-blue-300 focus:ring-blue-100',
  },
  completed: {
    card: 'border-emerald-200 bg-emerald-50/35 hover:bg-emerald-50/70',
    accent: 'bg-emerald-500',
    border: 'border-l-emerald-500',
    code: 'bg-emerald-100 text-emerald-800',
    field:
      'border-emerald-100 bg-white/80 focus:border-emerald-300 focus:ring-emerald-100',
  },
}
