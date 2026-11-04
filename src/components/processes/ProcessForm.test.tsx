/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { processService } from '../../services/processService'
import ProcessForm from './ProcessForm'
import { processTestCatalog } from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('ProcessForm', () => {
  it('keeps the complete draft after a network failure and allows submitting again', async () => {
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
    vi.spyOn(processService, 'companyOptions').mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            code: 'EMP-01',
            name: 'Empresa Teste',
            legalName: 'Empresa Teste Ltda.',
            cnpj: '12345678000195',
            status: 'active',
          },
        ],
      },
      status: 200,
      headers: new Headers(),
      etag: null,
      requestId: null,
    })
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
      const name = dialog.querySelector<HTMLInputElement>(
        'input[type="search"]',
      )!
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(name, 'Empresa')
        name.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
      const company = [...dialog.querySelectorAll<HTMLButtonElement>('.company-option')].find(
        (option) => option.textContent?.includes('Empresa Teste'),
      )!
      await act(async () => company.click())
      expect(dialog.querySelector('.company-selected')?.textContent).toContain(
        'Empresa Teste',
      )
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
          companyId: '00000000-0000-4000-8000-000000000001',
          cnpj: '12345678000195',
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
      queryClient.clear()
      vi.restoreAllMocks()
    }
  })
})
