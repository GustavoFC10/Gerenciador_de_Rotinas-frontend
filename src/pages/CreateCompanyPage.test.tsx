/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  Client,
  CreateClientInput,
  RoutineControlData,
} from '../types/domain'
import CreateCompanyPage, {
  type CreateCompanyResult,
} from './CreateCompanyPage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const data: RoutineControlData = {
  departments: [
    { id: 'dept-fiscal', name: 'Fiscal' },
    { id: 'dept-pessoal', name: 'Pessoal' },
  ],
  divisions: [
    {
      id: 'division-fiscal-mei',
      departmentId: 'dept-fiscal',
      name: 'MEI',
      slug: 'mei',
      description: 'Empresas da divisão MEI.',
      position: 1,
      active: true,
    },
    {
      id: 'division-fiscal-simples',
      departmentId: 'dept-fiscal',
      name: 'Simples Nacional',
      slug: 'simples-nacional',
      position: 2,
      active: true,
    },
  ],
  clients: [
    {
      id: 'client-existing',
      code: '0001',
      name: 'Empresa existente',
      document: '11.111.111/0001-11',
    },
  ],
  routines: [
    {
      id: 'routine-importar',
      departmentId: 'dept-fiscal',
      name: 'Importar notas',
      shortName: 'Importar',
      description: 'Importar documentos fiscais.',
      recurrence: 'monthly',
      defaultDueDays: 5,
      active: true,
    },
    {
      id: 'routine-das-mei',
      departmentId: 'dept-fiscal',
      name: 'Apurar DAS-MEI',
      shortName: 'DAS-MEI',
      recurrence: 'monthly',
      defaultDueDay: 20,
      active: true,
    },
    {
      id: 'routine-geral',
      departmentId: 'dept-fiscal',
      name: 'Revisar documentos',
      shortName: 'Revisar',
      recurrence: 'on_demand',
      active: true,
    },
    {
      id: 'routine-pessoal',
      departmentId: 'dept-pessoal',
      name: 'Fechar folha',
      shortName: 'Folha',
      recurrence: 'monthly',
      active: true,
    },
  ],
  divisionRoutineLinks: [
    {
      id: 'link-mei-importar',
      divisionId: 'division-fiscal-mei',
      routineId: 'routine-importar',
      position: 1,
    },
    {
      id: 'link-mei-das',
      divisionId: 'division-fiscal-mei',
      routineId: 'routine-das-mei',
      position: 2,
    },
    {
      id: 'link-simples-importar',
      divisionId: 'division-fiscal-simples',
      routineId: 'routine-importar',
      position: 1,
    },
  ],
  clientRoutineLinks: [],
  employees: [],
  tasks: [],
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  document.body.innerHTML = ''
})

describe('CreateCompanyPage', () => {
  it('starts with an accessible three-step structure and company fields', async () => {
    await renderPage(vi.fn())

    expect(getHeading('Adicionar empresa')).toBeTruthy()
    expect(getHeading('Identifique a empresa')).toBeTruthy()
    expect(
      document.querySelector('nav[aria-label="Progresso do cadastro"]'),
    ).toBeTruthy()
    expect(document.querySelectorAll('nav ol > li')).toHaveLength(3)
    expect(
      document.querySelector('[aria-current="step"]')?.textContent,
    ).toContain('Dados da empresa')
    expect(getControl<HTMLInputElement>('#company-name').required).toBe(true)
    expect(getControl<HTMLInputElement>('#company-document').required).toBe(
      true,
    )
  })

  it('keeps the first step open and focuses the error summary for invalid data', async () => {
    const onCreate = vi.fn()
    await renderPage(onCreate)

    await act(async () => {
      getButton('Continuar').click()
      await nextFrame()
    })

    const alert = getControl<HTMLElement>('[role="alert"]')
    expect(document.activeElement).toBe(alert)
    expect(alert.textContent).toContain('Informe o nome da empresa.')
    expect(alert.textContent).toContain(
      'O código deve ter exatamente 4 dígitos.',
    )
    expect(alert.textContent).toContain('Informe um CNPJ com 14 dígitos.')
    expect(getHeading('Identifique a empresa')).toBeTruthy()
    expect(
      getControl<HTMLInputElement>('#company-name').getAttribute(
        'aria-invalid',
      ),
    ).toBe('true')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('applies a preset, preserves manual routine choices and submits the reviewed payload', async () => {
    const createdClient: Client = {
      id: 'client-acme',
      name: 'Acme Comércio',
      legalName: 'Acme Comércio Ltda.',
      code: '0042',
      document: '12.345.678/0001-99',
      email: 'fiscal@acme.com.br',
      phone: '(21) 99999-0000',
      taxRegime: 'mei',
    }
    const result: CreateCompanyResult = {
      client: createdClient,
      linkedRoutineCount: 2,
      createdTaskCount: 2,
    }
    const onCreate = vi.fn<(input: CreateClientInput) => CreateCompanyResult>(
      () => result,
    )
    await renderPage(onCreate)

    await setControlValue(
      getControl<HTMLInputElement>('#company-name'),
      '  Acme Comércio  ',
    )
    await setControlValue(
      getControl<HTMLInputElement>('#company-legal-name'),
      'Acme Comércio Ltda.',
    )
    await setControlValue(getControl<HTMLInputElement>('#company-code'), '0042')
    await setControlValue(
      getControl<HTMLInputElement>('#company-document'),
      '12345678000199',
    )
    await setControlValue(
      getControl<HTMLInputElement>('#company-email'),
      'fiscal@acme.com.br',
    )
    await setControlValue(
      getControl<HTMLInputElement>('#company-phone'),
      '(21) 99999-0000',
    )

    await act(async () => {
      getButton('Continuar').click()
    })

    expect(getHeading('Escolha a predefinição fiscal')).toBeTruthy()

    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="fiscal-division"][value="division-fiscal-mei"]',
      ).click()
    })

    expect(
      getControl<HTMLInputElement>(
        'input[name="company-routines"][value="routine-importar"]',
      ).checked,
    ).toBe(true)
    expect(
      getControl<HTMLInputElement>(
        'input[name="company-routines"][value="routine-das-mei"]',
      ).checked,
    ).toBe(true)

    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="company-routines"][value="routine-das-mei"]',
      ).click()
    })
    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="company-routines"][value="routine-geral"]',
      ).click()
    })
    await act(async () => {
      getButton('Continuar').click()
    })

    expect(getHeading('Confira antes de criar')).toBeTruthy()
    expect(document.body.textContent).toContain('Acme Comércio')
    expect(document.body.textContent).toContain('1 sugestão removida')
    expect(document.body.textContent).toContain('1 rotina geral adicionada')

    await act(async () => {
      getButton('Criar empresa e vincular 2 rotinas').click()
    })

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Acme Comércio',
      legalName: 'Acme Comércio Ltda.',
      code: '0042',
      document: '12.345.678/0001-99',
      email: 'fiscal@acme.com.br',
      phone: '(21) 99999-0000',
      departmentId: 'dept-fiscal',
      divisionId: 'division-fiscal-mei',
      taxRegime: 'mei',
      routineIds: ['routine-importar', 'routine-geral'],
    })

    const success = getControl<HTMLElement>('[role="status"]')
    expect(success.textContent).toContain('Empresa criada')
    expect(success.textContent).toContain('Acme Comércio')
    expect(success.textContent).toContain('2 rotinas vinculadas')
    expect(
      success.querySelector<HTMLAnchorElement>('a')?.getAttribute('href'),
    ).toContain('/empresas/client-acme')
  })
})

async function renderPage(
  onCreate: (input: CreateClientInput) => CreateCompanyResult,
) {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <CreateCompanyPage data={data} onCreate={onCreate} />
      </MemoryRouter>,
    )
  })
}

function getHeading(text: string): HTMLHeadingElement | undefined {
  return [...document.querySelectorAll<HTMLHeadingElement>('h1, h2, h3')].find(
    (heading) => heading.textContent?.includes(text),
  )
}

function getButton(text: string): HTMLButtonElement {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>('button'),
  ].find((candidate) => candidate.textContent?.trim() === text)

  if (!button) throw new Error(`Button not found: ${text}`)
  return button
}

function getControl<Element extends HTMLElement>(selector: string): Element {
  const element = document.querySelector<Element>(selector)
  if (!element) throw new Error(`Element not found: ${selector}`)
  return element
}

async function setControlValue(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  await act(async () => {
    const prototype =
      control instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLSelectElement.prototype
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

    valueSetter?.call(control, value)
    control.dispatchEvent(
      new Event(control instanceof HTMLSelectElement ? 'change' : 'input', {
        bubbles: true,
      }),
    )
  })
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}
