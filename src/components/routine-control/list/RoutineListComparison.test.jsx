import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RoutineListComparison from './RoutineListComparison.jsx'
import RoutineListViewSwitcher from './RoutineListViewSwitcher.jsx'
import { buildRoutineListSampleItems } from './routineListSample.js'
import { ROUTINE_LIST_PRESENTATION } from './routineListUtils.js'

const items = buildRoutineListSampleItems().slice(0, 5)

function renderList(viewMode) {
  return renderToStaticMarkup(
    <RoutineListComparison
      items={items}
      viewMode={viewMode}
      showHeader={false}
    />,
  )
}

describe('RoutineListComparison presentations', () => {
  it('keeps the current compact queue as option one', () => {
    const markup = renderList(ROUTINE_LIST_PRESENTATION.OPERATIONAL)

    expect(markup).toContain('data-list-view="operational"')
    expect(markup).toContain('Em andamento')
    expect(markup).not.toContain('data-list-card="tracking"')
    expect(markup).not.toContain('data-list-card="ledger"')
  })

  it('renders tracking cards grouped by macro flow', () => {
    const markup = renderList(ROUTINE_LIST_PRESENTATION.TRACKING)

    expect(markup).toContain('data-list-view="tracking"')
    expect(markup).toContain('data-list-card="tracking"')
    expect(markup).toContain('Requer atenção')
    expect(markup).toContain('Em execução')
    expect(markup).toContain('Contexto')
  })

  it('renders an operational ledger grouped by status', () => {
    const markup = renderList(ROUTINE_LIST_PRESENTATION.LEDGER)

    expect(markup).toContain('data-list-view="ledger"')
    expect(markup).toContain('data-list-card="ledger"')
    expect(markup).toContain('Responsável')
    expect(markup).toContain('Em andamento')
    expect(markup).toContain('Execução')
  })

  it('offers the three versions in the page-level switcher', () => {
    const markup = renderToStaticMarkup(
      <RoutineListViewSwitcher value={ROUTINE_LIST_PRESENTATION.TRACKING} />,
    )

    expect(markup).toContain('Opção 1 · Fila compacta')
    expect(markup).toContain('Opção 2 · Acompanhamento')
    expect(markup).toContain('Opção 3 · Registro operacional')
    expect(markup).toContain('aria-current="true"')
  })
})
