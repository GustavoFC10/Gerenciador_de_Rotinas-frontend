/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import ProcessForm from './ProcessForm'
import { processTestCatalog } from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('ProcessForm', () => {
  it.each(['12345678000195', ''])(
    'opens a company with manual fields and keeps the draft after a network failure (CNPJ: %s)',
    async (cnpjValue) => {
      const host = document.createElement('div')
      host.id = 'root'
      document.body.append(host)
      const root = createRoot(host)
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      const close = vi.fn()
      const submit = vi
        .fn()
        .mockRejectedValueOnce(new Error('Conexão interrompida'))
        .mockResolvedValueOnce(undefined)
      try {
        await act(async () =>
          root.render(
            <QueryClientProvider client={queryClient}>
              <ProcessForm
                catalog={processTestCatalog}
                scope={{ organizationId: 'org-1', membershipId: 'member-1' }}
                initialType="abertura"
                onSubmit={submit}
                onClose={close}
              />
            </QueryClientProvider>,
          ),
        )
        expect(host.inert).toBe(true)
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
        expect(host.contains(dialog)).toBe(false)
        expect(dialog.querySelector('input[type="search"]')).toBeNull()
        const name = dialog.querySelector<HTMLInputElement>(
          'input[id$="-empresa"]',
        )!
        const cnpj =
          dialog.querySelector<HTMLInputElement>('input[id$="-cnpj"]')!
        await act(async () => {
          const setValue = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value',
          )!.set!
          setValue.call(name, 'Empresa Teste')
          name.dispatchEvent(new Event('input', { bubbles: true }))
          setValue.call(cnpj, cnpjValue)
          cnpj.dispatchEvent(new Event('input', { bubbles: true }))
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
            cnpj: cnpjValue,
            reunAlinh: true,
            reunAcomp: true,
            custo: null,
          }),
        )
        expect(submit.mock.calls[0]?.[0]).not.toHaveProperty('companyId')
        expect(dialog.querySelector('[role="alert"]')?.textContent).toContain(
          'Conexão interrompida',
        )
        expect(name.value).toBe('Empresa Teste')
        expect(name.disabled).toBe(true)
        expect(cnpj.value).toBe(cnpjValue)
        expect(cnpj.disabled).toBe(true)
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
        queryClient.clear()
        vi.restoreAllMocks()
      }
    },
  )
})
