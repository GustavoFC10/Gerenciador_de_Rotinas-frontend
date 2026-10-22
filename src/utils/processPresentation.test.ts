import { describe, expect, it } from 'vitest'
import { makeProcessTestResource } from '../components/processes/processTestFixtures'
import { inProcessView } from './processFilters'
import {
  formatProcessDate,
  monthLabel,
  processMonth,
  processStatus,
  shiftMonth,
} from './processPresentation'

describe('process presentation and filters', () => {
  it('preserves calendar dates and uses organization timezone for monthly boundaries', () => {
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
  it('uses server waiting and lateness rather than recomputing release rules in the browser', () => {
    const scheduled = makeProcessTestResource({
      prazo: '2000-01-01',
      analysis: {
        currentStage: 0,
        completedTasks: 0,
        totalTasks: 1,
        waiting: true,
        late: false,
        releaseDate: '2027-02-22',
        pendingSectors: ['fin'],
      },
    })
    expect(processStatus(scheduled)).toEqual({
      tone: 'scheduled',
      label: 'Agendado',
    })
    expect(inProcessView(scheduled, 'agendados')).toBe(true)
    expect(inProcessView(scheduled, 'atrasados')).toBe(false)
    expect(inProcessView(scheduled, 'fila', 'fin')).toBe(false)
  })
})
