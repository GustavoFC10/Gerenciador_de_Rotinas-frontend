import type { ClientTaxRegime, RoutineRecurrence } from '../types/domain'

export const clientTaxRegimeOptions: Array<{
  value: ClientTaxRegime
  label: string
}> = [
  { value: 'simples_nacional', label: 'Simples Nacional' },
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real', label: 'Lucro Real' },
  { value: 'mei', label: 'MEI' },
  { value: 'other', label: 'Outro' },
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
  { value: 'custom', label: 'Personalizada' },
]

export function getClientTaxRegimeLabel(value?: ClientTaxRegime): string {
  return (
    clientTaxRegimeOptions.find((option) => option.value === value)?.label ??
    'Não informado'
  )
}

export function getRoutineRecurrenceLabel(value?: RoutineRecurrence): string {
  return (
    routineRecurrenceOptions.find((option) => option.value === value)?.label ??
    'Não definida'
  )
}
