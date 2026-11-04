/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiResponse } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type { ProcessAlertRecipientOption } from '../../types/processes'
import ProcessRecipientSelector, {
  type ProcessRecipientSelection,
} from './ProcessRecipientSelector'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const scope = { organizationId: 'org-1', membershipId: 'member-1' }
const people: ProcessAlertRecipientOption[] = Array.from(
  { length: 121 },
  (_, index) => ({
    memberId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name: `Pessoa ${String(index + 1).padStart(3, '0')}`,
    email: `pessoa${index + 1}@example.test`,
    sectors: ['fin'],
  }),
)
let root: Root
let host: HTMLDivElement
let client: QueryClient
let onChange: (selection: ProcessRecipientSelection) => void
let latest: ProcessRecipientSelection
const response = <T,>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
  etag: null,
  requestId: null,
})

function Probe({
  disabled = false,
  activeScope = scope,
}: {
  disabled?: boolean
  activeScope?: typeof scope
}) {
  const [selection, setSelection] = useState<ProcessRecipientSelection>({
    sectors: ['com', 'fin'],
    memberIds: [],
  })
  useEffect(() => {
    latest = selection
  }, [selection])
  return (
    <ProcessRecipientSelector
      scope={activeScope}
      {...selection}
      disabled={disabled}
      onChange={(next) => {
        onChange(next)
        setSelection(next)
      }}
    />
  )
}
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  onChange = vi.fn()
  vi.spyOn(processService, 'alertRecipientOptions').mockImplementation(
    async (filters = {}) => {
      const matches = people.filter(
        (member) =>
          !filters.q ||
          member.name.includes(filters.q) ||
          member.email.includes(filters.q),
      )
      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 50
      return response({
        count: matches.length,
        next: page * pageSize < matches.length ? `?page=${page + 1}` : null,
        previous: page > 1 ? `?page=${page - 1}` : null,
        results: matches.slice((page - 1) * pageSize, page * pageSize),
      })
    },
  )
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render(props: Parameters<typeof Probe>[0] = {}) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Probe {...props} />
      </QueryClientProvider>,
    ),
  )
}
async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 2500
  while (!check()) {
    if (Date.now() >= deadline)
      throw new Error(`Estado não alcançado: ${host.textContent}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
}
const trigger = () =>
  host.querySelector<HTMLButtonElement>('.process-recipient-trigger')!
const search = () =>
  host.querySelector<HTMLInputElement>('input[type="search"]')!
function option(name: string) {
  return [
    ...host.querySelectorAll<HTMLLabelElement>('.process-recipient-option'),
  ]
    .find((label) => label.querySelector('strong')?.textContent === name)
    ?.querySelector<HTMLInputElement>('input')
}
async function open() {
  await act(async () => trigger().click())
  await waitFor(() => !!option('Pessoa 001'))
}
async function input(value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!
    setter.call(search(), value)
    search().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('seletor único de destinatários', () => {
  it('apresenta departamentos e pessoas no mesmo campo com seleção múltipla e busca em foco', async () => {
    await render()
    expect(host.querySelectorAll('.process-recipient-trigger')).toHaveLength(1)
    expect(host.querySelectorAll('.process-recipient-chips li')).toHaveLength(2)
    expect(processService.alertRecipientOptions).not.toHaveBeenCalled()
    await open()
    expect(document.activeElement).toBe(search())
    expect(host.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    expect(
      host.querySelectorAll('input[type="radio"],input[type="email"]'),
    ).toHaveLength(0)
    expect(option('Diretoria')?.checked).toBe(true)
    expect(option('Financeiro')?.checked).toBe(true)
    expect(option('Todos com acesso a Processos')?.indeterminate).toBe(true)
    await act(async () => option('Pessoa 001')!.click())
    expect(latest).toEqual({
      sectors: ['com', 'fin'],
      memberIds: [people[0]!.memberId],
    })
    expect(
      host.querySelector('.process-recipient-chips')?.textContent,
    ).toContain('Pessoa 001')
  })

  it('seleciona Todos globalmente sem buscar as 121 pessoas nem limitar às 50 visíveis', async () => {
    await render()
    await open()
    expect(
      host.querySelectorAll('[aria-label="Pessoas cadastradas"] input'),
    ).toHaveLength(50)
    expect(host.textContent).toContain('121 pessoas')
    await act(async () => option('Todos com acesso a Processos')!.click())
    expect(latest).toEqual({ sectors: ['com', 'fin', 'reg'], memberIds: [] })
    expect(processService.alertRecipientOptions).toHaveBeenCalledTimes(1)
    await input('Pessoa 121')
    await waitFor(() => !!option('Pessoa 121'))
    expect(option('Todos com acesso a Processos')?.checked).toBe(true)
    expect(latest.memberIds).toEqual([])
    expect(
      vi
        .mocked(processService.alertRecipientOptions)
        .mock.calls.every(([filters]) => filters?.page === 1),
    ).toBe(true)
  })

  it('preserva pessoas selecionadas entre páginas e buscas e permite remover seus chips', async () => {
    await render()
    await open()
    await act(async () => option('Pessoa 001')!.click())
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '[aria-label="Próxima página de pessoas"]',
        )!
        .click(),
    )
    await waitFor(() => !!option('Pessoa 051'))
    await act(async () => option('Pessoa 051')!.click())
    await input('Pessoa 121')
    await waitFor(() => !!option('Pessoa 121'))
    expect(latest.memberIds).toEqual([
      people[0]!.memberId,
      people[50]!.memberId,
    ])
    expect(
      host.querySelector('.process-recipient-chips')?.textContent,
    ).toContain('Pessoa 001')
    expect(
      host.querySelector('.process-recipient-chips')?.textContent,
    ).toContain('Pessoa 051')
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '[aria-label="Remover pessoa Pessoa 001"]',
        )!
        .click(),
    )
    expect(latest.memberIds).toEqual([people[50]!.memberId])
    await input('')
    await waitFor(() => !!option('Pessoa 001'))
    expect(option('Pessoa 001')?.checked).toBe(false)
    expect(
      host.querySelector('.process-recipient-chips')?.textContent,
    ).toContain('Pessoa 051')
  })

  it('fecha por Escape e devolve foco ao campo; desabilitado não permite editar', async () => {
    await render()
    await open()
    await act(async () =>
      search().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger())
    await render({ disabled: true })
    expect(trigger().disabled).toBe(true)
    expect(
      [
        ...host.querySelectorAll<HTMLButtonElement>(
          '.process-recipient-chips button',
        ),
      ].every((button) => button.disabled),
    ).toBe(true)
    expect(processService.alertRecipientOptions).toHaveBeenCalledTimes(1)
  })
})
