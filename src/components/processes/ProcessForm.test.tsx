/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import ProcessForm from './ProcessForm'
import { processTestCatalog } from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('ProcessForm', () => {
  it.each(['aumento_honorarios', 'reducao_honorarios'] as const)(
    'creates %s with only the simple fields',
    async (tipo) => {
      const host = document.createElement('div')
      document.body.append(host)
      const root = createRoot(host)
      const submit = vi.fn().mockResolvedValue(undefined)
      try {
        await act(async () =>
          root.render(
            <ProcessForm
              catalog={processTestCatalog}
              scope={{ organizationId: 'org-1', membershipId: 'member-1' }}
              initialType={tipo}
              onSubmit={submit}
              onClose={vi.fn()}
            />,
          ),
        )
        const dialog = document.querySelector('[role="dialog"]')!
        expect(dialog.textContent).toContain('Nome do cliente')
        expect(dialog.textContent).toContain('obrigatórios na abertura')
        expect(dialog.querySelectorAll('input')).toHaveLength(5)
        expect(
          dialog.querySelector(
            'textarea, select, input[type="date"], input[type="search"]',
          ),
        ).toBeNull()
        const setInput = async (prefix: string, value: string) => {
          const label = [...dialog.querySelectorAll('label')].find((item) =>
            item.textContent?.startsWith(prefix),
          )!
          const input = document.getElementById(
            label.htmlFor,
          ) as HTMLInputElement
          await act(async () => {
            Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              'value',
            )!.set!.call(input, value)
            input.dispatchEvent(new Event('input', { bubbles: true }))
          })
        }
        await setInput('Nome do cliente', 'Cliente Exemplo')
        await setInput('Contato do cliente', 'cliente@exemplo.com')
        await setInput(
          'Honorário anterior',
          tipo === 'aumento_honorarios' ? '0' : '10000',
        )
        await setInput(
          'Novo honorário contábil',
          tipo === 'aumento_honorarios' ? '10000' : '0',
        )
        await act(async () => {
          dialog
            .querySelector('form')!
            .dispatchEvent(
              new Event('submit', { bubbles: true, cancelable: true }),
            )
        })
        expect(submit).toHaveBeenCalledExactlyOnceWith({
          tipo,
          empresa: 'Cliente Exemplo',
          cnpj: '',
          contato: 'cliente@exemplo.com',
          honAnterior: tipo === 'aumento_honorarios' ? '0.00' : '100.00',
          honorario: tipo === 'aumento_honorarios' ? '100.00' : '0.00',
        })
      } finally {
        await act(async () => root.unmount())
        host.remove()
      }
    },
  )
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
