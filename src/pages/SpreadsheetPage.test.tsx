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
    expect(markup).toContain('Planilha')
    expect(markup).toContain('Fiscal')
    expect(markup).toContain('0 empresas · 0 rotinas')
    expect(markup).toContain('Planilha Fiscal</caption>')
    expect(markup).not.toContain('Planilha operacional')
    expect(markup).not.toContain('Controle operacional')
    expect(markup).not.toContain('Trocar visualização da planilha')
  })
})
