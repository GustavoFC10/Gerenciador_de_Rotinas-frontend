import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { memberUserMock } from '../constants/roles'
import {
  AppStateContext,
  type AppStateContextValue,
} from '../contexts/appStateContextDefinition'
import Topbar from './Topbar'

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

  it('presents the current competence with the month written in full', () => {
    const markup = renderTopbar(false)

    expect(markup).toContain('aria-label="Competência atual: Julho de 2026"')
    expect(markup).toContain('>Julho de 2026</span>')
  })

  it('uses the full topbar width for competence navigation', () => {
    const markup = renderTopbar(false)

    expect(markup).toContain('grid w-full grid-cols-')
    expect(markup).toContain('Anterior')
    expect(markup).toContain('Próxima')
  })

  it('keeps profile information out of the topbar', () => {
    const markup = renderTopbar(false)

    expect(markup).not.toContain('Ana Souza')
    expect(markup).not.toContain('Abrir perfil')
  })
})
