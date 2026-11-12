import type { HonorariosParams, HonorariosProfile } from '../types/honorarios'

export const regimeNames = {
  mei: 'MEI',
  simples: 'Simples Nacional',
  presumido: 'Lucro presumido',
  real: 'Lucro real',
}
export const quoteStatusNames = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aceito: 'Aceito',
  recusado: 'Recusado',
}

export function money(value: string | number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

export function date(value: string | null | undefined): string {
  if (!value) return 'Não informada'
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString('pt-BR')
}

export function defaultProfile(params?: HonorariosParams): HonorariosProfile {
  return {
    regime: 'simples',
    segmento: params?.segmentos[0]?.id ?? 'servicos',
    inativa: false,
    funcionarios: 0,
    socios: 1,
    xml: 0,
    notas: 0,
    emiteNF: false,
    filiais: 0,
    filiaisInativas: 0,
    faturamento: '0.00',
    usarHoras: false,
    horas: '0.00',
    servicos: [],
    anomalias: [],
  }
}

export function downloadText(
  text: string,
  filename: string,
  type = 'text/html;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
