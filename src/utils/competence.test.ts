import { describe, expect, it } from 'vitest'

import {
  formatCompetence,
  nextCompetence,
  previousCompetence,
} from './competence'

describe('competence utils', () => {
  it('formats competence as month/year', () => {
    expect(formatCompetence('2026-06')).toBe('06/2026')
  })

  it('moves to the next competence', () => {
    expect(nextCompetence('2026-06')).toBe('2026-07')
  })

  it('moves across year boundaries', () => {
    expect(previousCompetence('2026-01')).toBe('2025-12')
    expect(nextCompetence('2026-12')).toBe('2027-01')
  })
})
