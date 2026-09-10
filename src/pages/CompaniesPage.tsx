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
import { compareCompanyCodes, getCompanyCodeLabel } from '../utils/companyCode'
import { normalizeSearch } from '../utils/normalizeSearch'
import { isOrganizationAdmin } from '../utils/permissions'

const companyGrid =
  'lg:grid-cols-[5rem_minmax(14rem,1.5fr)_minmax(10rem,1fr)_5rem_6rem_1.25rem]'

function CompaniesPage({ data }: { data: RoutineControlData }) {
  const { user } = useAppState()
  const [search, setSearch] = useState('')
  const routinesByClient = useMemo(() => {
    const result = new Map<string, Set<string>>()
    data.tasks.forEach((task) => {
      if (!task.clientId || !task.routineId) return
      const routineIds = result.get(task.clientId) ?? new Set<string>()
      routineIds.add(task.routineId)
      result.set(task.clientId, routineIds)
    })
    return result
  }, [data.tasks])
  const clients = useMemo(() => {
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
          compareCompanyCodes(left.code, right.code) ||
          left.name.localeCompare(right.name, 'pt-BR'),
      )
  }, [data.clients, search])

  return (
    <CatalogList
      title="Empresas"
      countLabel={`${data.clients.length} cadastradas`}
      resultLabel={`${clients.length} de ${data.clients.length}`}
      searchLabel="Buscar empresas"
      searchPlaceholder="Buscar por nome, código, CNPJ ou e-mail"
      searchValue={search}
      onSearchChange={setSearch}
      action={
        isOrganizationAdmin(user) ? (
          <CatalogAction to={ROUTES.COMPANY_CREATE}>Nova empresa</CatalogAction>
        ) : undefined
      }
    >
      <CatalogHeader gridClass={companyGrid}>
        <span>Código</span>
        <span>Empresa</span>
        <span>CNPJ</span>
        <span>Rotinas</span>
        <span>Situação</span>
        <span />
      </CatalogHeader>
      {clients.length ? (
        <CatalogRows>
          {clients.map((client) => (
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
                {getCompanyCodeLabel(client.code)}
              </CatalogDatum>
              <CatalogPrimary
                title={client.name}
                description={
                  client.legalName !== client.name
                    ? client.legalName
                    : client.email
                }
              />
              <CatalogDatum label="CNPJ">
                {client.document ?? 'Não informado'}
              </CatalogDatum>
              <CatalogDatum label="Rotinas">
                {routinesByClient.get(client.id)?.size ?? 0}
              </CatalogDatum>
              <CatalogDatum label="Situação">
                <CatalogStatus active={client.active !== false} />
              </CatalogDatum>
              <CatalogChevron />
            </CatalogRow>
          ))}
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
