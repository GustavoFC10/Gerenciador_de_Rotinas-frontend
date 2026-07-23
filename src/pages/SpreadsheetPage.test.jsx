import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SpreadsheetPage from './SpreadsheetPage.jsx'

describe('SpreadsheetPage view switcher', () => {
  it('offers the three spreadsheet styles from the shared switcher', () => {
    const markup = renderToStaticMarkup(
      <SpreadsheetPage
        visibleData={{ clients: [], routines: [], tasks: [] }}
      />,
    )

    expect(markup).toContain('Opção 1')
    expect(markup).toContain('Opção 2')
    expect(markup).toContain('Opção 3')
    expect(markup).toContain('aria-current="true"')
  })
})
