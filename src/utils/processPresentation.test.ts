import { describe, expect, it, vi } from 'vitest'
import { makeProcessTestResource } from '../components/processes/processTestFixtures'
import { processViewFilters } from './processFilters'
import {
  formatProcessDate,
  monthLabel,
  processMonth,
  processStatus,
  shiftMonth,
} from './processPresentation'

describe('process presentation and navigation', () => {
  it('preserves calendar dates and organization timezone boundaries', () => {
    expect(formatProcessDate('2026-10-22', 'America/Sao_Paulo')).toBe(
      '22/10/2026',
    )
    expect(formatProcessDate('2026-11-01T01:00:00Z', 'America/Sao_Paulo')).toBe(
      '31/10/2026',
    )
    expect(
      processMonth('America/Sao_Paulo', new Date('2026-11-01T01:00:00Z')),
    ).toBe('2026-10')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
    expect(monthLabel('2026-10')).toBe('outubro de 2026')
  })
  it('presents only the persisted status, even when analysis or dates disagree', () => {
    const process = makeProcessTestResource({
      status: 'agendado',
      prazo: '2000-01-01',
    })
    expect(processStatus(process)).toEqual({
      tone: 'scheduled',
      label: 'Aguardando liberação',
    })
    expect(processStatus({ ...process, status: 'atrasado' })).toEqual({
      tone: 'error',
      label: 'Atrasado',
    })
    const disagreeing = {
      ...process,
      status: 'andamento' as const,
      analysis: { ...process.analysis, waiting: true, late: true },
    }
    expect(processStatus(disagreeing)).toEqual({
      tone: 'progress',
      label: 'Em andamento',
    })
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2040-01-01'))
      expect(processStatus(process).label).toBe('Aguardando liberação')
    } finally {
      vi.useRealTimers()
    }
  })
  it('maps views to explicit status sets without classifying records locally', () => {
    expect(processViewFilters('ativos')).toEqual({
      status: ['andamento', 'agendado', 'atrasado'],
    })
    expect(processViewFilters('andamento')).toEqual({ status: ['andamento'] })
    expect(processViewFilters('agendados')).toEqual({ status: ['agendado'] })
    expect(processViewFilters('atrasados')).toEqual({ status: ['atrasado'] })
    expect(processViewFilters('todos')).toEqual({})
  })
})
