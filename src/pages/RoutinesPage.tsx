import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import { getRoutineRecurrenceLabel } from '../constants/entityOptions'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { RoutineControlData } from '../types/domain'
import { isLeader } from '../utils/permissions'
import { formatRoutineSchedule } from '../utils/routineSchedule'
import {
  CatalogAction,
  CatalogCell,
  CatalogEmpty,
  CatalogHeading,
  StatusBadge,
} from './CompaniesPage'

function RoutinesPage({ data }: { data: RoutineControlData }) {
  const { user } = useAppState()
  const [search, setSearch] = useState('')
  const clientsByRoutine = useMemo(() => {
    const clients = new Map<string, Set<string>>()
    data.clientRoutineLinks.forEach((link) => {
      const routineClients = clients.get(link.routineId) ?? new Set<string>()
      routineClients.add(link.clientId)
      clients.set(link.routineId, routineClients)
    })
    return clients
  }, [data.clientRoutineLinks])
  const filteredRoutines = useMemo(() => {
    const query = normalizeSearch(search)

    return [...data.routines]
      .filter((routine) =>
        normalizeSearch(
          [routine.name, routine.shortName, routine.description]
            .filter(Boolean)
            .join(' '),
        ).includes(query),
      )
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }, [data.routines, search])

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        label="Listagem"
        title="Todas as rotinas"
        meta={`${data.routines.length} cadastradas`}
        actions={
          isLeader(user) ? (
            <CatalogAction to={ROUTES.ROUTINE_CREATE}>
              Criar rotina
            </CatalogAction>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-black text-[var(--color-text-strong)]">
              Catálogo de modelos
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Inclui rotinas que ainda não pertencem a nenhuma planilha.
            </p>
          </div>
          <TextField
            label="Buscar rotina"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou descrição"
            className="w-full sm:w-80"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead className="bg-[var(--color-table-header-bg)] text-xs uppercase tracking-wide text-[var(--color-table-heading-text)]">
              <tr>
                <CatalogHeading>Rotina</CatalogHeading>
                <CatalogHeading>Departamento</CatalogHeading>
                <CatalogHeading>Recorrência</CatalogHeading>
                <CatalogHeading>Agenda e prazo</CatalogHeading>
                <CatalogHeading>Empresas</CatalogHeading>
                <CatalogHeading>Situação</CatalogHeading>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-divider)]">
              {filteredRoutines.map((routine) => {
                const department = data.departments.find(
                  (item) => item.id === routine.departmentId,
                )

                return (
                  <tr
                    key={routine.id}
                    className="hover:bg-[var(--color-table-row-hover-bg)]"
                  >
                    <CatalogCell>
                      <Link
                        to={`${ROUTES.ROUTINES}/${encodeURIComponent(routine.id)}?source=catalog`}
                        className="font-black text-[var(--color-text-strong)] hover:text-[var(--color-brand)] focus-visible:underline"
                      >
                        {routine.name}
                      </Link>
                      {routine.description && (
                        <span className="mt-0.5 line-clamp-1 block max-w-sm text-xs text-[var(--color-text-muted)]">
                          {routine.description}
                        </span>
                      )}
                    </CatalogCell>
                    <CatalogCell>
                      {department?.name ?? 'Não informado'}
                    </CatalogCell>
                    <CatalogCell>
                      {getRoutineRecurrenceLabel(routine.recurrence)}
                    </CatalogCell>
                    <CatalogCell>{formatRoutineSchedule(routine)}</CatalogCell>
                    <CatalogCell>
                      {clientsByRoutine.get(routine.id)?.size ?? 0}
                    </CatalogCell>
                    <CatalogCell>
                      <StatusBadge active={routine.active !== false} />
                    </CatalogCell>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredRoutines.length === 0 && (
          <CatalogEmpty>Nenhuma rotina encontrada.</CatalogEmpty>
        )}
      </Card>
    </div>
  )
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

export default RoutinesPage
