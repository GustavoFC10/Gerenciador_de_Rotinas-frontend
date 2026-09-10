import { getClientTaxRegimeLabel } from '../constants/entityOptions'
import type { Client } from '../types/domain'

export interface ClientCopyOption {
  id: string
  label: string
  value: string
}

export function buildClientClipboardText(client: Client): string {
  return [
    ['Empresa', client.name],
    ['Razão social', client.legalName],
    ['Código', client.code],
    ['CNPJ', client.document],
    ['E-mail', client.email],
    ['Telefone', client.phone],
    ['Regime tributário', getClientTaxRegimeLabel(client.taxRegime)],
    ['Situação', client.active === false ? 'Inativa' : 'Ativa'],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')
}

export function getClientCopyOptions(client: Client): ClientCopyOption[] {
  const options: ClientCopyOption[] = []

  if (client.code) {
    options.push({ id: 'code', label: 'Copiar código', value: client.code })
  }

  if (client.document) {
    options.push({
      id: 'document',
      label: 'Copiar CNPJ',
      value: client.document,
    })
  }
  if (client.email) {
    options.push({ id: 'email', label: 'Copiar e-mail', value: client.email })
  }
  if (client.phone) {
    options.push({ id: 'phone', label: 'Copiar telefone', value: client.phone })
  }

  return options
}
