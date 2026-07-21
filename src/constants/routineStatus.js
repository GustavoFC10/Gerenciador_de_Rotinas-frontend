import { statusTone } from './designTokens.js'

export const ROUTINE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  ERROR: 'error',
  COMPLETED: 'completed',
  NO_MOVEMENT: 'no_movement',
  NOT_APPLICABLE: 'not_applicable',
}

export const routineStatusConfig = {
  [ROUTINE_STATUS.PENDING]: {
    label: statusTone.pending.label,
    dotClass: statusTone.pending.dot,
    surfaceClass: statusTone.pending.surface,
  },
  [ROUTINE_STATUS.IN_PROGRESS]: {
    label: statusTone.in_progress.label,
    dotClass: statusTone.in_progress.dot,
    surfaceClass: statusTone.in_progress.surface,
  },
  [ROUTINE_STATUS.ERROR]: {
    label: statusTone.error.label,
    dotClass: statusTone.error.dot,
    surfaceClass: statusTone.error.surface,
  },
  [ROUTINE_STATUS.COMPLETED]: {
    label: statusTone.completed.label,
    dotClass: statusTone.completed.dot,
    surfaceClass: statusTone.completed.surface,
  },
  [ROUTINE_STATUS.NO_MOVEMENT]: {
    label: 'Sem movimento',
    dotClass: 'bg-[var(--color-brand)]',
    surfaceClass:
      'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]',
  },
  [ROUTINE_STATUS.NOT_APPLICABLE]: {
    label: 'Nao se aplica',
    dotClass: 'bg-[var(--color-text-subtle)]',
    surfaceClass:
      'border-[var(--color-text-subtle)] bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)]',
  },
}

export const defaultRoutineStatusDetailOption = {
  id: '',
  label: 'Padrao',
}

export const routineStatusDetailOptions = {
  [ROUTINE_STATUS.PENDING]: [
    { id: 'scheduled', label: 'Agendada' },
    { id: 'waiting_start', label: 'Aguardando inicio' },
  ],
  [ROUTINE_STATUS.IN_PROGRESS]: [
    { id: 'manual_check', label: 'Conferencia manual' },
    { id: 'reviewing', label: 'Em revisao' },
  ],
  [ROUTINE_STATUS.ERROR]: [
    { id: 'waiting_client', label: 'Aguardando cliente' },
    { id: 'waiting_document', label: 'Aguardando documento' },
    { id: 'system_issue', label: 'Erro no sistema' },
  ],
  [ROUTINE_STATUS.COMPLETED]: [
    { id: 'not_applicable', label: 'Nao se aplica' },
  ],
}

export function getRoutineStatusDetailOptions(status) {
  return [
    defaultRoutineStatusDetailOption,
    ...(routineStatusDetailOptions[status] ?? []),
  ]
}

export function getRoutineStatusDetailLabel(status, detail) {
  if (!detail) return ''

  return (
    getRoutineStatusDetailOptions(status).find((option) => option.id === detail)
      ?.label ?? ''
  )
}
