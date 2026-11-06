/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProcessForm from './ProcessForm'
import { makeProcessTestResource, processTestCatalog } from './processTestFixtures'
import type { ProcessResource } from '../../types/processes'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

async function render(process?: ProcessResource) {
  const submit = vi.fn().mockResolvedValue(undefined)
  await act(async () => root.render(<ProcessForm catalog={{ ...processTestCatalog,
    permissions: process?.permissions ?? processTestCatalog.permissions }}
    scope={{ organizationId: 'org-1', membershipId: 'member-1' }} initialType="outros"
    process={process} onSubmit={submit} onClose={vi.fn()} />))
  return submit
}
function control(label: string) {
  const element = [...document.querySelectorAll<HTMLLabelElement>('label')].find(item => item.textContent?.startsWith(label))!
  return document.getElementById(element.htmlFor) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
}
async function enter(label: string, value: string) {
  const element = control(label)
  await act(async () => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  })
}

describe('Outros form', () => {
  it.each([['fin', true], ['fin', false], ['reg', true], ['reg', false]] as const)(
    'submits the minimal explicit configuration %s/Leggacy %s with value zero', async (departamentoSolicitado, acionarLeggacy) => {
      const submit = await render()
      expect(document.querySelector('[id$="-cnpj"]')).toBeNull()
      expect(document.querySelector('input[type="search"]')).toBeNull()
      await enter('Nome da empresa', 'Empresa livre')
      await enter('Descrição do processo', 'Solicitar certidão')
      await enter('Valor do processo', '0')
      await enter('Solicitar a qual departamento?', departamentoSolicitado)
      await enter('Acionar a Leggacy?', String(acionarLeggacy))
      await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
      expect(submit).toHaveBeenCalledWith({ tipo: 'outros', empresa: 'Empresa livre', descricaoProcesso: 'Solicitar certidão', valorProcesso: '0.00', departamentoSolicitado, acionarLeggacy })
    },
  )

  it('locks configuration after a completed task and leaves omitted financial data out of editing', async () => {
    const process = makeProcessTestResource({ tipo: 'outros', descricaoProcesso: 'Solicitar certidão', departamentoSolicitado: 'reg', acionarLeggacy: false,
      tarefas: { ot1: { s: 'feito', por: 'member-1', em: '2026-11-06T12:00:00Z' } },
      permissions: { ...processTestCatalog.permissions, viewFinancial: false },
    })
    const submit = await render(process)
    expect(control('Solicitar a qual departamento?').disabled).toBe(true)
    expect(control('Acionar a Leggacy?').disabled).toBe(true)
    expect(document.body.textContent).not.toContain('Valor do processo')
    await enter('Nome da empresa', 'Nome corrigido')
    await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(submit.mock.calls[0]?.[0]).toEqual({ tipo: 'outros', empresa: 'Nome corrigido', descricaoProcesso: 'Solicitar certidão', departamentoSolicitado: 'reg', acionarLeggacy: false })
  })
})
