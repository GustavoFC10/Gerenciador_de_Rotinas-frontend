/** @vitest-environment happy-dom */
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProcessList from './ProcessList'
import {
  makeProcessTestResource,
  processTestCatalog,
} from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let host: HTMLDivElement
let props: ComponentProps<typeof ProcessList>
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  props = {
    data: {
      count: 1,
      next: null,
      previous: null,
      results: [makeProcessTestResource()],
    },
    catalog: processTestCatalog,
    filters: {
      status: ['andamento', 'agendado', 'atrasado'],
      page: 1,
      pageSize: 50,
    },
    sector: 'fin',
    view: 'ativos',
    timeZone: 'America/Sao_Paulo',
    onFilters: vi.fn(),
    onClear: vi.fn(),
    onOpen: vi.fn(),
    onWaiting: vi.fn(),
  }
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
async function render(patch: Partial<typeof props> = {}) {
  props = { ...props, ...patch }
  await act(async () => root.render(<ProcessList {...props} />))
}
function button(text: string) {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (value) => value.textContent?.trim() === text,
  )
}
async function openMore() {
  const toggle = host.querySelector<HTMLButtonElement>('[aria-controls]')!
  await act(async () => toggle.click())
  return toggle
}

describe('ProcessList UX', () => {
  it('labels collapsible groups as current-page counts while keeping API pagination and every record', async () => {
    const results = [
      makeProcessTestResource({ id: 'a' }),
      makeProcessTestResource({
        id: 'b',
        status: 'concluido',
        concluidoEm: '2026-11-01T01:00:00Z',
      }),
      makeProcessTestResource({ id: 'c', status: 'cancelado' }),
    ]
    await render({
      data: { count: 127, next: '?page=2', previous: null, results },
      view: 'todos',
      filters: { ordering: 'urgency' },
    })
    const grouping = host.querySelector<HTMLSelectElement>(
      'select[aria-label="Agrupar resultados"]',
    )!
    await act(async () => {
      grouping.value = 'completion'
      grouping.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(host.textContent).toContain('Grupos desta página')
    expect(host.textContent).toContain('127 processos nesta lista')
    expect(host.textContent).toContain('Exibindo 1–3 de 127')
    expect(host.textContent).toContain('outubro de 2026')
    expect(host.querySelectorAll('.process-group')).toHaveLength(3)
    expect(host.querySelectorAll('[data-process-id]')).toHaveLength(3)
    expect(button('Próxima página')?.disabled).toBe(false)
    const group = host.querySelector<HTMLDetailsElement>('.process-group')!
    group.open = false
    expect(host.querySelectorAll('[data-process-id]')).toHaveLength(3)
    expect(props.onFilters).not.toHaveBeenCalled()
  })

  it('keeps search focus and raw spacing while a new query loads without reporting false zero results', async () => {
    await render({ filters: { q: 'Empresa' }, searchValue: 'Empresa' })
    const search = host.querySelector<HTMLInputElement>(
      '[aria-label="Buscar nesta lista"]',
    )!
    const more = host.querySelector<HTMLButtonElement>('[aria-controls]')!
    await act(async () => more.click())
    search.focus()
    await render({
      isLoading: true,
      isFetching: true,
      searchValue: 'Empresa ',
      data: { count: 0, next: null, previous: null, results: [] },
    })
    expect(host.querySelector('[aria-label="Buscar nesta lista"]')).toBe(search)
    expect(document.activeElement).toBe(search)
    expect(search.value).toBe('Empresa ')
    expect(search.maxLength).toBe(200)
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      'Carregando processos…',
    )
    expect(host.textContent).not.toContain('0 processos nesta lista')
    expect(host.textContent).not.toContain('Nenhum resultado')
    expect(host.textContent).not.toContain('Exibindo')
    expect(
      host.querySelector('[aria-label="Paginação de processos"]'),
    ).toBeNull()
    expect(host.querySelector('[aria-label="Tipo de processo"]')).not.toBeNull()
    expect(more.getAttribute('aria-expanded')).toBe('true')
    await render({
      isLoading: false,
      isFetching: false,
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [makeProcessTestResource()],
      },
    })
    expect(host.querySelector('[aria-label="Buscar nesta lista"]')).toBe(search)
    expect(document.activeElement).toBe(search)
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      '1 processo nesta lista',
    )
  })

  it('keeps one contextual search and the server count without repeating creation or KPIs', async () => {
    await render({ data: { ...props.data, count: 127 } })
    expect(host.querySelectorAll('input[type="search"]')).toHaveLength(1)
    expect(host.querySelectorAll('.scards')).toHaveLength(0)
    expect(button('Novo processo')).toBeUndefined()
    expect(host.querySelector('select[multiple]')).toBeNull()
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      '127 processos nesta lista',
    )
  })

  it.each([
    ['ativos', ['andamento', 'agendado', 'atrasado']],
    ['agendados', ['agendado']],
    ['andamento', ['andamento']],
    ['atrasados', ['atrasado']],
    ['concluidos', ['concluido']],
    ['encerrados', ['cancelado']],
  ] as const)(
    'does not present the %s navigation scope as removable filters',
    async (view, status) => {
      await render({ view, filters: { status } })
      expect(
        host.querySelector('[aria-label="Filtros adicionais ativos"]'),
      ).toBeNull()
      expect(button('Limpar filtros')).toBeUndefined()
      await openMore()
      expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
      expect(button('Personalizar situações')).toBeDefined()
    },
  )

  it('expands an inline panel through a labelled native button', async () => {
    await render()
    const toggle = host.querySelector<HTMLButtonElement>('[aria-controls]')!
    const controlled = document.getElementById(
      toggle.getAttribute('aria-controls')!,
    )!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(controlled.hidden).toBe(true)
    toggle.focus()
    expect(document.activeElement).toBe(toggle)
    await act(async () => toggle.click())
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(controlled.hidden).toBe(false)
    await act(async () => toggle.click())
    expect(controlled.hidden).toBe(true)
  })

  it('changes navigation to Todos before showing a custom status checklist', async () => {
    await render()
    await openMore()
    await act(async () => button('Personalizar situações')!.click())
    expect(props.onFilters).toHaveBeenCalledWith({
      situacao: 'todos',
      status: ['andamento', 'agendado', 'atrasado'],
    })
    expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
    await render({
      view: 'todos',
      customStatuses: ['andamento', 'agendado', 'atrasado'],
    })
    expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(5)
    expect(
      host.querySelectorAll('input[type="checkbox"]:checked'),
    ).toHaveLength(3)
    expect(host.querySelector('fieldset')?.textContent).toContain(
      'Situações personalizadas',
    )
    expect(
      [
        ...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
      ].every((input) => !!input.closest('label')?.textContent?.trim()),
    ).toBe(true)
  })

  it('removes the last custom status through an empty URL selection, meaning all statuses', async () => {
    await render({
      view: 'todos',
      filters: { status: ['cancelado'] },
      customStatuses: ['cancelado'],
    })
    await openMore()
    const selected = host.querySelector<HTMLInputElement>(
      'input[type="checkbox"]:checked',
    )!
    await act(async () => selected.click())
    expect(props.onFilters).toHaveBeenLastCalledWith({
      situacao: 'todos',
      status: [],
    })
    await render({ filters: {}, customStatuses: [] })
    expect(
      host.querySelectorAll('input[type="checkbox"]:checked'),
    ).toHaveLength(0)
    expect(
      host.querySelector('[aria-label="Filtros adicionais ativos"]'),
    ).toBeNull()
    expect(host.textContent).toContain(
      'Sem seleção, todas as situações são incluídas',
    )
  })

  it('removes an individual refinement without changing the navigation scope', async () => {
    await render({
      filters: {
        ...props.filters,
        tipo: 'abertura',
        q: 'Empresa',
        month: '2026-11',
        responsibleSector: 'reg',
      },
    })
    const chip = host.querySelector<HTMLButtonElement>(
      '[aria-label="Remover filtro de responsável"]',
    )!
    await act(async () => chip.click())
    expect(props.onFilters).toHaveBeenLastCalledWith({ responsibleSector: '' })
    await act(async () => button('Limpar filtros')!.click())
    expect(props.onClear).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[aria-controls]')?.textContent).toContain('(1)')
  })

  it('keeps queue and responsibility scopes visible without removal controls', async () => {
    await render({
      view: 'fila',
      filters: { queueSector: 'fin', q: 'Empresa' },
    })
    expect(host.textContent).toContain('Setor da fila: Financeiro')
    expect(
      host.querySelector('[aria-label="Remover filtro de fila"]'),
    ).toBeNull()
    expect(host.querySelector('.chips')?.textContent).not.toContain('Fila:')
    await render({
      view: 'responsabilidade',
      filters: { responsibleSector: 'reg' },
      baseResponsibleSector: 'reg',
    })
    expect(host.textContent).toContain('Setor da lista: Regularidade')
    expect(
      host.querySelector('[aria-label="Remover filtro de responsável"]'),
    ).toBeNull()
    expect(button('Limpar filtros')).toBeUndefined()
  })

  it('shows the actual page interval and updates pagination without deriving totals from rows', async () => {
    await render({
      data: {
        count: 127,
        previous: '/api/v1/processes/?page=2',
        next: '/api/v1/processes/?page=4',
        results: [
          makeProcessTestResource(),
          makeProcessTestResource({ id: 'process-2' }),
        ],
      },
      filters: { page: 3, pageSize: 25 },
      view: 'todos',
    })
    expect(host.textContent).toContain('Exibindo 51–52 de 127')
    expect(host.textContent).toContain('Página 3 de 6')
    await act(async () => button('Próxima página')!.click())
    expect(props.onFilters).toHaveBeenLastCalledWith({ page: '4' })
    await act(async () => button('Página anterior')!.click())
    expect(props.onFilters).toHaveBeenLastCalledWith({ page: '2' })
    const pageSize = host.querySelector<HTMLSelectElement>(
      '[aria-label="Processos por página"]',
    )!
    await act(async () => {
      pageSize.value = '50'
      pageSize.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(props.onFilters).toHaveBeenLastCalledWith({ pageSize: '50' })
    await render({ isFetching: true })
    expect(button('Próxima página')?.disabled).toBe(true)
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Atualizando lista…',
    )
  })

  it('keeps the empty queue guidance and a zero interval without offering another creation button', async () => {
    await render({
      view: 'fila',
      filters: { queueSector: 'fin' },
      data: { count: 0, previous: null, next: null, results: [] },
    })
    expect(host.textContent).toContain('Nenhum processo nesta lista')
    expect(host.textContent).toContain('Exibindo 0–0 de 0')
    expect(host.textContent).toContain(
      'Processos aguardando liberação podem continuar sob sua responsabilidade',
    )
    await act(async () => button('Ver aguardando liberação')!.click())
    expect(props.onWaiting).toHaveBeenCalledTimes(1)
    expect(button('Novo processo')).toBeUndefined()
  })
})
