import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { APP_THEME } from '../constants/designTokens'
import { managerUserMock } from '../constants/roles'
import { AppStateContext } from '../contexts/appStateContextDefinition'
import type { AppStateContextValue } from '../contexts/appStateContextDefinition'
import { routineControlMock } from '../mocks/routineControl.mock'
import CompaniesPage from './CompaniesPage'
import EmployeesPage from './EmployeesPage'
import RoutinesPage from './RoutinesPage'

const appState: AppStateContextValue = {
  user: managerUserMock,
  competence: '2026-06',
  formattedCompetence: '06/2026',
  preferences: {
    theme: APP_THEME.LIGHT,
    density: 'compact',
    defaultView: 'spreadsheet',
  },
  setCompetence: () => undefined,
  setPreferences: () => undefined,
  goToNextCompetence: () => undefined,
  goToPreviousCompetence: () => undefined,
}

function renderPage(page: React.ReactNode) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AppStateContext.Provider value={appState}>
        {page}
      </AppStateContext.Provider>
    </MemoryRouter>,
  )
}

describe('catalog pages', () => {
  it('lists every company independently from the selected spreadsheet', () => {
    const markup = renderPage(<CompaniesPage data={routineControlMock.data} />)

    expect(markup).toContain('Todas as empresas')
    expect(markup).toContain('Aurora Comércio Ltda.')
    expect(markup).toContain('source=catalog')
    expect(markup).toContain('Adicionar empresa')
  })

  it('lists general routines with their complete schedule', () => {
    const markup = renderPage(<RoutinesPage data={routineControlMock.data} />)

    expect(markup).toContain('Todas as rotinas')
    expect(markup).toContain('Transmitir DASN-SIMEI')
    expect(markup).toContain('Mai · dia 31')
    expect(markup).toContain('Criar rotina')
  })

  it('lists employees with role and department scope', () => {
    const markup = renderPage(<EmployeesPage data={routineControlMock.data} />)

    expect(markup).toContain('Todos os funcionários')
    expect(markup).toContain('Carla Melo')
    expect(markup).toContain('Administrador')
    expect(markup).toContain('Fiscal')
    expect(markup).toContain('Adicionar funcionário')
  })
})
