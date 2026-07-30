import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import SpreadsheetPage from './SpreadsheetPage'

describe('SpreadsheetPage', () => {
  it('renders the selected spreadsheet without a style switcher', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SpreadsheetPage
          divisionName="Simples Nacional"
          selectedDivisionId="division-fiscal-simples-nacional"
          divisions={[
            {
              id: 'division-fiscal-mei',
              departmentId: 'dept-fiscal',
              name: 'MEI',
              to: '/planilha?sheetId=fiscal&divisionId=division-fiscal-mei',
            },
            {
              id: 'division-fiscal-simples-nacional',
              departmentId: 'dept-fiscal',
              name: 'Simples Nacional',
              to: '/planilha?sheetId=fiscal&divisionId=division-fiscal-simples-nacional',
            },
            {
              id: 'division-fiscal-lucro-presumido',
              departmentId: 'dept-fiscal',
              name: 'Lucro Presumido',
              to: '/planilha?sheetId=fiscal&divisionId=division-fiscal-lucro-presumido',
            },
          ]}
          visibleData={{
            clients: [],
            routines: [],
            clientRoutineLinks: [],
            tasks: [],
          }}
        />
      </MemoryRouter>,
    )

    expect(markup).toContain('data-spreadsheet-variant="round"')
    expect(markup).toContain('Departamento')
    expect(markup).toContain('Fiscal')
    expect(markup).toContain('Simples Nacional · 0 empresas · 0 rotinas')
    expect(markup).toContain('Planilha Fiscal — Simples Nacional</caption>')
    expect(markup).toContain('aria-label="Planilhas do departamento Fiscal"')
    expect(markup).toContain('aria-current="page"')
    expect(markup).toContain('Lucro Presumido')
    expect(markup).not.toContain('Planilha operacional')
    expect(markup).not.toContain('Controle operacional')
    expect(markup).not.toContain('Editar vínculos')
    expect(markup).not.toContain('Trocar visualização da planilha')
  })
})
