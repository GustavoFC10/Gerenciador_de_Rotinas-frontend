import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  companyService,
  type ClientDepartmentAssignmentResource,
  type ClientRoutineAssignmentResource,
} from '../../services/companyService'
import type { Client, Department, Routine } from '../../types/domain'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Select from '../ui/Select'
import TextField from '../ui/TextField'

interface ClientCoveragePanelProps {
  client: Client
  departments: Department[]
  routines: Routine[]
  period: string
  canManage: boolean
  onChanged: () => Promise<void>
}

function ClientCoveragePanel({
  client,
  departments,
  routines,
  period,
  canManage,
  onChanged,
}: ClientCoveragePanelProps) {
  const referenceDate = `${period}-01`
  const [departmentAssignments, setDepartmentAssignments] = useState<
    ClientDepartmentAssignmentResource[]
  >([])
  const [routineAssignments, setRoutineAssignments] = useState<
    ClientRoutineAssignmentResource[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const [departmentId, setDepartmentId] = useState('')
  const [departmentStartsOn, setDepartmentStartsOn] = useState(referenceDate)
  const [departmentEndsOn, setDepartmentEndsOn] = useState('')
  const [routineId, setRoutineId] = useState('')
  const [routineStartsOn, setRoutineStartsOn] = useState(referenceDate)
  const [routineEndsOn, setRoutineEndsOn] = useState('')
  const [endingDepartmentId, setEndingDepartmentId] = useState<string | null>(
    null,
  )
  const [endingRoutineId, setEndingRoutineId] = useState<string | null>(null)
  const [endDates, setEndDates] = useState<Record<string, string>>({})

  const reloadAssignments = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const [nextDepartments, nextRoutines] = await Promise.all([
        companyService.listDepartmentAssignments(client.id),
        companyService.listRoutineAssignments(client.id),
      ])
      setDepartmentAssignments(nextDepartments)
      setRoutineAssignments(nextRoutines)
    } catch (caughtError) {
      setLoadError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível carregar a cobertura da empresa.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [client.id])

  useEffect(() => {
    void reloadAssignments()
  }, [reloadAssignments])

  const departmentsAvailableForRange = useMemo(() => {
    if (!isValidRange(departmentStartsOn, departmentEndsOn)) return []

    return departments.filter(
      (department) =>
        !departmentAssignments.some(
          (assignment) =>
            assignment.departmentId === department.id &&
            !assignment.cancelledAt &&
            rangesOverlap(
              assignment.startsOn,
              assignment.endsOn,
              departmentStartsOn,
              optionalDate(departmentEndsOn),
            ),
        ),
    )
  }, [
    departmentAssignments,
    departmentEndsOn,
    departmentStartsOn,
    departments,
  ])
  const routinesAvailableForRange = useMemo(() => {
    if (!isValidRange(routineStartsOn, routineEndsOn)) return []

    return routines.filter(
      (routine) =>
        routine.active !== false &&
        hasContinuousDepartmentCoverage(
          departmentAssignments,
          routine.departmentId,
          routineStartsOn,
          optionalDate(routineEndsOn),
        ) &&
        !routineAssignments.some(
          (assignment) =>
            assignment.routineId === routine.id &&
            !assignment.cancelledAt &&
            rangesOverlap(
              assignment.startsOn,
              assignment.endsOn,
              routineStartsOn,
              optionalDate(routineEndsOn),
            ),
        ),
    )
  }, [
    departmentAssignments,
    routineAssignments,
    routineEndsOn,
    routineStartsOn,
    routines,
  ])

  async function refreshAfterAction(message: string) {
    await onChanged()
    await reloadAssignments()
    setActionMessage(message)
  }

  async function withAction(action: () => Promise<void>) {
    setIsChanging(true)
    setActionError('')
    setActionMessage('')

    try {
      await action()
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível alterar a cobertura da empresa.',
      )
    } finally {
      setIsChanging(false)
    }
  }

  async function getCompanyEtag(): Promise<string> {
    const response = await companyService.get(client.id)

    if (!response.etag) {
      throw new Error(
        'A API não informou a versão necessária para alterar o vínculo departamental.',
      )
    }

    return response.etag
  }

  function handleDepartmentCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!departmentId) {
      setActionError('Selecione o departamento para criar o vínculo.')
      return
    }

    if (!isValidDate(departmentStartsOn)) {
      setActionError('Informe uma data de início válida para a cobertura.')
      return
    }

    if (!isValidRange(departmentStartsOn, departmentEndsOn)) {
      setActionError('A data final deve ser igual ou posterior à data de início.')
      return
    }

    if (
      departmentAssignments.some(
        (assignment) =>
          assignment.departmentId === departmentId &&
          !assignment.cancelledAt &&
          rangesOverlap(
            assignment.startsOn,
            assignment.endsOn,
            departmentStartsOn,
            optionalDate(departmentEndsOn),
          ),
      )
    ) {
      setActionError('Já existe uma cobertura desse departamento no período informado.')
      return
    }

    void withAction(async () => {
      const etag = await getCompanyEtag()
      await companyService.createDepartmentAssignment(
        client.id,
        {
          departmentId,
          startsOn: departmentStartsOn,
          endsOn: optionalDate(departmentEndsOn),
        },
        etag,
      )
      setDepartmentId('')
      setDepartmentEndsOn('')
      await refreshAfterAction('Cobertura departamental criada.')
    })
  }

  function handleRoutineCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!routineId) {
      setActionError('Selecione a rotina para criar o vínculo.')
      return
    }

    if (!isValidDate(routineStartsOn)) {
      setActionError('Informe uma data de início válida para o vínculo.')
      return
    }

    if (!isValidRange(routineStartsOn, routineEndsOn)) {
      setActionError('A data final deve ser igual ou posterior à data de início.')
      return
    }

    const selectedRoutine = routines.find((routine) => routine.id === routineId)

    if (!selectedRoutine || selectedRoutine.active === false) {
      setActionError('A rotina selecionada não está mais disponível.')
      return
    }

    if (
      !hasContinuousDepartmentCoverage(
        departmentAssignments,
        selectedRoutine.departmentId,
        routineStartsOn,
        optionalDate(routineEndsOn),
      )
    ) {
      setActionError(
        'A cobertura departamental precisa permanecer contínua durante toda a vigência da rotina.',
      )
      return
    }

    if (
      routineAssignments.some(
        (assignment) =>
          assignment.routineId === routineId &&
          !assignment.cancelledAt &&
          rangesOverlap(
            assignment.startsOn,
            assignment.endsOn,
            routineStartsOn,
            optionalDate(routineEndsOn),
          ),
      )
    ) {
      setActionError('Já existe um vínculo dessa rotina no período informado.')
      return
    }

    void withAction(async () => {
      await companyService.createRoutineAssignment(client.id, {
        routineId,
        startsOn: routineStartsOn,
        endsOn: optionalDate(routineEndsOn),
      })
      setRoutineId('')
      setRoutineEndsOn('')
      await refreshAfterAction('Vínculo de rotina criado.')
    })
  }

  function handleDepartmentEnd(assignment: ClientDepartmentAssignmentResource) {
    const endsOn = endDates[assignment.id] ?? ''

    if (!isValidEndDate(assignment.startsOn, endsOn)) {
      setActionError('Informe uma data final igual ou posterior ao início.')
      return
    }

    void withAction(async () => {
      const etag = await getCompanyEtag()
      await companyService.endDepartmentAssignment(
        client.id,
        assignment.id,
        endsOn,
        etag,
      )
      setEndingDepartmentId(null)
      await refreshAfterAction('Cobertura departamental encerrada.')
    })
  }

  function handleRoutineEnd(assignment: ClientRoutineAssignmentResource) {
    const endsOn = endDates[assignment.id] ?? ''

    if (!isValidEndDate(assignment.startsOn, endsOn)) {
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
          'A API não informou a versão necessária para encerrar o vínculo de rotina.',
        )
      }

      await companyService.endRoutineAssignment(
        client.id,
        assignment.id,
        endsOn,
        snapshot.etag,
      )
      setEndingRoutineId(null)
      await refreshAfterAction('Vínculo de rotina encerrado.')
    })
  }

  function cancelDepartment(assignment: ClientDepartmentAssignmentResource) {
    if (!window.confirm('Cancelar este vínculo departamental programado?')) return

    void withAction(async () => {
      const etag = await getCompanyEtag()
      await companyService.cancelDepartmentAssignment(
        client.id,
        assignment.id,
        etag,
      )
      await refreshAfterAction('Vínculo departamental cancelado.')
    })
  }

  function cancelRoutine(assignment: ClientRoutineAssignmentResource) {
    if (!window.confirm('Cancelar este vínculo de rotina programado?')) return

    void withAction(async () => {
      const snapshot = await companyService.getRoutineAssignment(
        client.id,
        assignment.id,
      )

      if (!snapshot.etag) {
        throw new Error(
          'A API não informou a versão necessária para cancelar o vínculo de rotina.',
        )
      }

      await companyService.cancelRoutineAssignment(
        client.id,
        assignment.id,
        snapshot.etag,
      )
      await refreshAfterAction('Vínculo de rotina cancelado.')
    })
  }

  return (
    <Card className="mt-5 overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-divider)] px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
            Cobertura operacional
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
            Departamentos e rotinas vinculados
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--color-text-muted)]">
            Estes vínculos são históricos. Uma tela só organiza a visualização;
            ela não substitui a cobertura cadastrada aqui.
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-panel-soft-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)] ring-1 ring-[var(--color-divider)]">
          {departmentAssignments.length} departamentos · {routineAssignments.length}{' '}
          rotinas
        </span>
      </header>

      {(actionMessage || actionError || loadError) && (
        <div className="px-5 pt-4 sm:px-6">
          <p
            role={actionError || loadError ? 'alert' : 'status'}
            className={
              'rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold ' +
              (actionError || loadError
                ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
                : 'border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]')
            }
          >
            {actionError || loadError || actionMessage}
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)] sm:px-6">
          Carregando vínculos da empresa…
        </p>
      ) : (
        <div className="grid divide-y divide-[var(--color-divider)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <CoverageColumn
            title="Cobertura por departamento"
            description="Permite vincular rotinas do mesmo departamento durante a vigência."
            assignments={departmentAssignments}
            referenceDate={referenceDate}
            canManage={canManage}
            isChanging={isChanging}
            endingId={endingDepartmentId}
            endDates={endDates}
            onEndDateChange={(assignmentId, value) =>
              setEndDates((current) => ({ ...current, [assignmentId]: value }))
            }
            onBeginEnd={(assignment) => {
              setEndingDepartmentId(assignment.id)
              setEndingRoutineId(null)
              setEndDates((current) => ({
                ...current,
                [assignment.id]: current[assignment.id] ?? lastDayOfPeriod(period),
              }))
            }}
            onCancelEnd={() => setEndingDepartmentId(null)}
            onConfirmEnd={handleDepartmentEnd}
            onCancel={cancelDepartment}
          />
          <CoverageColumn
            title="Rotinas vinculadas"
            description="Cada vínculo conserva a versão da rotina aplicada à empresa."
            assignments={routineAssignments}
            referenceDate={referenceDate}
            canManage={canManage}
            isChanging={isChanging}
            endingId={endingRoutineId}
            endDates={endDates}
            onEndDateChange={(assignmentId, value) =>
              setEndDates((current) => ({ ...current, [assignmentId]: value }))
            }
            onBeginEnd={(assignment) => {
              setEndingRoutineId(assignment.id)
              setEndingDepartmentId(null)
              setEndDates((current) => ({
                ...current,
                [assignment.id]: current[assignment.id] ?? lastDayOfPeriod(period),
              }))
            }}
            onCancelEnd={() => setEndingRoutineId(null)}
            onConfirmEnd={handleRoutineEnd}
            onCancel={cancelRoutine}
          />
        </div>
      )}

      {canManage && !isLoading && (
        <div className="grid border-t border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] lg:grid-cols-2">
          <form
            className="border-b border-[var(--color-divider)] p-5 lg:border-b-0 lg:border-r sm:px-6"
            onSubmit={handleDepartmentCreate}
          >
            <h3 className="text-sm font-black text-[var(--color-text-strong)]">
              Adicionar cobertura
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
              <Select
                id="coverage-department"
                label="Departamento"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                disabled={isChanging}
              >
                <option value="">Selecione</option>
                {departmentsAvailableForRange.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
              <TextField
                id="coverage-department-starts-on"
                label="Início"
                type="date"
                value={departmentStartsOn}
                onChange={(event) => setDepartmentStartsOn(event.target.value)}
                disabled={isChanging}
              />
              <TextField
                id="coverage-department-ends-on"
                label="Fim (opcional)"
                type="date"
                min={departmentStartsOn}
                value={departmentEndsOn}
                onChange={(event) => setDepartmentEndsOn(event.target.value)}
                disabled={isChanging}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="submit"
                disabled={isChanging || departmentsAvailableForRange.length === 0}
              >
                Vincular departamento
              </Button>
            </div>
          </form>

          <form className="p-5 sm:px-6" onSubmit={handleRoutineCreate}>
            <h3 className="text-sm font-black text-[var(--color-text-strong)]">
              Adicionar rotina
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
              <Select
                id="coverage-routine"
                label="Rotina coberta"
                value={routineId}
                onChange={(event) => setRoutineId(event.target.value)}
                disabled={isChanging}
              >
                <option value="">Selecione</option>
                {routinesAvailableForRange.map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.shortName} · {routine.name}
                  </option>
                ))}
              </Select>
              <TextField
                id="coverage-routine-starts-on"
                label="Início"
                type="date"
                value={routineStartsOn}
                onChange={(event) => setRoutineStartsOn(event.target.value)}
                disabled={isChanging}
              />
              <TextField
                id="coverage-routine-ends-on"
                label="Fim (opcional)"
                type="date"
                min={routineStartsOn}
                value={routineEndsOn}
                onChange={(event) => setRoutineEndsOn(event.target.value)}
                disabled={isChanging}
              />
            </div>
            {routinesAvailableForRange.length === 0 && (
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                Primeiro crie uma cobertura departamental contínua para todo o
                período escolhido.
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                type="submit"
                disabled={isChanging || routinesAvailableForRange.length === 0}
              >
                Vincular rotina
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  )
}

function CoverageColumn<
  T extends ClientDepartmentAssignmentResource | ClientRoutineAssignmentResource,
>({
  title,
  description,
  assignments,
  referenceDate,
  canManage,
  isChanging,
  endingId,
  endDates,
  onEndDateChange,
  onBeginEnd,
  onCancelEnd,
  onConfirmEnd,
  onCancel,
}: {
  title: string
  description: string
  assignments: T[]
  referenceDate: string
  canManage: boolean
  isChanging: boolean
  endingId: string | null
  endDates: Record<string, string>
  onEndDateChange: (assignmentId: string, value: string) => void
  onBeginEnd: (assignment: T) => void
  onCancelEnd: () => void
  onConfirmEnd: (assignment: T) => void
  onCancel: (assignment: T) => void
}) {
  return (
    <section className="min-w-0">
      <header className="border-b border-[var(--color-divider)] px-5 py-4 sm:px-6">
        <h3 className="text-sm font-black text-[var(--color-text-strong)]">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
          {description}
        </p>
      </header>
      {assignments.length ? (
        <ul className="max-h-[25rem] divide-y divide-[var(--color-divider)] overflow-y-auto">
          {assignments.map((assignment) => {
            const status = getAssignmentStatus(assignment, referenceDate)
            const canChange =
              canManage &&
              !assignment.cancelledAt &&
              !isClosed(assignment, referenceDate)
            const isFuture = !assignment.cancelledAt && assignment.startsOn > referenceDate
            const isEnding = endingId === assignment.id

            return (
              <li key={assignment.id} className="px-5 py-3 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-[var(--color-text-strong)]">
                      {getAssignmentTitle(assignment)}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {formatRange(assignment.startsOn, assignment.endsOn)}
                      {' · '}
                      {status.label}
                    </p>
                    {'routineName' in assignment && (
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {getRoutineMeta(
                          assignment as ClientRoutineAssignmentResource,
                        )}
                      </p>
                    )}
                  </div>
                  {canChange && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      {isFuture ? (
                        <button
                          type="button"
                          disabled={isChanging}
                          onClick={() => onCancel(assignment)}
                          className="min-h-8 rounded-[var(--radius-control)] border border-[var(--status-error-border)] px-2.5 text-xs font-bold text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      ) : isEnding ? (
                        <>
                          <TextField
                            id={'assignment-end-' + assignment.id}
                            label={<span className="sr-only">Data final</span>}
                            type="date"
                            min={assignment.startsOn}
                            value={endDates[assignment.id] ?? ''}
                            onChange={(event) =>
                              onEndDateChange(assignment.id, event.target.value)
                            }
                            disabled={isChanging}
                            className="w-36"
                          />
                          <Button
                            size="sm"
                            onClick={() => onConfirmEnd(assignment)}
                            disabled={isChanging}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            tone="neutral"
                            onClick={onCancelEnd}
                            disabled={isChanging}
                          >
                            Voltar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          tone="neutral"
                          onClick={() => onBeginEnd(assignment)}
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
        <p className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)] sm:px-6">
          Nenhum vínculo registrado.
        </p>
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

function hasContinuousDepartmentCoverage(
  assignments: ClientDepartmentAssignmentResource[],
  departmentId: string,
  startsOn: string,
  endsOn: string | null,
): boolean {
  if (!isValidRange(startsOn, endsOn ?? '')) return false

  const coverage = assignments
    .filter(
      (assignment) =>
        assignment.departmentId === departmentId &&
        !assignment.cancelledAt &&
        assignment.startsOn <= (endsOn ?? '9999-12-31') &&
        (!assignment.endsOn || assignment.endsOn >= startsOn),
    )
    .sort((first, second) => first.startsOn.localeCompare(second.startsOn))

  let coveredThrough: string | null = null

  for (const assignment of coverage) {
    if (coveredThrough === null) {
      if (assignment.startsOn > startsOn) continue
      coveredThrough = assignment.endsOn
    } else {
      if (assignment.startsOn > nextDay(coveredThrough)) break

      if (!assignment.endsOn || assignment.endsOn > coveredThrough) {
        coveredThrough = assignment.endsOn
      }
    }

    if (coveredThrough === null || (endsOn && coveredThrough >= endsOn)) {
      return true
    }
  }

  return false
}

function isClosed(
  assignment: Pick<
    ClientDepartmentAssignmentResource | ClientRoutineAssignmentResource,
    'endsOn'
  >,
  referenceDate: string,
): boolean {
  return Boolean(assignment.endsOn && assignment.endsOn < referenceDate)
}

function getAssignmentStatus(
  assignment: Pick<
    ClientDepartmentAssignmentResource | ClientRoutineAssignmentResource,
    'startsOn' | 'endsOn' | 'cancelledAt'
  >,
  referenceDate: string,
): { label: string } {
  if (assignment.cancelledAt) return { label: 'Cancelado' }
  if (assignment.endsOn && assignment.endsOn < referenceDate) {
    return { label: 'Encerrado' }
  }
  if (assignment.startsOn > referenceDate) return { label: 'Programado' }
  return { label: 'Vigente' }
}

function getAssignmentTitle(
  assignment: ClientDepartmentAssignmentResource | ClientRoutineAssignmentResource,
): string {
  return 'routineName' in assignment
    ? assignment.routineName
    : assignment.departmentName
}

function getRoutineMeta(assignment: ClientRoutineAssignmentResource): string {
  return [
    assignment.departmentName,
    assignment.routineShotname,
    assignment.sourcePresetId ? 'Predefinição' : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

function formatRange(startsOn: string, endsOn: string | null): string {
  return endsOn ? `${formatDate(startsOn)} até ${formatDate(endsOn)}` : `Desde ${formatDate(startsOn)}`
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
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
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function nextDay(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function lastDayOfPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)

  if (!year || !month) return ''

  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

export default ClientCoveragePanel
