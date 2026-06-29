import { statusTone } from './designTokens.js'

export const ROUTINE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  ERROR: 'error',
  COMPLETED: 'completed',
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
}
