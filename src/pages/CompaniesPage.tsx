import { useMemo, useState } from 'react'

import {
  CatalogAction,
  CatalogChevron,
  CatalogDatum,
  CatalogEmpty,
  CatalogHeader,
  CatalogList,
  CatalogPrimary,
  CatalogRow,
  CatalogRows,
  CatalogStatus,
} from '../components/catalog/CatalogList'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import type { RoutineControlData } from '../types/domain'
import { normalizeSearch } from '../utils/normalizeSearch'
import { isLeader } from '../utils/permissions'

const companyGrid =
  'lg:grid-cols-[5rem_minmax(14rem,1.5fr)_minmax(10rem,1fr)_minmax(9rem,.8fr)_5rem_6rem_1.25rem]'

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
          [
            client.code,
            client.name,
            client.legalName,
            client.document,
            client.email,
          ]
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
    <CatalogList
      title="Empresas"
      countLabel={`${data.clients.length} cadastradas`}
      resultLabel={`${filteredClients.length} de ${data.clients.length}`}
      searchLabel="Buscar empresas"
      searchPlaceholder="Buscar por nome, código, CNPJ ou e-mail"
      searchValue={search}
      onSearchChange={setSearch}
      action={
        isLeader(user) ? (
          <CatalogAction to={ROUTES.COMPANY_CREATE}>
            Adicionar empresa
          </CatalogAction>
        ) : undefined
      }
    >
      <CatalogHeader gridClass={companyGrid}>
        <span>Código</span>
        <span>Empresa</span>
        <span>CNPJ</span>
        <span>Divisão fiscal</span>
        <span>Rotinas</span>
        <span>Situação</span>
        <span />
      </CatalogHeader>

      {filteredClients.length > 0 ? (
        <CatalogRows>
          {filteredClients.map((client) => {
            const fiscalAssignment = client.divisionAssignments?.find(
              (assignment) =>
                data.departments
                  .find(
                    (department) => department.id === assignment.departmentId,
                  )
                  ?.name.toLocaleLowerCase('pt-BR')
                  .includes('fiscal'),
            )
            const division = data.divisions?.find(
              (item) => item.id === fiscalAssignment?.divisionId,
            )

            return (
              <CatalogRow
                key={client.id}
                to={`${ROUTES.COMPANIES}/${encodeURIComponent(client.id)}?source=catalog`}
                ariaLabel={`Abrir empresa ${client.name}`}
                gridClass={companyGrid}
              >
                <CatalogDatum
                  label="Código"
                  className="font-extrabold text-[var(--color-text-strong)]"
                >
                  {client.code}
                </CatalogDatum>
                <CatalogPrimary
                  title={client.name}
                  description={
                    client.legalName && client.legalName !== client.name
                      ? client.legalName
                      : client.email
                  }
                />
                <CatalogDatum label="CNPJ">
                  {client.document ?? 'Não informado'}
                </CatalogDatum>
                <CatalogDatum label="Divisão fiscal">
                  {division?.name ?? 'Não informada'}
                </CatalogDatum>
                <CatalogDatum label="Rotinas">
                  {routinesByClient.get(client.id) ?? 0}
                </CatalogDatum>
                <CatalogDatum label="Situação">
                  <CatalogStatus active={client.active !== false} />
                </CatalogDatum>
                <CatalogChevron />
              </CatalogRow>
            )
          })}
        </CatalogRows>
      ) : (
        <CatalogEmpty
          title={
            search
              ? `Nenhuma empresa encontrada para “${search}”.`
              : 'Nenhuma empresa cadastrada.'
          }
          searchValue={search}
          onClear={() => setSearch('')}
        />
      )}
    </CatalogList>
  )
}

export default CompaniesPage
