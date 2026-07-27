import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SpreadsheetPage from './SpreadsheetPage'

describe('SpreadsheetPage', () => {
  it('renders the selected spreadsheet without a style switcher', () => {
    const markup = renderToStaticMarkup(
      <SpreadsheetPage
        visibleData={{ clients: [], routines: [], tasks: [] }}
      />,
    )

    expect(markup).toContain('data-spreadsheet-variant="round"')
    expect(markup).not.toContain('Trocar visualização da planilha')
  })
})
