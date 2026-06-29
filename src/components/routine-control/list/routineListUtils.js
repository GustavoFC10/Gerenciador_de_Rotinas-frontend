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
    card:
      'border-[var(--status-error-border)] bg-[var(--status-error-bg)] hover:bg-[var(--status-error-hover-bg)]',
    accent: 'bg-[var(--status-error-dot)]',
    border: 'border-l-[var(--status-error-dot)]',
    code: 'bg-[var(--status-error-soft-bg)] text-[var(--status-error-text)]',
    field:
      'border-[var(--status-error-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--status-error-dot)] focus:ring-[var(--color-focus-ring)]',
  },
  in_progress: {
    card:
      'border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] hover:bg-[var(--status-progress-hover-bg)]',
    accent: 'bg-[var(--status-progress-dot)]',
    border: 'border-l-[var(--status-progress-dot)]',
    code:
      'bg-[var(--status-progress-soft-bg)] text-[var(--status-progress-text)]',
    field:
      'border-[var(--status-progress-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--status-progress-dot)] focus:ring-[var(--color-focus-ring)]',
  },
  pending: {
    card:
      'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] hover:bg-[var(--status-pending-hover-bg)]',
    accent: 'bg-[var(--status-pending-dot)]',
    border: 'border-l-[var(--status-pending-border)]',
    code:
      'bg-[var(--status-pending-soft-bg)] text-[var(--status-pending-text)]',
    field:
      'border-[var(--status-pending-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--color-control-focus)] focus:ring-[var(--color-focus-ring)]',
  },
  completed: {
    card:
      'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] hover:bg-[var(--status-completed-hover-bg)]',
    accent: 'bg-[var(--status-completed-dot)]',
    border: 'border-l-[var(--status-completed-dot)]',
    code:
      'bg-[var(--status-completed-soft-bg)] text-[var(--status-completed-text)]',
    field:
      'border-[var(--status-completed-border)] bg-[var(--color-list-field-bg)] focus:border-[var(--status-completed-dot)] focus:ring-[var(--color-focus-ring)]',
  },
}
