/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import ProcessForm from './ProcessForm'
import { processTestCatalog } from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('ProcessForm', () => {
  it('keeps the complete draft after a network failure and allows submitting again', async () => {
    const host = document.createElement('div')
    host.id = 'root'
    document.body.append(host)
    const root = createRoot(host)
    const close = vi.fn()
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error('Conexão interrompida'))
      .mockResolvedValueOnce(undefined)
    try {
      await act(async () =>
        root.render(
          <ProcessForm
            catalog={processTestCatalog}
            initialType="abertura"
            onSubmit={submit}
            onClose={close}
          />,
        ),
      )
      expect(host.inert).toBe(true)
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
      expect(host.contains(dialog)).toBe(false)
      const name = dialog.querySelector<HTMLInputElement>(
        'input[autocomplete="off"]',
      )!
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(name, 'Empresa Teste')
        name.dispatchEvent(new Event('input', { bubbles: true }))
      })
      const form = dialog.querySelector('form')!
      await act(async () =>
        form.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        ),
      )
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'abertura',
          empresa: 'Empresa Teste',
          reunAlinh: true,
          reunAcomp: true,
          custo: null,
        }),
      )
      expect(dialog.querySelector('[role="alert"]')?.textContent).toContain(
        'Conexão interrompida',
      )
      expect(name.value).toBe('Empresa Teste')
      expect(name.disabled).toBe(true)
      expect(dialog.querySelector('[role="status"]')?.textContent).toContain(
        'sem duplicar os e-mails',
      )
      await act(async () =>
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        ),
      )
      expect(close).not.toHaveBeenCalled()
      await act(async () =>
        form.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        ),
      )
      expect(submit).toHaveBeenCalledTimes(2)
      expect(submit.mock.calls[0]?.[0]).toEqual(submit.mock.calls[1]?.[0])
    } finally {
      await act(async () => root.unmount())
      expect(host.inert).toBe(false)
      host.remove()
    }
  })
})
