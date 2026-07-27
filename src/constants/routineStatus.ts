import { statusTone } from './designTokens'
import type {
  RoutineStatus,
  RoutineStatusConfig,
  RoutineStatusDetailOption,
} from '../types/domain'

export const ROUTINE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  ERROR: 'error',
  COMPLETED: 'completed',
  NO_MOVEMENT: 'no_movement',
  NOT_APPLICABLE: 'not_applicable',
} as const satisfies Record<string, RoutineStatus>

export const routineStatusConfig: Record<RoutineStatus, RoutineStatusConfig> = {
  [ROUTINE_STATUS.PENDING]: {
    label: statusTone.pending.label,
    dotClass: statusTone.pending.dot,
    surfaceClass: statusTone.pending.surface,
    cardClass: statusTone.pending.card,
    accentClass: statusTone.pending.accent,
    borderClass: statusTone.pending.border,
  },
  [ROUTINE_STATUS.IN_PROGRESS]: {
    label: statusTone.in_progress.label,
    dotClass: statusTone.in_progress.dot,
    surfaceClass: statusTone.in_progress.surface,
    cardClass: statusTone.in_progress.card,
    accentClass: statusTone.in_progress.accent,
    borderClass: statusTone.in_progress.border,
  },
  [ROUTINE_STATUS.ERROR]: {
    label: statusTone.error.label,
    dotClass: statusTone.error.dot,
    surfaceClass: statusTone.error.surface,
    cardClass: statusTone.error.card,
    accentClass: statusTone.error.accent,
    borderClass: statusTone.error.border,
  },
  [ROUTINE_STATUS.COMPLETED]: {
    label: statusTone.completed.label,
    dotClass: statusTone.completed.dot,
    surfaceClass: statusTone.completed.surface,
    cardClass: statusTone.completed.card,
    accentClass: statusTone.completed.accent,
    borderClass: statusTone.completed.border,
  },
  [ROUTINE_STATUS.NO_MOVEMENT]: {
    label: statusTone.no_movement.label,
    dotClass: statusTone.no_movement.dot,
    surfaceClass: statusTone.no_movement.surface,
    cardClass: statusTone.no_movement.card,
    accentClass: statusTone.no_movement.accent,
    borderClass: statusTone.no_movement.border,
  },
  [ROUTINE_STATUS.NOT_APPLICABLE]: {
    label: statusTone.not_applicable.label,
    dotClass: statusTone.not_applicable.dot,
    surfaceClass: statusTone.not_applicable.surface,
    cardClass: statusTone.not_applicable.card,
    accentClass: statusTone.not_applicable.accent,
    borderClass: statusTone.not_applicable.border,
  },
}

export const defaultRoutineStatusDetailOption: RoutineStatusDetailOption = {
  id: '',
  label: 'Padrao',
}

export const routineStatusDetailOptions: Partial<
  Record<RoutineStatus, RoutineStatusDetailOption[]>
> = {
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

export function getRoutineStatusDetailOptions(
  status: RoutineStatus,
): RoutineStatusDetailOption[] {
  return [
    defaultRoutineStatusDetailOption,
    ...(routineStatusDetailOptions[status] ?? []),
  ]
}

export function getRoutineStatusDetailLabel(
  status: RoutineStatus,
  detail?: string | null,
): string {
  if (!detail) return ''

  return (
    getRoutineStatusDetailOptions(status).find((option) => option.id === detail)
      ?.label ?? ''
  )
}
