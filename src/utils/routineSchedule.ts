import type { Routine, RoutineRecurrence } from '../types/domain'

export interface RoutineScheduleValue {
  defaultDueDate?: string
  defaultDueDay?: number
  recurrenceMonths?: number[]
}

export const monthOptions = [
  { value: 1, label: 'Janeiro', shortLabel: 'Jan' },
  { value: 2, label: 'Fevereiro', shortLabel: 'Fev' },
  { value: 3, label: 'Março', shortLabel: 'Mar' },
  { value: 4, label: 'Abril', shortLabel: 'Abr' },
  { value: 5, label: 'Maio', shortLabel: 'Mai' },
  { value: 6, label: 'Junho', shortLabel: 'Jun' },
  { value: 7, label: 'Julho', shortLabel: 'Jul' },
  { value: 8, label: 'Agosto', shortLabel: 'Ago' },
  { value: 9, label: 'Setembro', shortLabel: 'Set' },
  { value: 10, label: 'Outubro', shortLabel: 'Out' },
  { value: 11, label: 'Novembro', shortLabel: 'Nov' },
  { value: 12, label: 'Dezembro', shortLabel: 'Dez' },
] as const

export function getExpectedMonthCount(
  recurrence: RoutineRecurrence,
): number | null {
  if (recurrence === 'quarterly') return 4
  if (recurrence === 'semiannual') return 2
  if (recurrence === 'annual') return 1
  return null
}

export function getRoutineScheduleError(
  recurrence: RoutineRecurrence,
  schedule: RoutineScheduleValue,
): string | null {
  if (recurrence === 'on_demand') {
    if (!schedule.defaultDueDate || !isValidCalendarDate(schedule.defaultDueDate)) {
      return 'Informe uma data específica válida.'
    }
    return null
  }

  if (!Number.isInteger(schedule.defaultDueDay)) {
    return 'Informe o dia de vencimento.'
  }

  if (
    (schedule.defaultDueDay ?? 0) < 1 ||
    (schedule.defaultDueDay ?? 0) > 31
  ) {
    return 'O dia de vencimento deve estar entre 1 e 31.'
  }

  if (recurrence === 'monthly') return null

  const months = normalizeMonths(schedule.recurrenceMonths)
  const expectedCount = getExpectedMonthCount(recurrence)

  if (expectedCount !== null && months.length !== expectedCount) {
    return `Selecione ${expectedCount} ${
      expectedCount === 1 ? 'mês' : 'meses'
    } para esta recorrência.`
  }

  if (recurrence === 'custom' && months.length === 0) {
    return 'Selecione pelo menos um mês.'
  }

  return null
}

export function normalizeRoutineSchedule(
  recurrence: RoutineRecurrence,
  schedule: RoutineScheduleValue,
): RoutineScheduleValue {
  if (recurrence === 'on_demand') {
    return {
      defaultDueDate: schedule.defaultDueDate,
      defaultDueDay: undefined,
      recurrenceMonths: undefined,
    }
  }

  if (recurrence === 'monthly') {
    return {
      defaultDueDate: undefined,
      defaultDueDay: schedule.defaultDueDay,
      recurrenceMonths: undefined,
    }
  }

  return {
    defaultDueDate: undefined,
    defaultDueDay: schedule.defaultDueDay,
    recurrenceMonths: normalizeMonths(schedule.recurrenceMonths),
  }
}

export function formatRoutineSchedule(
  routine: Pick<
    Routine,
    | 'recurrence'
    | 'defaultDueDate'
    | 'defaultDueDay'
    | 'defaultDueDays'
    | 'recurrenceMonths'
  >,
): string {
  const recurrence = routine.recurrence

  if (recurrence === 'on_demand') {
    return routine.defaultDueDate
      ? `Data específica: ${formatDate(routine.defaultDueDate)}`
      : 'Data definida ao criar a tarefa'
  }

  if (routine.defaultDueDays) {
    return `${routine.defaultDueDays} ${
      routine.defaultDueDays === 1 ? 'dia' : 'dias'
    } após criar a tarefa`
  }

  if (!routine.defaultDueDay) return 'Prazo definido na tarefa'
  if (!recurrence || recurrence === 'monthly') {
    return `Todo mês, dia ${routine.defaultDueDay}`
  }

  const months = normalizeMonths(routine.recurrenceMonths)
  if (months.length === 0) {
    return `Dia ${routine.defaultDueDay}, conforme a recorrência`
  }

  const monthLabels = months.map(
    (month) =>
      monthOptions.find((option) => option.value === month)?.shortLabel ??
      String(month),
  )

  return `${monthLabels.join(', ')} · dia ${routine.defaultDueDay}`
}

export function isRoutineScheduledForPeriod(
  routine: Routine,
  period: string,
): boolean {
  const recurrence = routine.recurrence ?? 'monthly'
  if (recurrence === 'on_demand') return false
  if (recurrence === 'monthly') return true

  const month = Number(period.slice(5, 7))
  const configuredMonths = normalizeMonths(routine.recurrenceMonths)
  if (configuredMonths.length > 0) return configuredMonths.includes(month)
  if (recurrence === 'custom') return false

  const target = parsePeriod(period)
  const anchor = routine.recurrenceAnchorPeriod
    ? parsePeriod(routine.recurrenceAnchorPeriod)
    : getLegacyAnchor(target.year, recurrence)
  const interval = {
    quarterly: 3,
    semiannual: 6,
    annual: 12,
  }[recurrence]
  const difference = target.index - anchor.index

  return difference >= 0 && difference % interval === 0
}

export function buildRoutineDueDate(
  routine: Routine,
  period: string,
  generatedAt: string,
): string {
  if (routine.defaultDueDate) return routine.defaultDueDate

  if (routine.defaultDueDays) {
    return addCalendarDays(generatedAt, routine.defaultDueDays)
  }

  const dueDay = routine.defaultDueDay ?? 20
  const { year, month } = parsePeriod(period)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return `${period}-${String(Math.min(dueDay, lastDay)).padStart(2, '0')}`
}

export function normalizeMonths(months?: number[]): number[] {
  return [...new Set(months ?? [])]
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
    .sort((left, right) => left - right)
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )
  return date.toISOString().slice(0, 10) === value
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function parsePeriod(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  const year = Number(match?.[1])
  const month = Number(match?.[2])

  if (!match || !Number.isInteger(year) || month < 1 || month > 12) {
    throw new Error('Competência inválida. Use o formato AAAA-MM.')
  }

  return {
    year,
    month,
    index: year * 12 + month - 1,
  }
}

function getLegacyAnchor(
  year: number,
  recurrence: 'quarterly' | 'semiannual' | 'annual',
) {
  const month =
    recurrence === 'quarterly' ? 3 : recurrence === 'semiannual' ? 6 : 12
  return parsePeriod(`${year}-${String(month).padStart(2, '0')}`)
}

function addCalendarDays(generatedAt: string, dueDays: number): string {
  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(generatedAt)
  const baseDate = calendarDate
    ? new Date(
        Date.UTC(
          Number(calendarDate[1]),
          Number(calendarDate[2]) - 1,
          Number(calendarDate[3]),
        ),
      )
    : new Date(generatedAt)

  baseDate.setUTCDate(baseDate.getUTCDate() + dueDays)
  return baseDate.toISOString().slice(0, 10)
}
