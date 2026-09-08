import type { Routine, RoutineRecurrence } from '../types/domain'

export interface RoutineScheduleValue {
  defaultDueDays?: number
  recurrenceMonths?: number[]
}

export interface RecurrenceCycleOption {
  value: string
  label: string
  months: number[]
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

export const quarterlyCycleOptions = buildCycleOptions(3)
export const semiannualCycleOptions = buildCycleOptions(6)

export function getCycleOptions(
  recurrence: RoutineRecurrence,
): RecurrenceCycleOption[] {
  if (recurrence === 'quarterly') return quarterlyCycleOptions
  if (recurrence === 'semiannual') return semiannualCycleOptions
  return []
}

export function getRoutineScheduleError(
  recurrence: RoutineRecurrence,
  schedule: RoutineScheduleValue,
): string | null {
  if (
    !Number.isInteger(schedule.defaultDueDays) ||
    (schedule.defaultDueDays ?? -1) < 0 ||
    (schedule.defaultDueDays ?? 0) > 3750
  ) {
    return 'Informe um prazo inteiro entre 0 e 3.750 dias.'
  }

  if (recurrence === 'on_demand' || recurrence === 'monthly') return null

  const months = normalizeMonths(schedule.recurrenceMonths)
  if (recurrence === 'annual') {
    return months.length === 1 ? null : 'Selecione o mês da rotina anual.'
  }

  const isKnownCycle = getCycleOptions(recurrence).some((option) =>
    haveSameMonths(option.months, months),
  )

  if (!isKnownCycle) {
    return recurrence === 'quarterly'
      ? 'Selecione um ciclo trimestral.'
      : 'Selecione um ciclo semestral.'
  }

  return null
}

export function normalizeRoutineSchedule(
  recurrence: RoutineRecurrence,
  schedule: RoutineScheduleValue,
): RoutineScheduleValue {
  return {
    defaultDueDays: schedule.defaultDueDays,
    recurrenceMonths:
      recurrence === 'quarterly' ||
      recurrence === 'semiannual' ||
      recurrence === 'annual'
        ? normalizeMonths(schedule.recurrenceMonths)
        : [],
  }
}

export function formatRoutineSchedule(
  routine: Pick<Routine, 'recurrence' | 'defaultDueDays' | 'recurrenceMonths'>,
): string {
  const recurrence = routine.recurrence ?? 'monthly'
  const days = routine.defaultDueDays
  const dueLabel =
    typeof days === 'number'
      ? days === 0
        ? 'no início da competência'
        : String(days) +
          ' ' +
          (days === 1 ? 'dia' : 'dias') +
          ' após o início da competência'
      : 'prazo não informado'

  if (recurrence === 'on_demand') return 'Sob demanda · ' + dueLabel
  if (recurrence === 'monthly') return 'Mensal · ' + dueLabel

  const months = normalizeMonths(routine.recurrenceMonths)
  const monthLabels = months.map(
    (month) =>
      monthOptions.find((option) => option.value === month)?.shortLabel ??
      String(month),
  )

  return (
    (monthLabels.length ? monthLabels.join(', ') : 'Conforme recorrência') +
    ' · ' +
    dueLabel
  )
}

export function isRoutineScheduledForPeriod(
  routine: Routine,
  period: string,
): boolean {
  const recurrence = routine.recurrence ?? 'monthly'
  if (recurrence === 'on_demand') return false
  if (recurrence === 'monthly') return true

  const month = Number(period.slice(5, 7))
  return normalizeMonths(routine.recurrenceMonths).includes(month)
}

export function buildRoutineDueDate(
  routine: Routine,
  period: string,
  generatedAt: string,
): string {
  void generatedAt

  if (!/^(\d{4})-(\d{2})$/.test(period)) {
    throw new Error('Competência inválida. Use o formato AAAA-MM.')
  }

  return addCalendarDays(period + '-01', routine.defaultDueDays ?? 0)
}

export function normalizeMonths(months?: number[]): number[] {
  return [...new Set(months ?? [])]
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
    .sort((left, right) => left - right)
}

function buildCycleOptions(interval: 3 | 6): RecurrenceCycleOption[] {
  return Array.from({ length: interval }, (_, index) => {
    const months: number[] = []

    for (let month = index + 1; month <= 12; month += interval) {
      months.push(month)
    }

    return {
      value: months.join('-'),
      label: months
        .map(
          (month) =>
            monthOptions.find((option) => option.value === month)?.label ??
            String(month),
        )
        .join(' / '),
      months,
    }
  })
}

function haveSameMonths(left: number[], right: number[]): boolean {
  return (
    left.length === right.length &&
    left.every((month, index) => month === right[index])
  )
}

function addCalendarDays(dateValue: string, dueDays: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  if (!match) throw new Error('Data base inválida para calcular o prazo.')

  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]) + dueDays,
    ),
  )
  return date.toISOString().slice(0, 10)
}
