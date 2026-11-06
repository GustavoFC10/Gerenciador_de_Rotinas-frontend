import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeProcessTestResource } from '../components/processes/processTestFixtures'
import { groupProcessPage } from './processGroups'
import { formatProcessDays, processVersionFromEtag } from './processPresentation'

afterEach(() => vi.useRealTimers())

describe('process presentation additions', () => {
  it('distinguishes missing samples, zero and durations under a day', () => {
    expect(formatProcessDays(null)).toBe('—')
    expect(formatProcessDays(0)).toBe('0 dias')
    expect(formatProcessDays(0.25)).toBe('Menos de 1 dia')
    expect(formatProcessDays(1)).toBe('1 dia')
    expect(formatProcessDays(12.5)).toBe('12,5 dias')
  })

  it('accepts only a positive safe integer from the deletion ETag', () => {
    expect(processVersionFromEtag('"8"')).toBe(8)
    for (const etag of [undefined, null, '', '"0"', '"-1"', '"1.5"', 'W/"8"', '8', '"9007199254740992"', '"8";alert(1)'])
      expect(processVersionFromEtag(etag)).toBeNull()
  })

  it('groups completion by the organization month, preserving every row and server order', () => {
    const rows = [
      makeProcessTestResource({ id: 'a', status: 'concluido', criadoEm: '2026-01-01T00:00:00Z', concluidoEm: '2026-11-01T01:00:00Z' }),
      makeProcessTestResource({ id: 'b', status: 'agendado' }),
      makeProcessTestResource({ id: 'c', status: 'concluido', concluidoEm: '2026-10-20T12:00:00Z' }),
      makeProcessTestResource({ id: 'd', status: 'concluido', concluidoEm: null }),
    ]
    const groups = groupProcessPage(rows, 'completion', 'America/Sao_Paulo')
    expect(groups[0]?.label).toContain('outubro de 2026')
    expect(groups[0]?.results.map(p => p.id)).toEqual(['a', 'c'])
    expect(groups.flatMap(g => g.results).map(p => p.id).sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(groups.find(g => g.id === 'agendado')?.results[0]?.status).toBe('agendado')
  })

  it('uses saved statuses and local overdue bands without losing records in urgency order', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-06T15:00:00Z'))
    const rows = [
      makeProcessTestResource({ id: 'old', status: 'atrasado', prazo: '2026-09-01' }),
      makeProcessTestResource({ id: 'middle', status: 'atrasado', prazo: '2026-10-20' }),
      makeProcessTestResource({ id: 'recent', status: 'atrasado', prazo: '2026-11-04' }),
      makeProcessTestResource({ id: 'no-due', status: 'atrasado', prazo: null }),
      makeProcessTestResource({ id: 'saved-open', status: 'andamento', prazo: '2000-01-01' }),
      makeProcessTestResource({ id: 'cancelled', status: 'cancelado' }),
    ]
    const groups = groupProcessPage(rows, 'overdue', 'America/Sao_Paulo', 'urgency')
    expect(groups.map(g => g.id)).toEqual(['atrasado:mais', 'atrasado:30', 'atrasado:7', 'atrasado:sem-prazo', 'andamento', 'cancelado'])
    expect(groups.flatMap(g => g.results)).toEqual(rows)
    expect(groupProcessPage(rows, 'status', 'America/Sao_Paulo')[0]?.results).toHaveLength(4)
  })
})
