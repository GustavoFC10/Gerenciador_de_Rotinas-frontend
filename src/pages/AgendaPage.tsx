import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import ErrorState from '../components/common/ErrorState'
import LoadingState from '../components/common/LoadingState'
import { routineStatusConfig } from '../constants/routineStatus'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import {
  screenService,
  type AgendaProjection,
} from '../services/screenService'
import type { TaskResource } from '../services/taskService'
import type { RoutineStatus } from '../types/domain'

const agendaStatuses: RoutineStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'no_movement',
  'error',
]

function AgendaPage() {
  const [searchParams] = useSearchParams()
  const { competence } = useAppState()
  const screenId = searchParams.get('screenId')
  const [projection, setProjection] = useState<AgendaProjection | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true

    if (!screenId) {
      setProjection(null)
      setError('Selecione uma agenda para abrir.')
      setIsLoading(false)
      return () => {
        isCurrent = false
      }
    }

    setIsLoading(true)
    setError('')

    void screenService
      .getProjection(screenId, competence)
      .then((response) => {
        if (!isCurrent) return
        if (response.data.type !== 'agenda') {
          setError('A tela selecionada não é uma agenda.')
          setProjection(null)
          return
        }
        setProjection(response.data)
      })
      .catch((caughtError: unknown) => {
        if (!isCurrent) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível carregar a agenda.',
        )
        setProjection(null)
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [competence, screenId])

  const columns = useMemo(() => {
    if (!projection) return []

    const byStatus = new Map(
      projection.columns.map((column) => [column.status, column]),
    )
    return agendaStatuses.map((status) => {
      const column = byStatus.get(status)
      return {
        status,
        count: column?.count ?? 0,
        tasks: column?.tasks ?? [],
        hasMore: column?.hasMore ?? false,
      }
    })
  }, [projection])

  if (isLoading) {
    return <LoadingState message="Carregando agenda..." />
  }

  if (error || !projection) {
    return (
      <ErrorState
        title="Não foi possível abrir a agenda"
        description={error || 'A agenda solicitada não está disponível.'}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        context={{ label: 'Telas operacionais', to: ROUTES.SCREENS }}
        label={projection.screen.departmentName}
        title={projection.screen.name}
        meta="Agenda de tarefas avulsas"
      />

      <p className="-mt-1 mb-4 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
        Esta agenda mostra apenas tarefas avulsas do departamento na competência
        selecionada. Para alterar uma tarefa ou carregar colunas longas, use a
        listagem de tarefas do departamento.
      </p>

      <section
        className="min-h-0 flex-1 overflow-x-auto pb-1"
        aria-label={'Colunas da agenda ' + projection.screen.name}
      >
        <div className="grid min-w-[78rem] grid-cols-5 gap-4">
          {columns.map((column) => (
            <AgendaColumn key={column.status} {...column} />
          ))}
        </div>
      </section>
    </div>
  )
}

function AgendaColumn({
  status,
  count,
  tasks,
  hasMore,
}: {
  status: RoutineStatus
  count: number
  tasks: TaskResource[]
  hasMore: boolean
}) {
  const config = routineStatusConfig[status]

  return (
    <section
      className="flex min-h-[32rem] flex-col rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)]"
      aria-labelledby={'agenda-column-' + status}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-4 py-3">
        <h2
          id={'agenda-column-' + status}
          className="flex items-center gap-2 text-sm font-black text-[var(--color-text-strong)]"
        >
          <span className={'size-2 rounded-full ' + config.dotClass} />
          {config.label}
        </h2>
        <span className="rounded-full bg-[var(--color-panel-soft-bg)] px-2 py-1 text-xs font-bold text-[var(--color-text-muted)]">
          {count}
        </span>
      </header>

      <div className="flex-1 space-y-3 p-3">
        {tasks.map((task) => (
          <AgendaTaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--color-divider)] px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">
            Nenhuma tarefa nesta coluna.
          </p>
        )}
      </div>

      {hasMore && (
        <p className="border-t border-[var(--color-divider)] px-3 py-2.5 text-xs font-semibold text-[var(--color-text-muted)]">
          Há mais tarefas. Use a listagem de tarefas para carregar as demais.
        </p>
      )}
    </section>
  )
}

function AgendaTaskCard({ task }: { task: TaskResource }) {
  return (
    <article className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-3 shadow-[var(--shadow-panel)]">
      <p className="break-words text-sm font-black text-[var(--color-text-strong)]">
        {task.title || 'Tarefa avulsa'}
      </p>
      {task.description && (
        <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--color-text-muted)]">
          {task.description}
        </p>
      )}
      <dl className="mt-3 grid gap-1.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--color-text-subtle)]">Prazo</dt>
          <dd className="font-bold text-[var(--color-text-strong)]">
            {formatDate(task.dueDate)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--color-text-subtle)]">Responsável</dt>
          <dd className="max-w-[11rem] truncate text-right font-bold text-[var(--color-text-strong)]">
            {task.assignee?.displayName ?? 'Não atribuído'}
          </dd>
        </div>
      </dl>
    </article>
  )
}

function formatDate(value: string): string {
  const date = new Date(value + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export default AgendaPage
