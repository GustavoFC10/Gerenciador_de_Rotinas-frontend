import { describe, expect, it } from 'vitest'

import {
  formatCompetence,
  formatCompetenceLong,
  getCurrentCompetence,
  nextCompetence,
  previousCompetence,
} from './competence'

describe('competence utils', () => {
  it('formats competence as month/year', () => {
    expect(formatCompetence('2026-06')).toBe('06/2026')
  })

  it('formats competence with the month written in Portuguese', () => {
    expect(formatCompetenceLong('2026-07')).toBe('Julho de 2026')
  })

  it('returns an empty label for an invalid competence', () => {
    expect(formatCompetenceLong('2026-13')).toBe('')
  })

  it('moves to the next competence', () => {
    expect(nextCompetence('2026-06')).toBe('2026-07')
  })

  it('moves across year boundaries', () => {
    expect(previousCompetence('2026-01')).toBe('2025-12')
    expect(nextCompetence('2026-12')).toBe('2027-01')
  })

  it('uses the organization timezone to determine the current month', () => {
    const now = new Date('2026-03-01T02:30:00.000Z')

    expect(getCurrentCompetence('America/Sao_Paulo', now)).toBe('2026-02')
    expect(getCurrentCompetence('Asia/Tokyo', now)).toBe('2026-03')
  })

  it('falls back to UTC when the timezone is invalid', () => {
    expect(
      getCurrentCompetence(
        'invalid/timezone',
        new Date('2026-03-01T02:30:00.000Z'),
      ),
    ).toBe('2026-03')
  })
})
