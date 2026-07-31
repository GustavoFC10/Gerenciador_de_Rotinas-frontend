/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  CreateRoutineInput,
  Routine,
  RoutineControlData,
} from '../types/domain'
import CreateRoutinePage from './CreateRoutinePage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const data: RoutineControlData = {
  departments: [
    { id: 'dept-pessoal', name: 'Pessoal' },
    { id: 'dept-fiscal', name: 'Fiscal' },
  ],
  divisions: [],
  clients: [],
  routines: [],
  divisionRoutineLinks: [],
  clientRoutineLinks: [],
  employees: [
    {
      id: 'employee-fiscal',
      name: 'Ana Fiscal',
      departmentIds: ['dept-fiscal'],
      active: true,
    },
    {
      id: 'employee-pessoal',
      name: 'Bruno Pessoal',
      departmentIds: ['dept-pessoal'],
      active: true,
    },
  ],
  tasks: [],
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  document.body.innerHTML = ''
})

describe('CreateRoutinePage', () => {
  it('presents a one-page model form with explicit recurrence and preview', async () => {
    await renderPage(vi.fn())

    expect(getHeading('Nova rotina')).toBeTruthy()
    expect(getHeading('Identificação')).toBeTruthy()
    expect(getHeading('Padrões de execução')).toBeTruthy()
    expect(getHeading('Prévia do modelo')).toBeTruthy()

    const recurrenceOptions = document.querySelectorAll<HTMLInputElement>(
      'input[name="recurrence"]',
    )
    expect(recurrenceOptions).toHaveLength(5)
    expect(
      document.querySelector<HTMLInputElement>(
        'input[name="recurrence"][value="on_demand"]',
      ),
    ).toBeTruthy()
    expect(document.body.textContent).toContain(
      'Este cadastro não cria tarefas nem altera as planilhas atuais.',
    )
    expect(document.body.textContent).toContain('Competência atual')
    expect(document.body.textContent).toContain('07/2026')

    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="recurrence"][value="on_demand"]',
      ).click()
    })
    expect(
      getControl<HTMLInputElement>('#routine-due-days').labels?.[0]
        ?.textContent,
    ).toContain('Prazo após a criação')

    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="recurrence"][value="quarterly"]',
      ).click()
    })
    expect(document.body.textContent).toContain(
      'Janeiro / Abril / Julho / Outubro',
    )
    expect(document.body.textContent).not.toContain('Personalizada')
  })

  it('focuses an accessible error summary and identifies required fields', async () => {
    const onCreate = vi.fn()
    await renderPage(onCreate)

    await act(async () => {
      getSubmitButton().click()
      await nextFrame()
    })

    const alert = document.querySelector<HTMLElement>('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(document.activeElement).toBe(alert)
    expect(alert?.textContent).toContain('Revise os campos indicados')
    expect(alert?.textContent).toContain('Informe o título da rotina.')
    expect(alert?.textContent).toContain('Informe a descrição da rotina.')
    expect(alert?.textContent).toContain('Selecione o departamento.')
    expect(alert?.textContent).toContain(
      'Selecione a recorrência, inclusive sob demanda.',
    )
    expect(
      document
        .querySelector<HTMLInputElement>('#routine-name')
        ?.getAttribute('aria-invalid'),
    ).toBe('true')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('submits only the model configuration and confirms creation inline', async () => {
    const createdRoutine: Routine = {
      id: 'routine-importar-notas',
      departmentId: 'dept-fiscal',
      name: 'Importar notas',
      shortName: 'Importar notas',
      description: 'Importar e conferir as notas recebidas.',
      recurrence: 'monthly',
      defaultAssigneeId: 'employee-fiscal',
      defaultDueDay: 5,
      isTemplate: true,
      active: true,
    }
    const onCreate = vi.fn<(input: CreateRoutineInput) => Routine>(
      () => createdRoutine,
    )

    await renderPage(onCreate)

    await setControlValue(
      getControl<HTMLInputElement>('#routine-name'),
      '  Importar notas  ',
    )
    await setControlValue(
      getControl<HTMLTextAreaElement>('#routine-description'),
      '  Importar e conferir as notas recebidas.  ',
    )
    await setControlValue(
      getControl<HTMLSelectElement>('#routine-department'),
      'dept-fiscal',
    )

    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="recurrence"][value="monthly"]',
      ).click()
    })

    await setControlValue(
      getControl<HTMLSelectElement>('#routine-assignee'),
      'employee-fiscal',
    )
    await setControlValue(getControl<HTMLInputElement>('#routine-due-day'), '5')

    expect(document.body.textContent).toContain('Importar notas')
    expect(document.body.textContent).toContain('Mensal')
    expect(document.body.textContent).toContain('Ana Fiscal')
    expect(document.body.textContent).toContain('Todo mês, dia 5')

    await act(async () => {
      getSubmitButton().click()
    })

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      departmentId: 'dept-fiscal',
      name: 'Importar notas',
      description: 'Importar e conferir as notas recebidas.',
      recurrence: 'monthly',
      defaultAssigneeId: 'employee-fiscal',
      defaultDueDay: 5,
    })

    const confirmation = document.querySelector<HTMLElement>('[role="status"]')
    expect(confirmation?.textContent).toContain('Rotina criada')
    expect(confirmation?.textContent).toContain('Importar notas')
    expect(confirmation?.textContent).toContain(
      'Nenhuma tarefa ou planilha foi criada.',
    )
  })
})

async function renderPage(onCreate: (input: CreateRoutineInput) => Routine) {
  await act(async () => {
    root.render(
      <CreateRoutinePage
        data={data}
        period="2026-07"
        onCreate={onCreate}
        onCancel={() => undefined}
      />,
    )
  })
}

function getHeading(text: string): HTMLHeadingElement | undefined {
  return [...document.querySelectorAll<HTMLHeadingElement>('h1, h2, h3')].find(
    (heading) => heading.textContent?.includes(text),
  )
}

function getControl<Element extends HTMLElement>(selector: string): Element {
  const element = document.querySelector<Element>(selector)
  if (!element) throw new Error(`Control not found: ${selector}`)
  return element
}

function getSubmitButton(): HTMLButtonElement {
  return getControl<HTMLButtonElement>('button[type="submit"]')
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
