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
    description: '3 planilhas',
    to: '/planilha?sheetId=fiscal&divisionId=division-fiscal-mei',
    divisions: [
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
    ],
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
  it('keeps home as a global landmark and workspaces above secondary access', () => {
    const markup = renderSidebar()

    expect(markup).toContain('aria-label="Navegação principal"')
    expect(markup).toContain('aria-label="Áreas de trabalho"')
    expect(markup).toContain('aria-label="Ir para o início"')
    expect(markup).toContain('data-navigation-priority="spreadsheet"')
    expect(markup.indexOf('>Início</span>')).toBeLessThan(
      markup.indexOf('Fiscal'),
    )
    expect(markup.indexOf('Fiscal')).toBeLessThan(
      markup.indexOf('>Empresas</span>'),
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

  it('keeps the originating spreadsheet active in entity pages', () => {
    const markup = renderSidebar({
      entry: '/empresas/client-1?sheetId=pessoal',
      role: USER_ROLE.LEADER,
    })
    const currentLink = getCurrentLink(markup)

    expect(currentLink).toContain('sheetId=pessoal')
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
  })

  it('activates secondary routes without also activating a spreadsheet', () => {
    const markup = renderSidebar({ entry: '/tarefas-fiscal' })
    const currentLink = getCurrentLink(markup)

    expect(currentLink).toContain(
      'href="/tarefas-fiscal?sheetId=fiscal&amp;divisionId=division-fiscal-mei"',
    )
    expect(currentLink).not.toContain('data-navigation-priority')
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
  })

  it('shows role-specific areas without exposing administration to employees', () => {
    const employeeMarkup = renderSidebar()
    const leaderMarkup = renderSidebar({ role: USER_ROLE.LEADER })
    const managerMarkup = renderSidebar({ role: USER_ROLE.MANAGER })

    expect(employeeMarkup).not.toContain('Visão do departamento')
    expect(employeeMarkup).not.toContain('Cargos e permissões')
    expect(employeeMarkup).toContain('>Empresas</span>')
    expect(employeeMarkup).toContain('>Rotinas</span>')
    expect(employeeMarkup).toContain('>Tarefas</span>')
    expect(employeeMarkup).not.toContain('>Funcionários</span>')
    expect(employeeMarkup).not.toContain('Minhas tarefas')
    expect(employeeMarkup).not.toContain('Criar rotina')
    expect(employeeMarkup).not.toContain('Adicionar empresa')
    expect(employeeMarkup).not.toContain('Adicionar funcionário')
    expect(leaderMarkup).toContain('Visão de Fiscal')
    expect(leaderMarkup).not.toContain('>Funcionários</span>')
    expect(leaderMarkup).not.toContain('Cargos e permissões')
    expect(leaderMarkup).not.toContain('href="/rotinas/nova"')
    expect(leaderMarkup).not.toContain('href="/empresas/nova"')
    expect(leaderMarkup).not.toContain('Adicionar funcionário')
    expect(managerMarkup).toContain('Visão geral')
    expect(managerMarkup).toContain('Visão de Fiscal')
    expect(managerMarkup).toContain('Visão de Departamento pessoal')
    expect(managerMarkup).toContain('>Funcionários</span>')
    expect(managerMarkup).not.toContain('Cargos e permissões')
    expect(managerMarkup).not.toContain('Administração')
    expect(managerMarkup).not.toContain('href="/funcionarios/novo"')
  })

  it.each([
    '/rotinas/nova?sheetId=fiscal',
    '/empresas/nova?sheetId=fiscal',
  ])(
    'keeps creation route %s out of the sidebar and spreadsheet context',
    (entry) => {
      const markup = renderSidebar({ entry, role: USER_ROLE.LEADER })

      expect(markup).not.toContain(`href="${entry.split('?')[0]}"`)
      expect(markup).not.toContain('aria-current="page"')
    },
  )

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

  it('keeps item listings available when no spreadsheet is registered', () => {
    const markup = renderSidebar({ items: [] })

    expect(markup).toContain('Nenhuma área de trabalho disponível')
    expect(markup).not.toContain('data-navigation-priority="spreadsheet"')
    expect(markup).toContain('>Empresas</span>')
    expect(markup).toContain('>Rotinas</span>')
    expect(markup).toContain('>Tarefas</span>')
  })
})
