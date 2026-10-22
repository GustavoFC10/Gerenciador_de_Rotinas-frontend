import type { ProcessCatalog, ProcessResource } from '../types/processes'
import { formatProcessMoney } from './processMoney'

export const PROCESS_SECTORS = {
  com: 'Diretoria',
  fin: 'Financeiro',
  reg: 'Regularidade',
} as const

export function processStatus(process: ProcessResource) {
  if (process.status === 'concluido')
    return { tone: 'completed', label: 'Concluído' }
  if (process.status === 'cancelado')
    return { tone: 'pending', label: 'Cancelado' }
  if (process.analysis.waiting) return { tone: 'scheduled', label: 'Agendado' }
  if (process.analysis.late) return { tone: 'error', label: 'Atrasado' }
  return { tone: 'progress', label: 'Em andamento' }
}

export function processTypeName(catalog: ProcessCatalog, tipo: string) {
  return catalog.types.find((type) => type.id === tipo)?.nome ?? tipo
}

export function formatProcessDate(
  value: string | null | undefined,
  timeZone = 'America/Sao_Paulo',
) {
  if (!value) return '—'
  // A date-only field is a calendar date, independent of UTC conversion.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return value.split('-').reverse().join('/')
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('pt-BR', { timeZone })
}

export function processMonth(
  timeZone = 'America/Sao_Paulo',
  date = new Date(),
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  return `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}`
}

export function monthLabel(month: string) {
  const [year, number] = month.split('-').map(Number)
  return new Date(year, number - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

export function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(year, number - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatBRL(value: string | number | null | undefined) {
  if (value == null || value === '') return 'Não informado'
  return formatProcessMoney(value)
}

export function processAge(process: ProcessResource) {
  return Math.max(
    0,
    Math.floor(
      (new Date(process.concluidoEm ?? Date.now()).getTime() -
        new Date(process.criadoEm).getTime()) /
        86_400_000,
    ),
  )
}

export function processDaysUntilDue(
  process: ProcessResource,
  timeZone = 'America/Sao_Paulo',
) {
  if (
    !process.prazo ||
    process.status !== 'andamento' ||
    process.analysis.waiting
  )
    return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const today = `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}-${parts.find((part) => part.type === 'day')!.value}`
  return Math.round(
    (Date.parse(process.prazo) - Date.parse(today)) / 86_400_000,
  )
}

export function processDaysLate(
  process: ProcessResource,
  timeZone = 'America/Sao_Paulo',
) {
  if (!process.prazo || !process.analysis.late) return 0
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const today = `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}-${parts.find((part) => part.type === 'day')!.value}`
  return Math.max(
    0,
    Math.round((Date.parse(today) - Date.parse(process.prazo)) / 86_400_000),
  )
}
