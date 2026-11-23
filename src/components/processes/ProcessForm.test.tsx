/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import ProcessForm from './ProcessForm'
import {
  makeProcessTestResource,
  processTestCatalog,
} from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('ProcessForm', () => {
  it('defaults each observation to Diretoria and submits its chosen departments', async () => {
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
            onSubmit={submit}
            onClose={vi.fn()}
          />,
        ),
      )
      const dialog = document.querySelector('[role="dialog"]')!
      const observations = dialog.querySelector('.process-observation-fields')!
      const inputFor = (labelText: string) => {
        const label = [...dialog.querySelectorAll('label')].find((item) =>
          item.textContent?.trim().startsWith(labelText),
        )!
        return document.getElementById(label.htmlFor) as
          HTMLInputElement | HTMLTextAreaElement
      }
      const fill = (labelText: string, value: string) =>
        act(async () => {
          const input = inputFor(labelText)
          Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(input),
            'value',
          )!.set!.call(input, value)
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
      const add = [...dialog.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Adicionar observação',
      )!
      const toggles = (department: string) =>
        [
          ...observations.querySelectorAll<HTMLButtonElement>(
            '[role="switch"]',
          ),
        ].filter((toggle) => toggle.textContent?.trim() === department)
      const selectType = (id: string) => {
        const name = processTestCatalog.types.find(
          (type) => type.id === id,
        )!.nome
        const option = [
          ...dialog.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
        ].find((button) => button.textContent?.trim().startsWith(name))!
        return act(async () => option.click())
      }
      const save = () =>
        act(async () => {
          dialog
            .querySelector('form')!
            .dispatchEvent(
              new Event('submit', { bubbles: true, cancelable: true }),
            )
        })

      expect(observations.querySelectorAll('textarea')).toHaveLength(0)
      expect(
        dialog.querySelector('[role="radio"][aria-checked="true"]'),
      ).toBeNull()
      await fill('Nome da empresa', 'Cliente Exemplo')
      for (let index = 0; index < 3; index++) {
        await act(async () => add.click())
      }
      expect(
        toggles('Diretoria').map((toggle) =>
          toggle.getAttribute('aria-checked'),
        ),
      ).toEqual(['true', 'true', 'true'])
      for (const department of ['Financeiro', 'Regularidade']) {
        expect(
          toggles(department).map((toggle) =>
            toggle.getAttribute('aria-checked'),
          ),
        ).toEqual(['false', 'false', 'false'])
      }
      await act(async () =>
        dialog
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Remover observação 3"]',
          )!
          .click(),
      )
      await fill('Observação 1', '  Confirmar assinatura.  ')
      await fill('Observação 2', 'Conferir a condição de pagamento.')
      for (const type of ['outros', 'aumento_honorarios', 'abertura']) {
        await selectType(type)
        expect(inputFor('Observação 1').value.trim()).toBe(
          'Confirmar assinatura.',
        )
      }
      expect(inputFor('Detalhes do regime tributário')).toBeInstanceOf(
        HTMLTextAreaElement,
      )
      await act(async () => toggles('Diretoria')[0]!.click())
      expect(
        toggles('Diretoria').map((toggle) =>
          toggle.getAttribute('aria-checked'),
        ),
      ).toEqual(['false', 'true'])
      await save()
      expect(submit).not.toHaveBeenCalled()
      expect(dialog.querySelector('[role="alert"]')?.textContent).toContain(
        'departamento',
      )

      const regularidade = toggles('Regularidade')
      await act(async () => regularidade[0]!.click())
      await act(async () => toggles('Financeiro')[1]!.click())
      expect(regularidade[0]!.getAttribute('aria-checked')).toBe('true')
      expect(regularidade[1]!.getAttribute('aria-checked')).toBe('false')
      await save()

      expect(submit).toHaveBeenCalledOnce()
      expect(submit.mock.calls[0]![0]).toMatchObject({
        notes: [
          { text: 'Confirmar assinatura.', visibleToSectors: ['reg'] },
          {
            text: 'Conferir a condição de pagamento.',
            visibleToSectors: ['com', 'fin'],
          },
        ],
      })
      expect(submit.mock.calls[0]![0]).not.toHaveProperty('obs')
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })

  it.each([
    { editing: false, saved: undefined, toggle: false, expected: true },
    { editing: false, saved: undefined, toggle: true, expected: false },
    { editing: true, saved: undefined, toggle: false, expected: true },
    { editing: true, saved: false, toggle: false, expected: false },
    { editing: true, saved: true, toggle: true, expected: false },
    { editing: true, saved: false, toggle: true, expected: true },
  ])(
    'submits exclusion delivery $expected (editing=$editing, saved=$saved)',
    async ({ editing, saved, toggle, expected }) => {
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
              initialType="exclusao"
              process={
                editing
                  ? makeProcessTestResource({
                      tipo: 'exclusao',
                      entregaDocumentacao: saved,
                      honPerdido: '700.00',
                      obs: 'Observação registrada na abertura',
                    })
                  : undefined
              }
              onSubmit={submit}
              onClose={vi.fn()}
            />,
          ),
        )
        const dialog = document.querySelector('[role="dialog"]')!
        expect(dialog.textContent).not.toContain('Protocolo')
        if (editing) {
          expect(dialog.querySelector('.process-observation-fields')).toBeNull()
          expect(dialog.querySelector('textarea[id$="-obs"]')).toBeNull()
        }
        const control = dialog.querySelector<HTMLButtonElement>(
          '[role="switch"][aria-label="Este processo inclui entrega de documentação ao cliente?"]',
        )!
        expect(control.getAttribute('aria-checked')).toBe(String(saved ?? true))
        if (toggle) await act(async () => control.click())
        if (!editing) {
          for (const [prefix, value] of [
            ['Nome da empresa', 'Cliente Exemplo'],
            ['Honorário mensal que deixa de ser cobrado', '70000'],
          ]) {
            const label = [...dialog.querySelectorAll('label')].find((label) =>
              label.textContent?.startsWith(prefix!),
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
        }
        await act(async () => {
          dialog
            .querySelector('form')!
            .dispatchEvent(
              new Event('submit', { bubbles: true, cancelable: true }),
            )
        })
        expect(submit).toHaveBeenCalledOnce()
        expect(submit.mock.calls[0]![0]).toMatchObject({
          tipo: 'exclusao',
          honPerdido: '700.00',
          entregaDocumentacao: expected,
        })
        expect(submit.mock.calls[0]![0]).not.toHaveProperty('protocolo')
        if (!editing) {
          for (const type of processTestCatalog.types.filter(
            (type) => type.id !== 'exclusao',
          )) {
            const option = [
              ...dialog.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
            ].find((button) => button.textContent?.includes(type.nome))!
            await act(async () => option.click())
            expect(
              dialog.querySelector(
                '[role="switch"][aria-label="Este processo inclui entrega de documentação ao cliente?"]',
              ),
            ).toBeNull()
          }
        }
      } finally {
        await act(async () => root.unmount())
        host.remove()
      }
    },
  )

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
        expect(dialog.querySelectorAll('input')).toHaveLength(6)
        expect(
          dialog.querySelector(
            'textarea, select, input[type="month"], input[type="search"]',
          ),
        ).toBeNull()
        expect(dialog.querySelector('input[type="date"]')).not.toBeNull()
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
          honCobranca: null,
        })
      } finally {
        await act(async () => root.unmount())
        host.remove()
      }
    },
  )
  it.each([
    ['abertura', 'Competência de início da atividade'],
    ['mei', 'Competência de início da atividade'],
    ['outro', 'Competência de início da atividade'],
    ['reativacao', 'Competência de início da atividade'],
    ['inativa', 'Competência de início da inatividade'],
    ['inatividade', 'Última competência de trabalho'],
    ['baixa', 'Última competência de trabalho'],
    ['saida', 'Última competência de trabalho'],
    ['exclusao', 'Última competência de trabalho'],
  ] as const)('shows the %s competence field', async (tipo, label) => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(
          <ProcessForm
            catalog={processTestCatalog}
            scope={{ organizationId: 'org-1', membershipId: 'member-1' }}
            initialType={tipo}
            onSubmit={vi.fn().mockResolvedValue(undefined)}
            onClose={vi.fn()}
          />,
        ),
      )
      const dialog = document.querySelector('[role="dialog"]')!
      const input = dialog.querySelector<HTMLInputElement>(
        'input[type="month"]',
      )
      expect(input).not.toBeNull()
      expect(input?.value).toBe('')
      expect(
        [...dialog.querySelectorAll('label')].some((item) =>
          item.textContent?.startsWith(label),
        ),
      ).toBe(true)
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
  it.each(['alteracao', 'outros'] as const)(
    'does not add a competence field to %s',
    async (tipo) => {
      const host = document.createElement('div')
      document.body.append(host)
      const root = createRoot(host)
      try {
        await act(async () =>
          root.render(
            <ProcessForm
              catalog={processTestCatalog}
              scope={{ organizationId: 'org-1', membershipId: 'member-1' }}
              initialType={tipo}
              onSubmit={vi.fn().mockResolvedValue(undefined)}
              onClose={vi.fn()}
            />,
          ),
        )
        expect(
          document
            .querySelector('[role="dialog"]')
            ?.querySelector('input[type="month"]'),
        ).toBeNull()
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
