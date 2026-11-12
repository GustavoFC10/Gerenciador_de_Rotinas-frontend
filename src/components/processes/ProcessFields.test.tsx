/** @vitest-environment happy-dom */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProcessCreateInput, ProcessTypeId } from '../../types/processes'
import ProcessFields, { ProcessOtherFields } from './ProcessFields'
import { processTestCatalog } from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

async function render(
  tipo: ProcessTypeId,
  initial: Partial<ProcessCreateInput> = {},
) {
  const change = vi.fn()
  function Fields() {
    const [value, setValue] = useState<ProcessCreateInput>({
      tipo,
      empresa: 'Empresa',
      ...initial,
    })
    const onChange = (patch: Partial<ProcessCreateInput>) => {
      change(patch)
      setValue((previous) => ({ ...previous, ...patch }))
    }
    return tipo === 'outros' ? (
      <ProcessOtherFields
        value={value}
        onChange={onChange}
        configurationLocked={false}
        viewFinancial
        requireValue
      />
    ) : (
      <ProcessFields
        value={value}
        type={processTestCatalog.types.find((type) => type.id === tipo)!}
        onChange={onChange}
      />
    )
  }
  await act(async () => root.render(<Fields />))
  return change
}

function moneyInput(label: string): HTMLInputElement {
  const fieldLabel = [...host.querySelectorAll('label')].find(
    (item) => item.textContent === label,
  )!
  return document.getElementById(fieldLabel.htmlFor) as HTMLInputElement
}

async function enter(
  input: HTMLInputElement,
  text: string,
  cursor = text.length,
) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, text)
    input.setSelectionRange(cursor, cursor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('Process money fields', () => {
  it.each(['aumento_honorarios', 'reducao_honorarios'] as const)(
    'shows two required fees and an exact preview for %s',
    async (tipo) => {
      await render(tipo, {
        honAnterior: tipo === 'aumento_honorarios' ? '500.00' : '800.00',
        honorario: tipo === 'aumento_honorarios' ? '650.00' : '700.00',
      })
      expect(moneyInput('Honorário anterior').required).toBe(true)
      expect(moneyInput('Novo honorário contábil').required).toBe(true)
      expect(host.querySelector('[role="status"]')?.textContent).toBe(
        tipo === 'aumento_honorarios'
          ? 'Aumento de R$\u00a0150,00/mês'
          : 'Redução de R$\u00a0100,00/mês',
      )
      expect(host.querySelectorAll('input')).toHaveLength(4)
      expect(host.querySelector('input[type="date"]')).not.toBeNull()
      expect(host.querySelector('[role="switch"]')).toBeNull()
    },
  )

  it.each(processTestCatalog.types)(
    'allows free text contact for $id',
    async ({ id }) => {
      const change = await render(id)
      const label = [...host.querySelectorAll('label')].find((item) =>
        item.textContent?.startsWith('Contato do cliente'),
      )!
      const input = document.getElementById(label.htmlFor) as HTMLInputElement
      expect(input.maxLength).toBe(500)
      expect(input.required).toBe(false)
      await enter(input, 'cliente@exemplo.com')
      expect(change).toHaveBeenLastCalledWith({
        contato: 'cliente@exemplo.com',
      })
      await enter(input, '')
      expect(change).toHaveBeenLastCalledWith({ contato: '' })
    },
  )
  it.each([
    ['abertura', 'Valor do processo', 'custo'],
    ['abertura', 'Honorário mensal', 'honorario'],
    ['abertura', 'Valor por funcionário', 'trabValor'],
    ['inativa', 'Honorário atual (antes da inatividade)', 'honAnterior'],
    ['inatividade', 'Honorário mensal que deixa de ser cobrado', 'honPerdido'],
    ['outros', 'Valor do processo', 'valorProcesso'],
  ] as const)(
    'masks %s/%s while typing digits and preserves empty and zero values',
    async (tipo, label, field) => {
      const change = await render(tipo, {
        trab: field === 'trabValor',
        [field]: '1234.56',
      })
      const input = moneyInput(label)
      expect(input.value).toBe('1.234,56')
      expect(input.inputMode).toBe('numeric')
      await enter(input, '')
      expect(input.value).toBe('')
      expect(change).toHaveBeenLastCalledWith({ [field]: '' })

      for (const [digit, formatted] of [
        ['1', '0,01'],
        ['2', '0,12'],
        ['3', '1,23'],
        ['4', '12,34'],
        ['5', '123,45'],
        ['6', '1.234,56'],
      ]) {
        await enter(input, input.value + digit)
        expect(input.value).toBe(formatted)
      }
      expect(change).toHaveBeenLastCalledWith({ [field]: '1234.56' })

      await enter(input, '')
      await enter(input, '0')
      expect(input.value).toBe('0,00')
      expect(change).toHaveBeenLastCalledWith({ [field]: '0.00' })
    },
  )

  it('accepts pasted currency and preserves every cent of large values', async () => {
    const change = await render('outros')
    const input = moneyInput('Valor do processo')
    await enter(input, 'R$ 999.999.999.999,99')
    expect(input.value).toBe('999.999.999.999,99')
    expect(change).toHaveBeenLastCalledWith({
      valorProcesso: '999999999999.99',
    })
    await enter(input, '1.234,56')
    expect(input.value).toBe('1.234,56')
    expect(change).toHaveBeenLastCalledWith({ valorProcesso: '1234.56' })
  })

  it('preserves the cursor when editing in the middle and deleting separators', async () => {
    const change = await render('outros', { valorProcesso: '1234.56' })
    const input = moneyInput('Valor do processo')
    input.focus()
    await enter(input, '1.934,56', 3)
    expect(input.value).toBe('1.934,56')
    expect(input.selectionStart).toBe(3)
    expect(change).toHaveBeenLastCalledWith({ valorProcesso: '1934.56' })

    await enter(input, '1934,56', 1)
    expect(input.value).toBe('1.934,56')
    expect(input.selectionStart).toBe(1)
    await enter(input, '.934,56', 0)
    expect(input.value).toBe('934,56')
    expect(input.selectionStart).toBe(0)
    expect(change).toHaveBeenLastCalledWith({ valorProcesso: '934.56' })
  })
})
