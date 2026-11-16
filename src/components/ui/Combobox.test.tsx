/** @vitest-environment happy-dom */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Combobox, { type ComboboxOption, type ComboboxProps } from './Combobox'
import Dialog from './Dialog'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const options: ComboboxOption[] = [
  { value: 'disabled', label: 'Empresa indisponível', disabled: true },
  {
    value: 'acucar',
    label: 'Açúcar Comércio',
    description: 'CNPJ 12.345.678/0001-95 · Código 001',
    keywords: ['12345678000195', '001'],
  },
  { value: 'cedro', label: 'Cedro Serviços', description: 'Código 002' },
]
let root: Root
let host: HTMLDivElement
let onValueChange: ReturnType<typeof vi.fn<(value: string | null) => void>>

function Probe({
  value: initialValue = null,
  ...props
}: Partial<ComboboxProps> = {}) {
  const [value, setValue] = useState(initialValue)
  return (
    <form>
      <Combobox
        id="company"
        label="Empresa"
        name="companyId"
        options={options}
        required
        {...props}
        value={value}
        onValueChange={(next) => {
          onValueChange(next)
          setValue(next)
        }}
      />
      <button type="submit">Salvar</button>
    </form>
  )
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  onValueChange = vi.fn()
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

const input = () => host.querySelector<HTMLInputElement>('[role="combobox"]')!
const popup = () => document.querySelector<HTMLElement>('[data-combobox-popup]')
const allOptions = () => [
  ...document.querySelectorAll<HTMLElement>('[role="option"]'),
]
async function render(props: Partial<ComboboxProps> = {}) {
  await act(async () => root.render(<Probe {...props} />))
}
async function focus() {
  await act(async () => input().focus())
}
async function type(value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!
    setter.call(input(), value)
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function key(value: string) {
  const event = new KeyboardEvent('keydown', {
    key: value,
    bubbles: true,
    cancelable: true,
  })
  await act(async () => input().dispatchEvent(event))
  return event
}

describe('Combobox', () => {
  it('dismisses its popup before the real dialog and restores the trigger on close', async () => {
    const close = vi.fn()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    function Example() {
      const [open, setOpen] = useState(true)
      return (
        <Dialog
          open={open}
          title="Selecionar empresa"
          onClose={() => {
            close()
            setOpen(false)
          }}
        >
          <Probe />
        </Dialog>
      )
    }
    try {
      await act(async () => root.render(<Example />))
      const field =
        document.querySelector<HTMLInputElement>('[role="combobox"]')!
      await act(async () => field.focus())
      expect(popup()?.closest('[role="dialog"]')).not.toBeNull()
      await act(async () =>
        field.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        ),
      )
      expect(popup()).toBeNull()
      expect(close).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(field)
      await act(async () =>
        field.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        ),
      )
      expect(close).toHaveBeenCalledOnce()
      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(document.activeElement).toBe(trigger)
    } finally {
      trigger.remove()
    }
  })
  it('uses one visible field and submits only a confirmed option ID', async () => {
    await render({ hint: 'Busque por nome, código ou CNPJ.' })
    const form = host.querySelector('form')!
    const submitted = vi.fn((event: Event) => event.preventDefault())
    form.addEventListener('submit', submitted)
    expect(host.querySelectorAll('input:not([type="hidden"])')).toHaveLength(1)
    expect(host.querySelector('select')).toBeNull()
    expect(host.querySelector('label')?.htmlFor).toBe(input().id)
    expect(input().getAttribute('aria-describedby')).toBe('company-hint')

    await focus()
    await type('Texto sem uma empresa selecionada')
    expect(input().value).not.toBe('')
    expect(input().checkValidity()).toBe(false)
    await act(async () => form.requestSubmit())
    expect(submitted).not.toHaveBeenCalled()
    expect(new FormData(form).get('companyId')).toBe('')

    await type('acucar')
    await key('Enter')
    expect(onValueChange).toHaveBeenLastCalledWith('acucar')
    expect(input().value).toBe('Açúcar Comércio')
    expect(input().checkValidity()).toBe(true)
    expect(new FormData(form).get('companyId')).toBe('acucar')
    await act(async () => form.requestSubmit())
    expect(submitted).toHaveBeenCalledTimes(1)

    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="Limpar seleção"]')!
        .click(),
    )
    expect(onValueChange).toHaveBeenLastCalledWith(null)
    expect(input().checkValidity()).toBe(false)
    expect(new FormData(form).get('companyId')).toBe('')
  })

  it('searches accents, descriptions and keywords; empty results cannot be committed', async () => {
    await render()
    await focus()
    await type('acucar')
    expect(allOptions().map((option) => option.textContent)).toEqual([
      'Açúcar ComércioCNPJ 12.345.678/0001-95 · Código 001',
    ])
    const activeId = input().getAttribute('aria-activedescendant')
    expect(document.getElementById(activeId!)?.textContent).toContain('Açúcar')
    await type('12345678000195')
    expect(allOptions()).toHaveLength(1)
    await type('Código 002')
    expect(allOptions()[0]?.textContent).toContain('Cedro')
    await type('Empresa que não existe')
    expect(allOptions()).toHaveLength(0)
    expect(popup()?.textContent).toContain('Nenhum resultado encontrado.')
    expect(input().hasAttribute('aria-activedescendant')).toBe(false)
    await key('Enter')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('moves with arrows, skips disabled options and requires an explicit choice', async () => {
    await render()
    await focus()
    expect(input().getAttribute('aria-expanded')).toBe('true')
    expect(
      document.getElementById(input().getAttribute('aria-controls')!)?.role,
    ).toBe('listbox')
    await act(async () => allOptions()[0]!.click())
    expect(onValueChange).not.toHaveBeenCalled()
    await key('ArrowDown')
    expect(
      document.getElementById(input().getAttribute('aria-activedescendant')!)
        ?.textContent,
    ).toContain('Açúcar')
    await key('ArrowDown')
    expect(
      document.getElementById(input().getAttribute('aria-activedescendant')!)
        ?.textContent,
    ).toContain('Cedro')
    await key('Enter')
    expect(onValueChange).toHaveBeenLastCalledWith('cedro')
    expect(input().getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(input())
    await key('ArrowUp')
    expect(input().getAttribute('aria-expanded')).toBe('true')
    expect(
      document.getElementById(input().getAttribute('aria-activedescendant')!)
        ?.textContent,
    ).toContain('Cedro')
    const tab = await key('Tab')
    expect(tab.defaultPrevented).toBe(false)
    expect(input().getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps the popup inside its dialog and Escape closes only the popup', async () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.append(dialog)
    dialog.append(host)
    const ancestorEscape = vi.fn()
    document.addEventListener('keydown', ancestorEscape, true)
    try {
      await render({ value: 'cedro' })
      await focus()
      expect(popup()?.parentElement).toBe(dialog)
      await type('acucar')
      await key('Escape')
      expect(input().getAttribute('aria-expanded')).toBe('false')
      expect(input().value).toBe('Cedro Serviços')
      expect(document.activeElement).toBe(input())
      expect(onValueChange).not.toHaveBeenCalled()
      expect(ancestorEscape).not.toHaveBeenCalled()
      await key('Escape')
      expect(ancestorEscape).toHaveBeenCalledOnce()
    } finally {
      document.removeEventListener('keydown', ancestorEscape, true)
      dialog.remove()
    }
  })

  it('dismisses outside/blur without committing free text and respects disabled/error states', async () => {
    await render({ value: 'cedro' })
    await focus()
    await type('acucar')
    await act(async () =>
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      ),
    )
    expect(input().value).toBe('Cedro Serviços')
    expect(input().getAttribute('aria-expanded')).toBe('false')
    expect(onValueChange).not.toHaveBeenCalled()
    await act(async () => input().blur())
    await render({ disabled: true, value: 'cedro', error: 'Não autorizado.' })
    expect(input().disabled).toBe(true)
    expect(
      host.querySelector<HTMLInputElement>('[type="hidden"]')?.disabled,
    ).toBe(true)
    expect(input().getAttribute('aria-invalid')).toBe('true')
    expect(input().getAttribute('aria-describedby')).toBe('company-error')
    expect(input().checkValidity()).toBe(true)
    await render({ disabled: false, error: 'Seleção indisponível.' })
    expect(input().checkValidity()).toBe(false)
  })

  it('positions the popup above an anchor near the bottom and stays inside the viewport', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1280)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(720)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return (
          this.role === 'combobox'
            ? {
                x: 1120,
                y: 650,
                left: 1120,
                right: 1320,
                top: 650,
                bottom: 690,
                width: 200,
                height: 40,
              }
            : {
                x: 0,
                y: 0,
                left: 0,
                right: 240,
                top: 0,
                bottom: 280,
                width: 240,
                height: 280,
              }
        ) as DOMRect
      },
    )
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(280)
    await render()
    await focus()
    expect(Number.parseFloat(popup()!.style.top)).toBeLessThan(650)
    expect(Number.parseFloat(popup()!.style.left)).toBeGreaterThanOrEqual(8)
    expect(
      Number.parseFloat(popup()!.style.left) +
        Number.parseFloat(popup()!.style.width),
    ).toBeLessThanOrEqual(1272)
    expect(Number.parseFloat(popup()!.style.maxHeight)).toBeLessThanOrEqual(320)
  })
})
