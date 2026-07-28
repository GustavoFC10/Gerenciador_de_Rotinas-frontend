import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { APP_THEME } from '../constants/designTokens'
import { USER_ROLE } from '../constants/roles'
import { AppStateContext } from '../contexts/appStateContextDefinition'
import type { AppStateContextValue } from '../contexts/appStateContextDefinition'
import type { AppUser, UserRole } from '../types/domain'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import Sidebar from './Sidebar'

const spreadsheets: SpreadsheetNavigationItem[] = [
  {
    id: 'fiscal',
    departmentId: 'dept-fiscal',
    name: 'Fiscal',
    description: 'Clientes e rotinas',
    to: '/planilha?sheetId=fiscal',
  },
  {
    id: 'pessoal',
    departmentId: 'dept-pessoal',
    name: 'Departamento pessoal',
    to: '/planilha?sheetId=pessoal',
  },
]

function buildUser(role: UserRole): AppUser {
  return {
    id: `user-${role}`,
    employeeId: `employee-${role}`,
    name: 'Usuário de teste',
    email: 'teste@example.com',
    role,
    departmentIds: ['dept-fiscal'],
    avatarUrl: '',
  }
}

function buildAppState(role: UserRole): AppStateContextValue {
  return {
    user: buildUser(role),
    competence: '2026-07',
    formattedCompetence: 'jul. de 2026',
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

function renderSidebar({
  entry = '/',
  role = USER_ROLE.EMPLOYEE,
  isCollapsed = false,
  isMobileOpen = false,
  items = spreadsheets,
}: {
  entry?: string
  role?: UserRole
  isCollapsed?: boolean
  isMobileOpen?: boolean
  items?: SpreadsheetNavigationItem[]
} = {}) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
      <AppStateContext.Provider value={buildAppState(role)}>
        <Sidebar
          spreadsheets={items}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCollapseToggle={() => undefined}
          onMobileClose={() => undefined}
          navigationRef={createRef<HTMLElement>()}
          closeButtonRef={createRef<HTMLButtonElement>()}
        />
      </AppStateContext.Provider>
    </MemoryRouter>,
  )
}

function getCurrentLink(markup: string): string {
  return markup.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0] ?? ''
}

describe('Sidebar', () => {
  it('keeps home as a global landmark and spreadsheets above secondary access', () => {
    const markup = renderSidebar()

    expect(markup).toContain('aria-label="Navegação principal"')
    expect(markup).toContain('aria-label="Ir para o início"')
    expect(markup).toContain('data-navigation-priority="spreadsheet"')
    expect(markup.indexOf('>Início</span>')).toBeLessThan(
      markup.indexOf('Fiscal'),
    )
    expect(markup.indexOf('Fiscal')).toBeLessThan(
      markup.indexOf('Minhas tarefas'),
    )
  })

  it('keeps the originating spreadsheet active in contextual lists', () => {
    const markup = renderSidebar({
      entry: '/lista?sheetId=pessoal&type=client&id=client-1',
    })
    const currentLink = getCurrentLink(markup)

    expect(currentLink).toContain('sheetId=pessoal')
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
  })

  it('activates secondary routes without also activating a spreadsheet', () => {
    const markup = renderSidebar({ entry: '/tarefas-fiscal' })
    const currentLink = getCurrentLink(markup)

    expect(currentLink).toContain('href="/tarefas-fiscal?sheetId=fiscal"')
    expect(currentLink).not.toContain('data-navigation-priority')
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
  })

  it('shows role-specific areas without exposing administration to employees', () => {
    const employeeMarkup = renderSidebar()
    const leaderMarkup = renderSidebar({ role: USER_ROLE.LEADER })
    const managerMarkup = renderSidebar({ role: USER_ROLE.MANAGER })

    expect(employeeMarkup).not.toContain('Visão do departamento')
    expect(employeeMarkup).not.toContain('Cargos e permissões')
    expect(leaderMarkup).toContain('Visão do departamento')
    expect(leaderMarkup).not.toContain('Cargos e permissões')
    expect(managerMarkup).toContain('Visão geral da empresa')
    expect(managerMarkup).toContain('Cargos e permissões')
  })

  it('preserves accessible link text and titles when collapsed', () => {
    const markup = renderSidebar({
      entry: '/planilha?sheetId=fiscal',
      isCollapsed: true,
    })

    expect(markup).toContain('title="Fiscal"')
    expect(markup).toContain('>Fiscal</span>')
    expect(markup).toContain('aria-label="Expandir navegação"')
    expect(markup).toContain('aria-controls="app-sidebar"')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('removes the closed mobile drawer from keyboard navigation semantics', () => {
    const closedMarkup = renderSidebar()
    const openMarkup = renderSidebar({ isMobileOpen: true })

    expect(closedMarkup).toContain('invisible -translate-x-full')
    expect(closedMarkup).not.toContain('role="dialog"')
    expect(openMarkup).toContain('visible translate-x-0')
    expect(openMarkup).toContain('role="dialog"')
    expect(openMarkup).toContain('aria-modal="true"')
  })

  it('keeps secondary navigation available when no spreadsheet is registered', () => {
    const markup = renderSidebar({ items: [] })

    expect(markup).toContain('Nenhuma planilha disponível')
    expect(markup).not.toContain('data-navigation-priority="spreadsheet"')
    expect(markup).toContain('Minhas tarefas')
  })
})
