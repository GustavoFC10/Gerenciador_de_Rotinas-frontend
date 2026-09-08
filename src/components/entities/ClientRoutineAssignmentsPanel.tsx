import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  companyService,
  type ClientRoutineAssignmentResource,
} from '../../services/companyService'
import type { Client, Routine } from '../../types/domain'
import { queryKeys } from '../../query/queryKeys'
import { useAuth } from '../../hooks/useAuth'
import Button from '../ui/Button'
import Select from '../ui/Select'
import TextField from '../ui/TextField'

interface ClientRoutineAssignmentsPanelProps {
  client: Client
  routines: Routine[]
  period: string
  canManage: boolean
}

const EMPTY_ASSIGNMENTS: ClientRoutineAssignmentResource[] = []

function ClientRoutineAssignmentsPanel({
  client,
  routines,
  period,
  canManage,
}: ClientRoutineAssignmentsPanelProps) {
  const { activeMembership } = useAuth()
  const queryClient = useQueryClient()
  const scope = {
    organizationId: activeMembership!.organization.id,
    membershipId: activeMembership!.id,
  }
  const referenceDate = `${period}-01`
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [routineId, setRoutineId] = useState('')
  const [startsOn, setStartsOn] = useState(referenceDate)
  const [endsOn, setEndsOn] = useState('')
  const [endingId, setEndingId] = useState<string | null>(null)
  const [endDates, setEndDates] = useState<Record<string, string>>({})

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.companyRoutineAssignments(scope, client.id),
    queryFn: () => companyService.listRoutineAssignments(client.id),
  })
  const assignments = assignmentsQuery.data ?? EMPTY_ASSIGNMENTS
  const isLoading = assignmentsQuery.isPending && !assignmentsQuery.data
  const loadError = assignmentsQuery.error
    ? assignmentsQuery.error instanceof Error
      ? assignmentsQuery.error.message
      : 'Não foi possível carregar as rotinas vinculadas.'
    : ''
  const assignmentMutation = useMutation({
    mutationFn: (action: () => Promise<void>) => action(),
  })
  const isChanging = assignmentMutation.isPending

  const availableRoutines = useMemo(() => {
    if (!isValidRange(startsOn, endsOn)) return []

    return routines.filter(
      (routine) =>
        routine.active !== false &&
        !assignments.some(
          (assignment) =>
            assignment.routineId === routine.id &&
            !assignment.cancelledAt &&
            rangesOverlap(
              assignment.startsOn,
              assignment.endsOn,
              startsOn,
              optionalDate(endsOn),
            ),
        ),
    )
  }, [assignments, endsOn, routines, startsOn])

  const invalidateAffectedOperationalContexts = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.routineControlRoot(scope),
    })

  async function withAction(action: () => Promise<void>) {
    setActionError('')
    setActionMessage('')

    try {
      await assignmentMutation.mutateAsync(action)
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível alterar as rotinas vinculadas.',
      )
    } finally {
      // O estado pending pertence à mutation e bloqueia novas ações duplicadas.
    }
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!routineId) {
      setActionError('Selecione a rotina que será vinculada.')
      return
    }

    if (!isValidDate(startsOn)) {
      setActionError('Informe uma data de início válida.')
      return
    }

    if (!isValidRange(startsOn, endsOn)) {
      setActionError(
        'A data final deve ser igual ou posterior à data de início.',
      )
      return
    }

    if (
      assignments.some(
        (assignment) =>
          assignment.routineId === routineId &&
          !assignment.cancelledAt &&
          rangesOverlap(
            assignment.startsOn,
            assignment.endsOn,
            startsOn,
            optionalDate(endsOn),
          ),
      )
    ) {
      setActionError('Já existe um vínculo dessa rotina no período informado.')
      return
    }

    void withAction(async () => {
      const response = await companyService.createRoutineAssignment(client.id, {
        routineId,
        startsOn,
        endsOn: optionalDate(endsOn),
      })
      queryClient.setQueryData<ClientRoutineAssignmentResource[]>(
        queryKeys.companyRoutineAssignments(scope, client.id),
        (current) => (current ? [...current, response.data] : current),
      )
      setRoutineId('')
      setEndsOn('')
      void invalidateAffectedOperationalContexts()
      setActionMessage('Rotina vinculada à empresa.')
    })
  }

  function beginEnd(assignment: ClientRoutineAssignmentResource) {
    setEndingId(assignment.id)
    setEndDates((current) => ({
      ...current,
      [assignment.id]: current[assignment.id] ?? lastDayOfPeriod(period),
    }))
  }

  function handleEnd(assignment: ClientRoutineAssignmentResource) {
    const nextEndsOn = endDates[assignment.id] ?? ''

    if (!isValidEndDate(assignment.startsOn, nextEndsOn)) {
      setActionError('Informe uma data final igual ou posterior ao início.')
      return
    }

    void withAction(async () => {
      const snapshot = await companyService.getRoutineAssignment(
        client.id,
        assignment.id,
      )

      if (!snapshot.etag) {
        throw new Error(
          'A API não informou a versão necessária para encerrar o vínculo.',
        )
      }

      const response = await companyService.endRoutineAssignment(
        client.id,
        assignment.id,
        nextEndsOn,
        snapshot.etag,
      )
      queryClient.setQueryData<ClientRoutineAssignmentResource[]>(
        queryKeys.companyRoutineAssignments(scope, client.id),
        (current) =>
          current?.map((item) =>
            item.id === assignment.id ? response.data : item,
          ),
      )
      setEndingId(null)
      void invalidateAffectedOperationalContexts()
      setActionMessage('Vínculo de rotina encerrado.')
    })
  }

  function handleCancel(assignment: ClientRoutineAssignmentResource) {
    if (!window.confirm('Cancelar este vínculo de rotina programado?')) return

    void withAction(async () => {
      const snapshot = await companyService.getRoutineAssignment(
        client.id,
        assignment.id,
      )

      if (!snapshot.etag) {
        throw new Error(
          'A API não informou a versão necessária para cancelar o vínculo.',
        )
      }

      await companyService.cancelRoutineAssignment(
        client.id,
        assignment.id,
        snapshot.etag,
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.companyRoutineAssignments(scope, client.id),
        exact: true,
      })
      void invalidateAffectedOperationalContexts()
      setActionMessage('Vínculo de rotina cancelado.')
    })
  }

  return (
    <section aria-labelledby="company-routine-assignments-title">
      <header className="border-b border-[var(--color-divider)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
          Operação
        </p>
        <h3
          id="company-routine-assignments-title"
          className="mt-1 text-base font-black text-[var(--color-text-strong)]"
        >
          Rotinas vinculadas
        </h3>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--color-text-muted)]">
          Vincule rotinas diretamente à empresa. A vigência não depende de um
          departamento.
        </p>
      </header>

      {(loadError || actionError || actionMessage) && (
        <p
          role={loadError || actionError ? 'alert' : 'status'}
          className={
            'mt-5 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold ' +
            (loadError || actionError
              ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
              : 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]')
          }
        >
          {loadError || actionError || actionMessage}
        </p>
      )}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
          Carregando rotinas vinculadas…
        </p>
      ) : assignments.length > 0 ? (
        <ul className="mt-5 divide-y divide-[var(--color-list-border)] border-y border-[var(--color-list-border)]">
          {assignments.map((assignment) => {
            const status = getAssignmentStatus(assignment, referenceDate)
            const isFuture =
              !assignment.cancelledAt && assignment.startsOn > referenceDate
            const canChange =
              canManage &&
              !assignment.cancelledAt &&
              !(assignment.endsOn && assignment.endsOn < referenceDate)
            const isEnding = endingId === assignment.id

            return (
              <li key={assignment.id} className="px-1 py-4 sm:px-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-[var(--color-text-strong)]">
                      {assignment.routineName}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                      {assignment.routineShotname} · {assignment.departmentName}
                      {' · '}
                      {formatRange(assignment.startsOn, assignment.endsOn)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[var(--color-text-subtle)]">
                      {status}
                      {assignment.sourcePresetId
                        ? ' · Aplicada por predefinição'
                        : ''}
                    </p>
                  </div>

                  {canChange && (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {isFuture ? (
                        <Button
                          size="sm"
                          tone="neutral"
                          className="border-[var(--status-error-border)] text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)]"
                          onClick={() => handleCancel(assignment)}
                          disabled={isChanging}
                        >
                          Cancelar
                        </Button>
                      ) : isEnding ? (
                        <>
                          <TextField
                            id={'routine-assignment-end-' + assignment.id}
                            label={<span className="sr-only">Data final</span>}
                            type="date"
                            min={assignment.startsOn}
                            value={endDates[assignment.id] ?? ''}
                            onChange={(event) =>
                              setEndDates((current) => ({
                                ...current,
                                [assignment.id]: event.target.value,
                              }))
                            }
                            disabled={isChanging}
                            className="w-36"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEnd(assignment)}
                            disabled={isChanging}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            tone="neutral"
                            onClick={() => setEndingId(null)}
                            disabled={isChanging}
                          >
                            Voltar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          tone="neutral"
                          onClick={() => beginEnd(assignment)}
                          disabled={isChanging}
                        >
                          Encerrar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
          Nenhuma rotina vinculada a esta empresa.
        </p>
      )}

      {canManage && !isLoading && (
        <form
          onSubmit={handleCreate}
          className="mt-7 border-t border-[var(--color-divider)] pt-6"
        >
          <div>
            <h4 className="text-sm font-extrabold text-[var(--color-text-strong)]">
              Vincular rotina
            </h4>
            <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
              Escolha a rotina e informe o período de vigência do vínculo.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select
                id="company-routine-assignment"
                label="Rotina"
                value={routineId}
                onChange={(event) => setRoutineId(event.target.value)}
                disabled={isChanging}
              >
                <option value="">Selecione</option>
                {availableRoutines.map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.shortName} · {routine.name}
                  </option>
                ))}
              </Select>
            </div>
            <TextField
              id="company-routine-assignment-starts-on"
              label="Início"
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              disabled={isChanging}
            />
            <TextField
              id="company-routine-assignment-ends-on"
              label="Fim (opcional)"
              type="date"
              min={startsOn}
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              disabled={isChanging}
            />
          </div>
          {availableRoutines.length === 0 && (
            <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
              Não há rotina ativa disponível para o período informado.
            </p>
          )}
          <div className="mt-5 flex justify-end">
            <Button
              type="submit"
              disabled={isChanging || availableRoutines.length === 0}
            >
              Vincular rotina
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

function optionalDate(value: string): string | null {
  return value || null
}

function rangesOverlap(
  firstStartsOn: string,
  firstEndsOn: string | null,
  secondStartsOn: string,
  secondEndsOn: string | null,
): boolean {
  const firstEnd = firstEndsOn ?? '9999-12-31'
  const secondEnd = secondEndsOn ?? '9999-12-31'

  return firstStartsOn <= secondEnd && secondStartsOn <= firstEnd
}

function isValidEndDate(startsOn: string, endsOn: string): boolean {
  return Boolean(isValidDate(endsOn) && endsOn >= startsOn)
}

function isValidRange(startsOn: string, endsOn: string): boolean {
  return (
    isValidDate(startsOn) &&
    (!endsOn || (isValidDate(endsOn) && endsOn >= startsOn))
  )
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

function getAssignmentStatus(
  assignment: ClientRoutineAssignmentResource,
  referenceDate: string,
): string {
  if (assignment.cancelledAt) return 'Cancelado'
  if (assignment.endsOn && assignment.endsOn < referenceDate) {
    return 'Encerrado'
  }
  if (assignment.startsOn > referenceDate) return 'Programado'
  return 'Vigente'
}

function formatRange(startsOn: string, endsOn: string | null): string {
  return endsOn
    ? `${formatDate(startsOn)} até ${formatDate(endsOn)}`
    : `Desde ${formatDate(startsOn)}`
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function lastDayOfPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)

  if (!year || !month) return ''

  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

export default ClientRoutineAssignmentsPanel
