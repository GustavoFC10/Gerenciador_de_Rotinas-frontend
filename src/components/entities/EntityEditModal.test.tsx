/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

import {
  companyService,
  type ClientCompanyResource,
} from '../../services/companyService'
import EntityEditModal from './EntityEditModal'

it('edita o cadastro em Rotinas com os dados e o ETag da ficha aberta', async () => {
  const company: ClientCompanyResource = {
    id: 'company-1',
    name: 'Cadastro atualizado',
    legalName: '',
    code: null,
    cnpj: '',
    email: '',
    mobilePhone: '',
    taxRegime: '',
    version: 7,
    status: 'active',
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
  }
  const get = vi.spyOn(companyService, 'get').mockResolvedValue({
    data: company,
    status: 200,
    etag: '"7"',
    requestId: null,
    headers: new Headers(),
  })
  const onSave = vi.fn().mockRejectedValue(new Error('Conflito de versão.'))
  const onClose = vi.fn()
  const onArchive = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  try {
    await act(async () =>
      root.render(
        <EntityEditModal
          type="client"
          entity={{ id: company.id, name: 'Projeção anterior de Rotinas' }}
          onClose={onClose}
          onSave={onSave}
          onArchive={onArchive}
        />,
      ),
    )
    const drawer = document.querySelector<HTMLElement>('[data-entity-edit-dialog]')!
    expect(
      drawer.querySelector<HTMLInputElement>('#edit-company-name')?.value,
    ).toBe(company.name)
    const cnpj = drawer.querySelector<HTMLInputElement>('#edit-company-cnpj')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(cnpj, '12ABC34501DE35')
      cnpj.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      drawer
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(onSave).toHaveBeenCalledWith({ cnpj: '12.ABC.345/01DE-35' }, '"7"')
    expect(drawer.querySelector('[role="alert"]')?.textContent).toContain(
      'Conflito de versão.',
    )
    expect(cnpj.value).toBe('12.ABC.345/01DE-35')
    expect(onClose).not.toHaveBeenCalled()
    expect(get).toHaveBeenCalledTimes(1)

    const button = (label: string) => [...drawer.querySelectorAll('button')]
      .find((item) => item.textContent?.trim() === label)!
    await act(async () => button('Zona de risco').click())
    const trigger = button('Arquivar empresa')
    trigger.focus()
    await act(async () => trigger.click())
    expect(drawer.inert).toBe(true)
    expect(document.activeElement?.textContent).toBe('Manter empresa')
    await act(async () => document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    ))
    expect(drawer.inert).toBe(false)
    expect(document.activeElement).toBe(trigger)
    expect(onArchive).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})
