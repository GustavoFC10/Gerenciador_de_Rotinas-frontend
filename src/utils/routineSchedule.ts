import type { Routine, RoutineRecurrence } from '../types/domain'

export interface RoutineScheduleValue {
  defaultDueDays?: number
  defaultDueDay?: number
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
  if (recurrence === 'on_demand') {
    if (
      !Number.isInteger(schedule.defaultDueDays) ||
      (schedule.defaultDueDays ?? 0) < 1 ||
      (schedule.defaultDueDays ?? 0) > 365
    ) {
      return 'Informe um prazo entre 1 e 365 dias após a criação.'
    }
    return null
  }

  if (
    !Number.isInteger(schedule.defaultDueDay) ||
    (schedule.defaultDueDay ?? 0) < 1 ||
    (schedule.defaultDueDay ?? 0) > 31
  ) {
    return 'Informe um dia do mês entre 1 e 31.'
  }

  if (recurrence === 'monthly') return null

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
  if (recurrence === 'on_demand') {
    return {
      defaultDueDays: schedule.defaultDueDays,
      defaultDueDay: undefined,
      recurrenceMonths: undefined,
    }
  }

  if (recurrence === 'monthly') {
    return {
      defaultDueDays: undefined,
      defaultDueDay: schedule.defaultDueDay,
      recurrenceMonths: undefined,
    }
  }

  return {
    defaultDueDays: undefined,
    defaultDueDay: schedule.defaultDueDay,
    recurrenceMonths: normalizeMonths(schedule.recurrenceMonths),
  }
}

export function formatRoutineSchedule(
  routine: Pick<
    Routine,
    'recurrence' | 'defaultDueDay' | 'defaultDueDays' | 'recurrenceMonths'
  >,
): string {
  const recurrence = routine.recurrence

  if (recurrence === 'on_demand') {
    return routine.defaultDueDays
      ? `${routine.defaultDueDays} ${
          routine.defaultDueDays === 1 ? 'dia' : 'dias'
        } após criar a tarefa`
      : 'Prazo definido ao criar a tarefa'
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
  if (routine.recurrence === 'on_demand' && routine.defaultDueDays) {
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
