import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { currentUserMock } from '../constants/roles'
import {
  AppStateContext,
  type AppStateContextValue,
} from '../contexts/appStateContextDefinition'
import Topbar from './Topbar'

const appState = {
  user: currentUserMock,
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

function renderTopbar(isNavigationOpen: boolean) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AppStateContext.Provider value={appState}>
        <Topbar
          isNavigationOpen={isNavigationOpen}
          onNavigationOpen={() => undefined}
          menuButtonRef={createRef<HTMLButtonElement>()}
        />
      </AppStateContext.Provider>
    </MemoryRouter>,
  )
}

describe('Topbar', () => {
  it('connects the mobile menu control to the sidebar', () => {
    expect(renderTopbar(false)).toContain('aria-expanded="false"')
    expect(renderTopbar(true)).toContain('aria-expanded="true"')
    expect(renderTopbar(false)).toContain('aria-controls="app-sidebar"')
  })

  it('presents the current competence as information, not an inert button', () => {
    const markup = renderTopbar(false)
    const currentCompetenceElement =
      markup.match(/<span[^>]*aria-label="Competência atual:[^>]*>/)?.[0] ?? ''

    expect(currentCompetenceElement).toContain('Competência atual: 07/2026')
    expect(currentCompetenceElement).toMatch(/^<span/)
  })
})
