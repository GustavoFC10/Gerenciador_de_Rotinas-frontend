/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../contexts/authContextDefinition'
import HonorariosLayout from './HonorariosLayout'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root
const logout = vi.fn<() => Promise<void>>()
const switchOrganization = vi.fn<(id: string) => Promise<void>>()
const refresh = vi.fn()
const membership = {
  id: 'member-a',
  displayName: 'Ana Souza',
  role: 'member' as const,
  status: 'active',
  organization: {
    id: 'org-a',
    name: 'Jaralcon',
    slug: 'jaralcon',
    timezone: 'America/Sao_Paulo',
  },
}
const auth: AuthContextValue = {
  activeMembership: membership,
  memberships: [membership],
  session: null,
  user: null,
  isAuthenticated: true,
  isInitializing: false,
  initializationError: null,
  login: vi.fn(),
  logout,
  selectActiveMembership: switchOrganization,
  refreshSession: vi.fn(),
}

function LocationProbe() {
  return <output data-location>{useLocation().pathname}</output>
}
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  logout.mockReset().mockResolvedValue(undefined)
  switchOrganization.mockReset().mockResolvedValue(undefined)
  refresh.mockReset()
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})
async function render({
  canEdit = true,
  context = auth,
}: { canEdit?: boolean; context?: AuthContextValue } = {}) {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={['/honorarios']}>
        <AuthContext.Provider value={context}>
          <HonorariosLayout
            title="Painel"
            description="Indicadores da carteira"
            roleLabel={canEdit ? 'Operação' : 'Consulta'}
            canEdit={canEdit}
            onRefresh={refresh}
          >
            <p>Conteúdo financeiro</p>
          </HonorariosLayout>
          <LocationProbe />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  )
}
const button = (name: string) =>
  host.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!

describe('HonorariosLayout', () => {
  it('usa navegação lateral com retorno explícito aos módulos, rotas do módulo e perfil persistente', async () => {
    await render()
    const nav = host.querySelector('nav[aria-label="Navegação de Honorários"]')!
    expect(
      [...nav.querySelectorAll('a')].map((link) => [
        link.textContent,
        link.getAttribute('href'),
      ]),
    ).toEqual([
      ['Voltar aos módulos', '/hub'],
      ['Painel', '/honorarios'],
      ['Novo orçamento', '/honorarios/novo'],
      ['Orçamentos', '/honorarios/orcamentos'],
      ['Clientes', '/honorarios/clientes'],
      ['Parâmetros', '/honorarios/parametros'],
    ])
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(
      'Painel',
    )
    expect(host.querySelector('[data-sidebar-profile]')?.textContent).toContain(
      'Ana Souza',
    )
    expect(host.querySelector('h1')?.textContent).toBe('Painel')
    expect(host.textContent).toContain('Conteúdo financeiro')
    expect(
      host.querySelector('a[href="/hub"][aria-label="Voltar aos módulos"]'),
    ).not.toBeNull()
  })
  it('contém o foco no menu móvel, fecha por Escape e devolve o foco ao botão de abertura', async () => {
    await render()
    const menu = button('Abrir navegação')
    await act(async () => {
      menu.focus()
      menu.click()
    })
    const dialog = host.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(host.querySelector('main')?.parentElement?.inert).toBe(true)
    expect(document.activeElement).toBe(button('Fechar navegação'))
    const last = dialog
      .querySelectorAll<HTMLButtonElement>('button')
      .item(dialog.querySelectorAll('button').length - 1)
    await act(async () => {
      last.focus()
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(document.activeElement).toBe(dialog.querySelector('a'))
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(host.querySelector('main')?.parentElement?.inert).toBe(false)
    expect(document.activeElement).toBe(menu)
  })
  it('fecha o menu ao navegar e atualiza dados pelo comando explícito do cabeçalho', async () => {
    await render()
    await act(async () => button('Atualizar Honorários').click())
    expect(refresh).toHaveBeenCalledTimes(1)
    await act(async () => button('Abrir navegação').click())
    await act(async () =>
      host
        .querySelector<HTMLAnchorElement>('nav a[href="/honorarios/clientes"]')!
        .click(),
    )
    expect(host.querySelector('[data-location]')?.textContent).toBe(
      '/honorarios/clientes',
    )
    expect(host.querySelector('[role="dialog"]')).toBeNull()
  })
  it('mantém a calculadora disponível para consulta e retira a criação rápida no acesso de consulta', async () => {
    await render({ canEdit: false })
    expect(host.querySelector('nav a[href="/honorarios/novo"]')).not.toBeNull()
    expect(host.querySelector('header a[href="/honorarios/novo"]')).toBeNull()
    expect(host.textContent).toContain('Consulta')
  })
  it('troca de organização pelo fluxo autenticado existente e apresenta erro de saída', async () => {
    await render({
      context: {
        ...auth,
        memberships: [
          membership,
          {
            ...membership,
            id: 'member-b',
            organization: {
              ...membership.organization,
              id: 'org-b',
              name: 'Outra organização',
            },
          },
        ],
      },
    })
    await act(async () => {
      const select = host.querySelector<HTMLSelectElement>('select')!
      select.value = 'member-b'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(switchOrganization).toHaveBeenCalledWith('member-b')
    expect(host.querySelector('[data-location]')?.textContent).toBe('/hub')
    logout.mockRejectedValueOnce(
      new Error('Não foi possível encerrar a sessão.'),
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((item) => item.textContent?.includes('Sair'))!
        .click(),
    )
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível encerrar a sessão.',
    )
  })
})
