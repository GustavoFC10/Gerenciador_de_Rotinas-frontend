import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { RoutineControlData } from '../types/domain'
import { isLeader } from '../utils/permissions'

function CompaniesPage({ data }: { data: RoutineControlData }) {
  const { user } = useAppState()
  const [search, setSearch] = useState('')
  const routinesByClient = useMemo(() => {
    const counts = new Map<string, number>()
    data.clientRoutineLinks.forEach((link) =>
      counts.set(link.clientId, (counts.get(link.clientId) ?? 0) + 1),
    )
    return counts
  }, [data.clientRoutineLinks])
  const filteredClients = useMemo(() => {
    const query = normalizeSearch(search)

    return [...data.clients]
      .filter((client) =>
        normalizeSearch(
          [client.code, client.name, client.legalName, client.document]
            .filter(Boolean)
            .join(' '),
        ).includes(query),
      )
      .sort(
        (left, right) =>
          left.code.localeCompare(right.code, 'pt-BR', { numeric: true }) ||
          left.name.localeCompare(right.name, 'pt-BR'),
      )
  }, [data.clients, search])

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        label="Listagem"
        title="Todas as empresas"
        meta={`${data.clients.length} cadastradas`}
        actions={
          isLeader(user) ? (
            <CatalogAction to={ROUTES.COMPANY_CREATE}>
              Adicionar empresa
            </CatalogAction>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-black text-[var(--color-text-strong)]">
              Cadastro completo
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Inclui empresas fora da planilha atualmente selecionada.
            </p>
          </div>
          <TextField
            label="Buscar empresa"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Código, nome ou CNPJ"
            className="w-full sm:w-80"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead className="bg-[var(--color-table-header-bg)] text-xs uppercase tracking-wide text-[var(--color-table-heading-text)]">
              <tr>
                <CatalogHeading>Código</CatalogHeading>
                <CatalogHeading>Empresa</CatalogHeading>
                <CatalogHeading>CNPJ</CatalogHeading>
                <CatalogHeading>Divisão fiscal</CatalogHeading>
                <CatalogHeading>Rotinas</CatalogHeading>
                <CatalogHeading>Situação</CatalogHeading>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-divider)]">
              {filteredClients.map((client) => {
                const fiscalAssignment = client.divisionAssignments?.find(
                  (assignment) =>
                    data.departments
                      .find(
                        (department) =>
                          department.id === assignment.departmentId,
                      )
                      ?.name.toLocaleLowerCase('pt-BR')
                      .includes('fiscal'),
                )
                const division = data.divisions?.find(
                  (item) => item.id === fiscalAssignment?.divisionId,
                )

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-[var(--color-table-row-hover-bg)]"
                  >
                    <CatalogCell className="font-bold text-[var(--color-text-muted)]">
                      {client.code}
                    </CatalogCell>
                    <CatalogCell>
                      <Link
                        to={`${ROUTES.COMPANIES}/${encodeURIComponent(client.id)}?source=catalog`}
                        className="font-black text-[var(--color-text-strong)] hover:text-[var(--color-brand)] focus-visible:underline"
                      >
                        {client.name}
                      </Link>
                      {client.legalName && client.legalName !== client.name && (
                        <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                          {client.legalName}
                        </span>
                      )}
                    </CatalogCell>
                    <CatalogCell>
                      {client.document ?? 'Não informado'}
                    </CatalogCell>
                    <CatalogCell>
                      {division?.name ?? 'Não informada'}
                    </CatalogCell>
                    <CatalogCell>
                      {routinesByClient.get(client.id) ?? 0}
                    </CatalogCell>
                    <CatalogCell>
                      <StatusBadge active={client.active !== false} />
                    </CatalogCell>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <CatalogEmpty>Nenhuma empresa encontrada.</CatalogEmpty>
        )}
      </Card>
    </div>
  )
}

export function CatalogAction({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 text-sm font-bold text-[var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
    >
      {children}
    </Link>
  )
}

export function CatalogHeading({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-[var(--color-table-border)] px-4 py-3 font-bold">
      {children}
    </th>
  )
}

export function CatalogCell({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td
      className={`px-4 py-3 text-sm text-[var(--color-text-muted)] ${className}`}
    >
      {children}
    </td>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        active
          ? 'bg-[var(--status-completed-bg)] text-[var(--status-completed-text)] ring-1 ring-[var(--status-completed-border)]'
          : 'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-divider)]'
      }`}
    >
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

export function CatalogEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-[var(--color-divider)] px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
      {children}
    </p>
  )
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

export default CompaniesPage
