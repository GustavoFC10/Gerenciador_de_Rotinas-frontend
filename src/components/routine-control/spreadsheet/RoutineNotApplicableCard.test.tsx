import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RoutineNotApplicableCard from './RoutineNotApplicableCard'

describe('RoutineNotApplicableCard', () => {
  it('renders a completely inert marker for an absent client-routine link', () => {
    const markup = renderToStaticMarkup(<RoutineNotApplicableCard />)

    expect(markup).toContain(
      'Não se aplica: rotina não vinculada à empresa',
    )
    expect(markup).toContain(
      'data-routine-applicability="not-applicable"',
    )
    expect(markup).not.toMatch(/<(button|a|input|select|textarea)\b/)
    expect(markup).not.toMatch(
      /tabindex|role="button"|transition|hover:|focus-visible:|active:/,
    )
    expect(markup).not.toContain('title=')
  })
})
