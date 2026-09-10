import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { memberUserMock } from '../constants/roles'
import {
  AppStateContext,
  type AppStateContextValue,
} from '../contexts/appStateContextDefinition'
import type { RoutineControlData } from '../types/domain'
import CompaniesPage from './CompaniesPage'

const appState = {
  user: memberUserMock,
  competence: '2026-09',
  formattedCompetence: '09/2026',
  preferences: {
    theme: 'light',
    density: 'compact',
    defaultView: 'spreadsheet',
  },
  setCompetence: () => undefined,
  setPreferences: () => undefined,
  goToNextCompetence: () => undefined,
  goToPreviousCompetence: () => undefined,
} satisfies AppStateContextValue

const data: RoutineControlData = {
  departments: [],
  clients: [
    { id: 'without-code', name: 'Empresa sem código' },
    { id: 'with-code', code: '002', name: 'Empresa com código' },
  ],
  routines: [],
  employees: [],
  screens: [],
  spreadsheetProjections: [],
  tasks: [],
}

describe('CompaniesPage', () => {
  it('renders and sorts companies without an internal code', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AppStateContext.Provider value={appState}>
          <CompaniesPage data={data} />
        </AppStateContext.Provider>
      </MemoryRouter>,
    )

    expect(markup).toContain('Não informado')
    expect(markup.indexOf('Empresa com código')).toBeLessThan(
      markup.indexOf('Empresa sem código'),
    )
  })
})
