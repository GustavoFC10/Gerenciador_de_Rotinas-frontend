import { getClientTaxRegimeLabel } from '../constants/entityOptions'
import type { Client, Department, DepartmentDivision } from '../types/domain'

export interface ClientCopyOption {
  id: string
  label: string
  value: string
}

interface ClientClipboardContext {
  departments?: Department[]
  divisions?: DepartmentDivision[]
}

export function buildClientClipboardText(
  client: Client,
  context: ClientClipboardContext = {},
): string {
  const divisionEntries = getClientDivisionEntries(client, context)

  return [
    ['Empresa', client.name],
    ['Razão social', client.legalName],
    ['Código', client.code],
    ['CNPJ', client.document],
    ['E-mail', client.email],
    ['Telefone', client.phone],
    ['Regime tributário', getClientTaxRegimeLabel(client.taxRegime)],
    ...divisionEntries.map(
      (entry) => [entry.label, entry.value] as [string, string],
    ),
    ['Situação', client.active === false ? 'Inativa' : 'Ativa'],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')
}

export function getClientCopyOptions(
  client: Client,
  context: ClientClipboardContext = {},
): ClientCopyOption[] {
  const divisionEntries = getClientDivisionEntries(client, context)
  const options: ClientCopyOption[] = [
    {
      id: 'code',
      label: 'Copiar código',
      value: client.code,
    },
  ]

  if (client.document) {
    options.push({
      id: 'document',
      label: 'Copiar CNPJ',
      value: client.document,
    })
  }

  if (client.email) {
    options.push({
      id: 'email',
      label: 'Copiar e-mail',
      value: client.email,
    })
  }

  if (client.phone) {
    options.push({
      id: 'phone',
      label: 'Copiar telefone',
      value: client.phone,
    })
  }

  divisionEntries.forEach((entry) => {
    options.push({
      id: `division-${entry.departmentId}`,
      label: `Copiar ${entry.label.toLocaleLowerCase('pt-BR')}`,
      value: entry.value,
    })
  })

  return options
}

function getClientDivisionEntries(
  client: Client,
  { departments = [], divisions = [] }: ClientClipboardContext,
): Array<{ departmentId: string; label: string; value: string }> {
  return (client.divisionAssignments ?? []).flatMap((assignment) => {
    const department = departments.find(
      (item) => item.id === assignment.departmentId,
    )
    const division = divisions.find((item) => item.id === assignment.divisionId)

    if (!department || !division) return []

    return [
      {
        departmentId: department.id,
        label: `Divisão ${department.name.toLocaleLowerCase('pt-BR')}`,
        value: division.name,
      },
    ]
  })
}
