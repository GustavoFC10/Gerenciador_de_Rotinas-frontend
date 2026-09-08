/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { adminUserMock } from '../constants/roles'
import { ROUTES } from '../constants/routes'
import { AppStateContext } from '../contexts/appStateContextDefinition'
import type { AppStateContextValue } from '../contexts/appStateContextDefinition'
import { AuthContext } from '../contexts/authContextDefinition'
import type { AuthContextValue } from '../contexts/authContextDefinition'
import type { SpreadsheetContext } from '../hooks/useSpreadsheetContext'
import type { RoutineControlData } from '../types/domain'
import AuthenticatedRoutes from './AuthenticatedRoutes'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  document.body.innerHTML = ''
})

describe('AuthenticatedRoutes', () => {
  it('keeps the profile available while operational data is unavailable', async () => {
    await renderRoutes(ROUTES.PROFILE, null)

    expect(host.textContent).toContain('Perfil')
    expect(host.textContent).not.toContain('Carregando dados operacionais')
  })

  it('redirects an unknown operational route to the home route', async () => {
    await renderRoutes('/route-that-does-not-exist', emptyOperationalData)

    expect(host.querySelector('[data-location]')?.textContent).toBe(ROUTES.HOME)
  })
})

async function renderRoutes(
  initialEntry: string,
  data: RoutineControlData | null,
) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthContext.Provider value={authValue}>
          <AppStateContext.Provider value={appStateValue}>
            <AuthenticatedRoutes
              data={data}
              generatedAt="2026-08-01T00:00:00.000Z"
              competence="2026-08"
              competenceStatus="projected"
              spreadsheetContext={spreadsheetContext}
              taskDetails={{} as never}
              isOperationalDataLoading={false}
              operationalDataError={data ? null : new Error('Unavailable')}
              onRetryOperationalData={() => undefined}
              onCompetenceFinalize={unimplemented}
              onCompanyCreate={unimplemented}
              onCompanyUpdate={unimplemented}
              onCompanyArchive={unimplemented}
              onRoutineCreate={unimplemented}
              onRoutineUpdate={unimplemented}
              onEmployeeInvite={unimplemented}
              onDepartmentCreate={unimplemented}
              onScreenCreate={unimplemented}
              onScreenUpdate={unimplemented}
            />
            <LocationProbe />
          </AppStateContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )
  })
}

function LocationProbe() {
  const location = useLocation()

  return <output data-location>{location.pathname}</output>
}

async function unimplemented(): Promise<never> {
  throw new Error('This action should not be called in this test.')
}

const authValue: AuthContextValue = {
  session: null,
  user: adminUserMock,
  memberships: [
    {
      id: adminUserMock.membershipId,
      displayName: adminUserMock.name,
      role: adminUserMock.role,
      status: 'active',
      organization: {
        id: 'organization-1',
        name: 'Organization',
        slug: 'organization',
        timezone: 'America/Sao_Paulo',
      },
    },
  ],
  activeMembership: {
    id: adminUserMock.membershipId,
    displayName: adminUserMock.name,
    role: adminUserMock.role,
    status: 'active',
    organization: {
      id: 'organization-1',
      name: 'Organization',
      slug: 'organization',
      timezone: 'America/Sao_Paulo',
    },
  },
  isAuthenticated: true,
  isInitializing: false,
  initializationError: null,
  login: unimplemented,
  logout: async () => undefined,
  selectActiveMembership: async () => undefined,
  refreshSession: async () => undefined,
}

const appStateValue: AppStateContextValue = {
  user: adminUserMock,
  competence: '2026-08',
  formattedCompetence: 'Agosto de 2026',
  preferences: {
    theme: 'light',
    density: 'compact',
    defaultView: 'spreadsheet',
  },
  setCompetence: () => undefined,
  setPreferences: () => undefined,
  goToNextCompetence: () => undefined,
  goToPreviousCompetence: () => undefined,
}

const spreadsheetContext: SpreadsheetContext = {
  spreadsheetNavigationItems: [],
  agendaNavigationItems: [],
  spreadsheetSelection: {
    department: null,
    screen: null,
    screenId: null,
    departmentId: null,
    isFallback: false,
  },
  selectedDepartmentGroup: null,
  selectedDepartment: null,
  selectedScreen: null,
  selectedProjection: null,
  visibleData: null,
  spreadsheetContextQuery: '',
  hasSpreadsheetContext: false,
}

const emptyOperationalData: RoutineControlData = {
  departments: [],
  clients: [],
  routines: [],
  employees: [],
  screens: [],
  spreadsheetProjections: [],
  tasks: [],
}
