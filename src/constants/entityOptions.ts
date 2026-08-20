import type { RoutineRecurrence } from '../types/domain'

export const clientTaxRegimeOptions: Array<{
  value: string
  label: string
}> = [
  { value: 'Simples Nacional', label: 'Simples Nacional' },
  { value: 'Lucro Presumido', label: 'Lucro Presumido' },
  { value: 'Lucro Real', label: 'Lucro Real' },
  { value: 'MEI', label: 'MEI' },
  { value: 'Outro', label: 'Outro' },
]

export const routineRecurrenceOptions: Array<{
  value: RoutineRecurrence
  label: string
}> = [
  { value: 'on_demand', label: 'Sob demanda' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
]

export function getClientTaxRegimeLabel(value?: string): string {
  if (!value?.trim()) return 'Não informado'

  return (
    clientTaxRegimeOptions.find((option) => option.value === value)?.label ??
    legacyTaxRegimeLabels[value] ??
    value
  )
}

const legacyTaxRegimeLabels: Record<string, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  mei: 'MEI',
  other: 'Outro',
}

export function getRoutineRecurrenceLabel(value?: RoutineRecurrence): string {
  return (
    routineRecurrenceOptions.find((option) => option.value === value)?.label ??
    'Não definida'
  )
}
