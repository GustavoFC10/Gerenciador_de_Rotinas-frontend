/** @vitest-environment happy-dom */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Dialog from './Dialog'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let host: HTMLDivElement
let trigger: HTMLButtonElement

beforeEach(() => {
  host = document.createElement('div')
  host.id = 'root'
  trigger = document.createElement('button')
  trigger.textContent = 'Abrir'
  document.body.append(host, trigger)
  trigger.focus()
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('Dialog', () => {
  it('associates its accessible name and restores document state and focus', async () => {
    const close = vi.fn()
    await act(async () =>
      root.render(
        <Dialog
          open
          title="Identificação"
          description="Revise os dados."
          onClose={close}
        >
          <input aria-label="Nome" />
        </Dialog>,
      ),
    )
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(
      document.getElementById(dialog.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('Identificação')
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('Revise os dados.')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(host.inert).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Fechar diálogo',
    )
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(close).toHaveBeenCalledOnce()
    await act(async () =>
      root.render(
        <Dialog open={false} title="Identificação" onClose={close}>
          Conteúdo
        </Dialog>,
      ),
    )
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(host.inert).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)
  })

  it('closes only the active nested dialog and restores the parent keyboard scope', async () => {
    const parentClose = vi.fn()
    const childClose = vi.fn()
    function Example() {
      const [parent, setParent] = useState(true)
      const [child, setChild] = useState(false)
      return (
        <>
          <Dialog
            open={parent}
            title="Principal"
            onClose={() => {
              parentClose()
              setParent(false)
            }}
          >
            <button id="open-child" onClick={() => setChild(true)}>
              Abrir secundário
            </button>
          </Dialog>
          <Dialog
            open={child}
            title="Secundário"
            onClose={() => {
              childClose()
              setChild(false)
            }}
          >
            Detalhe
          </Dialog>
        </>
      )
    }
    await act(async () => root.render(<Example />))
    const parent = document.querySelector<HTMLElement>('[role="dialog"]')!
    const openChild = document.getElementById('open-child')!
    openChild.focus()
    await act(async () => openChild.click())
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2)
    expect(parent.inert).toBe(true)
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(childClose).toHaveBeenCalledOnce()
    expect(parentClose).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    expect(parent.inert).toBe(false)
    expect(host.inert).toBe(true)
    expect(document.activeElement).toBe(openChild)
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(parentClose).toHaveBeenCalledOnce()
    expect(host.inert).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps forward and reverse Tab inside the active dialog', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList)
    await act(async () =>
      root.render(
        <Dialog
          open
          title="Ações"
          onClose={() => undefined}
          footer={<button id="last">Confirmar</button>}
        >
          <input aria-label="Referência" />
          <button disabled>Indisponível</button>
        </Dialog>,
      ),
    )
    const close = document.querySelector<HTMLElement>('[data-overlay-close]')!
    const last = document.getElementById('last')!
    last.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(document.activeElement).toBe(close)
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(document.activeElement).toBe(last)
  })
})
