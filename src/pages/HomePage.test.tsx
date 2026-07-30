import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { APP_THEME } from '../constants/designTokens'
import { USER_ROLE } from '../constants/roles'
import { AppStateContext } from '../contexts/appStateContextDefinition'
import type { AppStateContextValue } from '../contexts/appStateContextDefinition'
import { routineControlMock } from '../mocks/routineControl.mock'
import type { AppUser, UserRole } from '../types/domain'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import HomePage from './HomePage'

const spreadsheets: SpreadsheetNavigationItem[] = [
  {
    id: 'fiscal',
    departmentId: 'dept-fiscal',
    name: 'Fiscal',
    description: 'Clientes e rotinas',
    to: '/planilha?sheetId=fiscal',
  },
]

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

function buildAppState(
  role: UserRole,
  competence = '2026-06',
): AppStateContextValue {
  return {
    user: buildUser(role),
    competence,
    formattedCompetence:
      competence === '2026-06' ? 'jun. de 2026' : 'jul. de 2026',
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

function renderHome({
  role = USER_ROLE.EMPLOYEE,
  competence = '2026-06',
}: {
  role?: UserRole
  competence?: string
} = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AppStateContext.Provider value={buildAppState(role, competence)}>
        <HomePage
          data={routineControlMock.data}
          spreadsheets={spreadsheets}
          generatedAt={routineControlMock.meta.generatedAt}
          onTaskOpen={() => undefined}
        />
      </AppStateContext.Provider>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('prioritizes workspaces and personal operational work', () => {
    const markup = renderHome()

    expect(markup).toContain('>Início</h1>')
    expect(markup).toContain('Áreas de trabalho')
    expect(markup).toContain('href="/planilha?sheetId=fiscal"')
    expect(markup).toContain('Prioridades')
    expect(markup).toContain('Minha competência')
    expect(markup).toContain('Somente tarefas atribuídas a você.')
    expect(markup.indexOf('Áreas de trabalho')).toBeLessThan(
      markup.indexOf('Prioridades'),
    )
    expect(markup).not.toContain('Acompanhamento do departamento')
    expect(markup).not.toContain('Visão da operação')
  })

  it('shows additive role modules without replacing personal work', () => {
    const leaderMarkup = renderHome({ role: USER_ROLE.LEADER })
    const managerMarkup = renderHome({ role: USER_ROLE.MANAGER })

    expect(leaderMarkup).toContain('Minha competência')
    expect(leaderMarkup).toContain('Acompanhamento do departamento')
    expect(leaderMarkup).toContain('href="/dashboard-departamento"')
    expect(managerMarkup).toContain('Minha competência')
    expect(managerMarkup).toContain('Visão da operação')
    expect(managerMarkup).toContain('href="/dashboard-geral"')
  })

  it('shows honest empty personal states when the selected competence has no data', () => {
    const markup = renderHome({ competence: '2026-07' })

    expect(markup).toContain('Tudo em dia nesta competência')
    expect(markup).toContain(
      'Você não tem tarefas atribuídas nesta competência.',
    )
    expect(markup).toContain('Sem tarefas atribuídas nesta competência')
  })
})
