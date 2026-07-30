import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { APP_THEME } from '../constants/designTokens'
import { USER_ROLE } from '../constants/roles'
import { AppStateContext } from '../contexts/appStateContextDefinition'
import type { AppStateContextValue } from '../contexts/appStateContextDefinition'
import { routineControlMock } from '../mocks/routineControl.mock'
import type { AppUser, UserRole } from '../types/domain'
import EntityDetailPage from './EntityDetailPage'

function buildUser(role: UserRole): AppUser {
  return {
    id: `user-${role}`,
    employeeId: 'employee-001',
    name: 'Ana Souza',
    email: 'ana@example.com',
    role,
    departmentIds: ['dept-fiscal'],
    avatarUrl: '',
  }
}

function buildAppState(role: UserRole): AppStateContextValue {
  return {
    user: buildUser(role),
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
}

function renderEntityPage({
  entry,
  route,
  type,
  role = USER_ROLE.EMPLOYEE,
}: {
  entry: string
  route: string
  type: 'client' | 'routine'
  role?: UserRole
}) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
      <AppStateContext.Provider value={buildAppState(role)}>
        <Routes>
          <Route
            path={route}
            element={
              <EntityDetailPage
                type={type}
                data={routineControlMock.data}
                spreadsheetId="fiscal"
                spreadsheetName="Fiscal"
                spreadsheetDepartmentId="dept-fiscal"
                spreadsheetDivisionId="division-fiscal-simples-nacional"
                spreadsheetDivisionName="Simples Nacional"
              />
            }
          />
        </Routes>
      </AppStateContext.Provider>
    </MemoryRouter>,
  )
}

describe('EntityDetailPage', () => {
  it('turns a company list into a company page while preserving the ledger', () => {
    const markup = renderEntityPage({
      entry: '/empresas/client-001?sheetId=fiscal',
      route: '/empresas/:clientId',
      type: 'client',
    })

    expect(markup).toContain('Aurora Comércio Ltda.')
    expect(markup).toContain('Código interno')
    expect(markup).toContain('Simples Nacional')
    expect(markup).toContain('Divisão fiscal')
    expect(markup).toContain(
      'sheetId=fiscal&amp;divisionId=division-fiscal-simples-nacional',
    )
    expect(markup).toContain('Rotinas desta empresa')
    expect(markup).toContain('data-list-view="ledger"')
    expect(markup).toContain('Somente leitura')
    expect(markup).not.toContain('Editar dados')
  })

  it('shows routine configuration and editing entry points to leaders', () => {
    const markup = renderEntityPage({
      entry: '/rotinas/routine-gerar-das?sheetId=fiscal',
      route: '/rotinas/:routineId',
      type: 'routine',
      role: USER_ROLE.LEADER,
    })

    expect(markup).toContain('Gerar DAS')
    expect(markup).toContain('Recorrência')
    expect(markup).toContain('Prazo padrão')
    expect(markup).toContain('Empresas desta rotina')
    expect(markup).toContain('Editar dados')
    expect(markup).toContain('data-list-view="ledger"')
  })

  it('shows an explicit state for an unknown entity', () => {
    const markup = renderEntityPage({
      entry: '/empresas/inexistente?sheetId=fiscal',
      route: '/empresas/:clientId',
      type: 'client',
    })

    expect(markup).toContain('Empresa não encontrada')
    expect(markup).toContain('Voltar para a planilha')
    expect(markup).not.toContain('data-list-view="ledger"')
  })
})
