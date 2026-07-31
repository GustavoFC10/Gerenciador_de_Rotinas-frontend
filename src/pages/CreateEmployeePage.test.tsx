/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { USER_ROLE } from '../constants/roles'
import type {
  CreateEmployeeInput,
  Employee,
  RoutineControlData,
} from '../types/domain'
import CreateEmployeePage from './CreateEmployeePage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const data: RoutineControlData = {
  departments: [
    { id: 'dept-fiscal', name: 'Fiscal' },
    { id: 'dept-pessoal', name: 'Pessoal' },
  ],
  divisions: [],
  clients: [],
  routines: [],
  divisionRoutineLinks: [],
  clientRoutineLinks: [],
  employees: [
    {
      id: 'employee-existing',
      name: 'Funcionário existente',
      login: 'existente@empresa.com.br',
      role: USER_ROLE.EMPLOYEE,
      departmentIds: ['dept-fiscal'],
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

describe('CreateEmployeePage', () => {
  it('separates identity, role and department scope with a live summary', async () => {
    await renderPage(vi.fn())

    expect(getHeading('Adicionar funcionário')).toBeTruthy()
    expect(getHeading('Dados de acesso')).toBeTruthy()
    expect(getHeading('Cargo')).toBeTruthy()
    expect(getHeading('Departamentos permitidos')).toBeTruthy()
    expect(getHeading('Novo funcionário')).toBeTruthy()
    expect(
      document.querySelectorAll<HTMLInputElement>(
        'input[name="employee-role"]',
      ),
    ).toHaveLength(3)
    expect(
      getControl<HTMLInputElement>(
        'input[name="employee-role"][value="employee"]',
      ).checked,
    ).toBe(true)
    expect(
      document.querySelectorAll<HTMLInputElement>(
        'input[name="employee-departments"]',
      ),
    ).toHaveLength(2)
  })

  it('focuses the error summary and explains every missing required group', async () => {
    const onCreate = vi.fn()
    await renderPage(onCreate)

    await act(async () => {
      getSubmitButton().click()
      await nextFrame()
    })

    const alert = getControl<HTMLElement>('[role="alert"]')
    expect(document.activeElement).toBe(alert)
    expect(alert.textContent).toContain('Informe o nome do funcionário.')
    expect(alert.textContent).toContain('Informe o login do funcionário.')
    expect(alert.textContent).toContain(
      'A senha deve ter pelo menos 8 caracteres.',
    )
    expect(alert.textContent).toContain('Confirme a senha inicial.')
    expect(alert.textContent).toContain('Selecione pelo menos um departamento.')
    expect(
      getControl<HTMLInputElement>('#employee-name').getAttribute(
        'aria-invalid',
      ),
    ).toBe('true')
    expect(
      getControl<HTMLElement>('#employee-departments').getAttribute(
        'aria-invalid',
      ),
    ).toBe('true')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('normalizes the login, submits role and scope, and confirms creation', async () => {
    const createdEmployee: Employee = {
      id: 'employee-mariana',
      name: 'Mariana Costa',
      login: 'mariana@empresa.com.br',
      role: USER_ROLE.LEADER,
      departmentIds: ['dept-fiscal', 'dept-pessoal'],
      credentialConfigured: true,
      active: true,
    }
    const onCreate = vi.fn<(input: CreateEmployeeInput) => Employee>(
      () => createdEmployee,
    )
    await renderPage(onCreate)

    await setInputValue(
      getControl<HTMLInputElement>('#employee-name'),
      '  Mariana Costa  ',
    )
    await setInputValue(
      getControl<HTMLInputElement>('#employee-login'),
      '  MARIANA@EMPRESA.COM.BR  ',
    )
    await setInputValue(
      getControl<HTMLInputElement>('#employee-password'),
      'segura123',
    )
    await setInputValue(
      getControl<HTMLInputElement>('#employee-password-confirmation'),
      'segura123',
    )

    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="employee-role"][value="leader"]',
      ).click()
    })
    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="employee-departments"][value="dept-fiscal"]',
      ).click()
    })
    await act(async () => {
      getControl<HTMLInputElement>(
        'input[name="employee-departments"][value="dept-pessoal"]',
      ).click()
    })

    expect(document.body.textContent).toContain(
      'Pode editar cadastros do departamento',
    )
    expect(document.body.textContent).toContain('Fiscal')
    expect(document.body.textContent).toContain('Pessoal')

    await act(async () => {
      getSubmitButton().click()
    })

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Mariana Costa',
      login: 'mariana@empresa.com.br',
      password: 'segura123',
      role: USER_ROLE.LEADER,
      departmentIds: ['dept-fiscal', 'dept-pessoal'],
    })

    const success = getControl<HTMLElement>('[role="status"]')
    expect(success.textContent).toContain('Funcionário criado')
    expect(success.textContent).toContain('Mariana Costa')
    expect(success.textContent).toContain('Líder · 2 departamentos')
    expect(document.activeElement?.textContent).toContain('Mariana Costa')
  })
})

async function renderPage(onCreate: (input: CreateEmployeeInput) => Employee) {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <CreateEmployeePage data={data} onCreate={onCreate} />
      </MemoryRouter>,
    )
  })
}

function getHeading(text: string): HTMLHeadingElement | undefined {
  return [...document.querySelectorAll<HTMLHeadingElement>('h1, h2, h3')].find(
    (heading) => heading.textContent?.includes(text),
  )
}

function getSubmitButton(): HTMLButtonElement {
  return getControl<HTMLButtonElement>('button[type="submit"]')
}

function getControl<Element extends HTMLElement>(selector: string): Element {
  const element = document.querySelector<Element>(selector)
  if (!element) throw new Error(`Element not found: ${selector}`)
  return element
}

async function setInputValue(control: HTMLInputElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set

    valueSetter?.call(control, value)
    control.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}
