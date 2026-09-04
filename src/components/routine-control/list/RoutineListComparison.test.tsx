import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RoutineListComparison from './RoutineListComparison'
import { buildRoutineListSampleItems } from './routineListSample'

const items = buildRoutineListSampleItems().slice(0, 5)

function renderList() {
  return renderToStaticMarkup(
    <RoutineListComparison
      items={items}
      showHeader={false}
      onItemQuickAction={() => undefined}
      onItemStatusChange={() => undefined}
    />,
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
    expect(markup).toContain('data-status-menu-trigger="true"')
    expect(markup).not.toContain('<details')
    expect(markup).not.toContain('Confirmar estado')
    expect(markup).not.toContain(
      'grid-cols-[minmax(15rem,1fr)_6rem_9rem_8rem_18rem]',
    )
    expect(markup).toContain('Ações de')
    expect(markup).toContain('aria-keyshortcuts="Shift+F10"')
    expect(markup).not.toContain('Trocar visualização da lista')
  })
})
