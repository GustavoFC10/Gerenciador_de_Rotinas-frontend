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
import { getRoutineRecurrenceLabel } from '../constants/entityOptions'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import type { RoutineControlData } from '../types/domain'
import { normalizeSearch } from '../utils/normalizeSearch'
import { isOrganizationAdmin } from '../utils/permissions'
import { formatRoutineSchedule } from '../utils/routineSchedule'

const routineGrid =
  'lg:grid-cols-[minmax(15rem,1.5fr)_minmax(8rem,.75fr)_8rem_minmax(11rem,1fr)_5rem_6rem_1.25rem]'

function RoutinesPage({ data }: { data: RoutineControlData }) {
  const { user } = useAppState()
  const [search, setSearch] = useState('')
  const clientsByRoutine = useMemo(() => {
    const result = new Map<string, Set<string>>()
    data.tasks.forEach((task) => {
      if (!task.clientId || !task.routineId) return
      const clientIds = result.get(task.routineId) ?? new Set<string>()
      clientIds.add(task.clientId)
      result.set(task.routineId, clientIds)
    })
    return result
  }, [data.tasks])
  const routines = useMemo(() => {
    const query = normalizeSearch(search)
    return [...data.routines]
      .filter((routine) =>
        normalizeSearch(
          [
            routine.name,
            routine.shortName,
            routine.description,
            data.departments.find((item) => item.id === routine.departmentId)
              ?.name,
            getRoutineRecurrenceLabel(routine.recurrence),
          ]
            .filter(Boolean)
            .join(' '),
        ).includes(query),
      )
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }, [data.departments, data.routines, search])

  return (
    <CatalogList
      title="Rotinas"
      countLabel={`${data.routines.length} cadastradas`}
      resultLabel={`${routines.length} de ${data.routines.length}`}
      searchLabel="Buscar rotinas"
      searchPlaceholder="Buscar por nome, departamento ou recorrência"
      searchValue={search}
      onSearchChange={setSearch}
      action={
        isOrganizationAdmin(user) ? (
          <CatalogAction to={ROUTES.ROUTINE_CREATE}>Nova rotina</CatalogAction>
        ) : undefined
      }
    >
      <CatalogHeader gridClass={routineGrid}>
        <span>Rotina</span>
        <span>Departamento</span>
        <span>Recorrência</span>
        <span>Agenda e prazo</span>
        <span>Empresas</span>
        <span>Situação</span>
        <span />
      </CatalogHeader>
      {routines.length ? (
        <CatalogRows>
          {routines.map((routine) => (
            <CatalogRow
              key={routine.id}
              to={`${ROUTES.ROUTINES}/${encodeURIComponent(routine.id)}?source=catalog`}
              ariaLabel={`Abrir rotina ${routine.name}`}
              gridClass={routineGrid}
            >
              <CatalogPrimary
                title={routine.name}
                description={routine.description}
              />
              <CatalogDatum label="Departamento">
                {data.departments.find(
                  (item) => item.id === routine.departmentId,
                )?.name ?? 'Não informado'}
              </CatalogDatum>
              <CatalogDatum label="Recorrência">
                {getRoutineRecurrenceLabel(routine.recurrence)}
              </CatalogDatum>
              <CatalogDatum label="Agenda e prazo">
                {formatRoutineSchedule(routine)}
              </CatalogDatum>
              <CatalogDatum label="Empresas">
                {clientsByRoutine.get(routine.id)?.size ?? 0}
              </CatalogDatum>
              <CatalogDatum label="Situação">
                <CatalogStatus active={routine.active !== false} />
              </CatalogDatum>
              <CatalogChevron />
            </CatalogRow>
          ))}
        </CatalogRows>
      ) : (
        <CatalogEmpty
          title={
            search
              ? `Nenhuma rotina encontrada para “${search}”.`
              : 'Nenhuma rotina cadastrada.'
          }
          searchValue={search}
          onClear={() => setSearch('')}
        />
      )}
    </CatalogList>
  )
}

export default RoutinesPage
