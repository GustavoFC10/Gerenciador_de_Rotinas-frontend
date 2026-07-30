import { describe, expect, it } from 'vitest'

import type { Client } from '../types/domain'
import {
  buildClientClipboardText,
  getClientCopyOptions,
} from './clientClipboard'

const client: Client = {
  id: 'client-0001',
  code: '0001',
  name: 'Empresa Exemplo',
  legalName: 'Empresa Exemplo Ltda.',
  document: '99.000.001/0001-00',
  email: 'contato.0001@example.com',
  phone: '(21) 3000-0001',
  taxRegime: 'simples_nacional',
  divisionAssignments: [
    {
      id: 'assignment-client-0001-fiscal',
      departmentId: 'dept-fiscal',
      divisionId: 'division-fiscal-simples-nacional',
    },
  ],
  active: true,
}
const clipboardContext = {
  departments: [{ id: 'dept-fiscal', name: 'Fiscal' }],
  divisions: [
    {
      id: 'division-fiscal-simples-nacional',
      departmentId: 'dept-fiscal',
      name: 'Simples Nacional',
      slug: 'simples-nacional',
      position: 2,
    },
  ],
}

describe('client clipboard helpers', () => {
  it('formats all saved fields as readable plain text', () => {
    expect(buildClientClipboardText(client, clipboardContext)).toBe(
      [
        'Empresa: Empresa Exemplo',
        'Razão social: Empresa Exemplo Ltda.',
        'Código: 0001',
        'CNPJ: 99.000.001/0001-00',
        'E-mail: contato.0001@example.com',
        'Telefone: (21) 3000-0001',
        'Regime tributário: Simples Nacional',
        'Divisão fiscal: Simples Nacional',
        'Situação: Ativa',
      ].join('\n'),
    )
  })

  it('offers the saved department division as an individual copy action', () => {
    const options = getClientCopyOptions(client, clipboardContext)

    expect(options.map((option) => option.id)).toContain('division-dept-fiscal')
    expect(
      options.find((option) => option.id === 'division-dept-fiscal'),
    ).toMatchObject({
      label: 'Copiar divisão fiscal',
      value: 'Simples Nacional',
    })
  })

  it('offers only individual fields that contain a saved value', () => {
    expect(getClientCopyOptions(client).map((option) => option.id)).toEqual([
      'all',
      'code',
      'document',
      'email',
      'phone',
    ])

    expect(
      getClientCopyOptions({
        id: 'client-minimal',
        code: '0002',
        name: 'Empresa sem contato',
      }).map((option) => option.id),
    ).toEqual(['all', 'code'])
  })
})
