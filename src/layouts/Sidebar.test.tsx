import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { adminUserMock, memberUserMock } from '../constants/roles'
import {
  AppStateContext,
  type AppStateContextValue,
} from '../contexts/appStateContextDefinition'
import Sidebar from './Sidebar'

const appState = {
  user: memberUserMock,
  competence: '2026-07',
  formattedCompetence: '07/2026',
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

function renderSidebar(
  isCollapsed = false,
  user: AppStateContextValue['user'] = memberUserMock,
) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AppStateContext.Provider value={{ ...appState, user }}>
        <Sidebar
          spreadsheets={[]}
          agendas={[]}
          isCollapsed={isCollapsed}
          isMobileOpen={false}
          onCollapseToggle={() => undefined}
          onMobileClose={() => undefined}
          navigationRef={createRef<HTMLElement>()}
          closeButtonRef={createRef<HTMLButtonElement>()}
        />
      </AppStateContext.Provider>
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('renders the profile as a persistent sidebar footer', () => {
    const markup = renderSidebar()

    expect(markup).toContain('data-sidebar-profile="true"')
    expect(markup).toContain('Abrir perfil de Ana Souza')
    expect(markup).toContain('Ana Souza')
    expect(markup).toContain('ana.souza@example.com')
  })

  it('keeps profile details available visually when the sidebar is expanded', () => {
    expect(renderSidebar(false)).not.toContain('lg:sr-only')
    expect(renderSidebar(true)).toContain('lg:sr-only')
  })

  it('labels the organization-member list as Equipe', () => {
    expect(renderSidebar(false, adminUserMock)).toContain('>Equipe<')
  })

  it('places Minhas tarefas immediately after Início in global navigation', () => {
    const markup = renderSidebar()
    const homeIndex = markup.indexOf('>Início<')
    const myTasksIndex = markup.indexOf('>Minhas tarefas<')

    expect(markup).toContain('href="/minhas-tarefas"')
    expect(homeIndex).toBeGreaterThan(-1)
    expect(myTasksIndex).toBeGreaterThan(homeIndex)
  })
})
