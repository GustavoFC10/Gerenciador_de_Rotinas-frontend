import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RoutineListComparison from './RoutineListComparison'
import { buildRoutineListSampleItems } from './routineListSample'

const items = buildRoutineListSampleItems().slice(0, 5)

function renderList() {
  return renderToStaticMarkup(
    <RoutineListComparison items={items} showHeader={false} />,
  )
}

describe('RoutineListComparison', () => {
  it('keeps the selected operational ledger', () => {
    const markup = renderList()

    expect(markup).toContain('data-list-view="ledger"')
    expect(markup).toContain('data-list-card="ledger"')
    expect(markup).toContain('Responsável')
    expect(markup).toContain('Em andamento')
    expect(markup).toContain('Execução')
    expect(markup).not.toContain('Trocar visualização da lista')
  })
})
