import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProcessFollowUps } from '../../hooks/useProcessCommunications'
import { processQueryKeys } from '../../query/processQueryKeys'
import type { OrganizationQueryScope } from '../../query/queryKeys'
import { isApiError } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type {
  ProcessFollowUp,
  ProcessFollowUpFilters,
  ProcessPermissions,
} from '../../types/processes'
import { getErrorPresentation } from '../../utils/apiErrors'
import { formatProcessDate } from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'
import ProcessQueryError from './ProcessQueryError'
import '../../styles/process-followups.css'

interface Props {
  scope: OrganizationQueryScope
  permissions: ProcessPermissions
  processId?: string
  timeZone?: string
  onUnavailable?: (error: unknown) => void
}

/** These records are complementary work and never transition workflow tasks. */
export default function ProcessFollowUps(props: Props) {
  if (!props.permissions.read) return null
  const context = [
    props.scope.organizationId,
    props.scope.membershipId,
    props.processId ?? 'queue',
    props.permissions.executeSectors.join(','),
  ].join(':')
  return <FollowUps key={context} {...props} />
}

function FollowUps({
  scope,
  permissions,
  processId,
  timeZone = 'America/Sao_Paulo',
  onUnavailable,
}: Props) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [state, setState] = useState<ProcessFollowUpFilters['state']>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const busyRef = useRef(false)
  const active = useRef(true)
  const [error, setError] = useState<unknown>(null)
  const [review, setReview] = useState('')
  const [denied, setDenied] = useState(false)
  const [coolingDown, setCoolingDown] = useState(false)
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const query = useProcessFollowUps(
    scope,
    { processId, state, page, pageSize: 50 },
    !denied,
  )
  const restricted = isApiError(query.error) && query.error.status === 403
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      clearTimeout(cooldownTimer.current)
    }
  }, [])
  useEffect(() => {
    if (!restricted || denied) return
    setDenied(true)
    onUnavailable?.(query.error)
  }, [restricted, denied, onUnavailable, query.error])
  useEffect(() => {
    if (!denied) return
    const queryKey = processQueryKeys.followUps(scope)
    void queryClient.cancelQueries({ queryKey })
    queryClient.removeQueries({ queryKey })
  }, [denied, queryClient, scope])
  const timestamp = (value: string) =>
    new Date(value).toLocaleString('pt-BR', {
      timeZone,
      dateStyle: 'short',
      timeStyle: 'short',
    })

  async function complete(followUp: ProcessFollowUp) {
    if (
      busyRef.current ||
      coolingDown ||
      !permissions.executeSectors.includes('fin')
    )
      return
    busyRef.current = true
    setBusy(followUp.id)
    setError(null)
    setReview('')
    try {
      await processService.completeFollowUp(followUp.id, followUp.version)
      if (!active.current) return
      setReview(
        'Cobrança registrada. O retorno da Leggacy continua sendo acompanhado nas tarefas do processo.',
      )
      await queryClient.invalidateQueries({
        queryKey: processQueryKeys.root(scope),
      })
    } catch (failure) {
      if (!active.current) return
      setError(failure)
      const presentation = getErrorPresentation(failure)
      if (isApiError(failure) && failure.status === 403) {
        setDenied(true)
        onUnavailable?.(failure)
      } else if (isApiError(failure) && failure.status === 409) {
        await query.refetch()
        if (active.current)
          setReview(
            'A cobrança foi alterada. Confira os dados atualizados antes de registrar novamente.',
          )
      } else if (isApiError(failure) && failure.status === 404) {
        await query.refetch()
      }
      if (
        [429, 503].includes(presentation.status ?? 0) &&
        presentation.retryAfterSeconds
      ) {
        setCoolingDown(true)
        cooldownTimer.current = setTimeout(
          () => setCoolingDown(false),
          presentation.retryAfterSeconds * 1000,
        )
      }
    } finally {
      busyRef.current = false
      if (active.current) setBusy(null)
    }
  }

  if (denied || restricted)
    return (
      <section className="panel process-followups" role="alert">
        <p>
          O acesso às cobranças não está disponível. Atualize suas permissões
          para continuar.
        </p>
      </section>
    )

  return (
    <section
      className="panel process-followups"
      aria-label="Cobranças da Leggacy"
      aria-busy={query.isFetching || !!busy}
    >
      <div className="panel-h">
        <div>
          <h2>
            <ProcessIcon name="clock" size={17} /> Cobranças da Leggacy
          </h2>
          <p className="ph-sub">Trabalho complementar do Financeiro</p>
        </div>
        {!query.error && query.data && (
          <span className="pill">{query.data.count}</span>
        )}
      </div>
      <p className="note">
        Registrar uma cobrança não conclui o retorno nem altera o progresso do
        processo.
      </p>
      {processId && (
        <label className="process-followups-filter">
          Consultar cobranças
          <select
            className="input"
            value={state ?? ''}
            onChange={(event) => {
              setState(
                (event.target.value ||
                  undefined) as ProcessFollowUpFilters['state'],
              )
              setPage(1)
            }}
          >
            <option value="pending">Pendentes</option>
            <option value="">Todo o histórico</option>
            <option value="completed">Realizadas</option>
            <option value="resolved">Encerradas</option>
          </select>
        </label>
      )}
      {!!error && (
        <div className="err-msg" role="alert">
          {getErrorPresentation(error).message}
          {getErrorPresentation(error).supportReference && (
            <p>{getErrorPresentation(error).supportReference}</p>
          )}
        </div>
      )}
      {review && (
        <p className="note" role="status">
          {review}
        </p>
      )}
      {query.error ? (
        <ProcessQueryError
          error={query.error}
          title="Não foi possível carregar as cobranças"
          retry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <p role="status">Carregando cobranças…</p>
      ) : query.data ? (
        <>
          {!query.data.results.length && (
            <p className="empty">
              {state === 'pending'
                ? 'Nenhuma cobrança pendente.'
                : 'Nenhuma cobrança neste filtro.'}
            </p>
          )}
          <div className="process-followups-list">
            {query.data.results.map((followUp) => (
              <article key={followUp.id} className="process-followup">
                <div className="process-followup-heading">
                  <b>{followUp.empresa}</b>
                  <span
                    className={`badge ${followUp.state === 'pending' ? 'progress' : followUp.state === 'completed' ? 'completed' : 'pending'}`}
                  >
                    {followUp.state === 'pending'
                      ? 'Cobrança pendente'
                      : followUp.state === 'completed'
                        ? 'Cobrança realizada'
                        : 'Cobrança encerrada'}
                  </span>
                </div>
                <p>
                  Enviado à Leggacy em{' '}
                  <time dateTime={followUp.sentAt}>
                    {timestamp(followUp.sentAt)}
                  </time>{' '}
                  · Cobrança a partir de{' '}
                  {formatProcessDate(followUp.dueOn, timeZone)}
                </p>
                <small>
                  Ciclo registrado em {timestamp(followUp.createdAt)}
                </small>
                {followUp.completedAt && (
                  <p>
                    Cobrança realizada por{' '}
                    {followUp.completedBy || 'membro da equipe'} ·{' '}
                    <time dateTime={followUp.completedAt}>
                      {timestamp(followUp.completedAt)}
                    </time>
                  </p>
                )}
                {followUp.resolvedAt && (
                  <p>
                    Encerrada em{' '}
                    <time dateTime={followUp.resolvedAt}>
                      {timestamp(followUp.resolvedAt)}
                    </time>{' '}
                    ·{' '}
                    {followUp.resolution === 'process_closed'
                      ? 'Processo encerrado'
                      : 'Retorno registrado ou envio/etapa alterado'}
                  </p>
                )}
                <div className="process-actions">
                  {!processId && (
                    <a
                      className="btn sm"
                      href={`/processos/${followUp.processId}`}
                    >
                      Abrir processo
                    </a>
                  )}
                  {followUp.state === 'pending' &&
                    permissions.executeSectors.includes('fin') && (
                      <button
                        className="btn sm primary"
                        type="button"
                        disabled={!!busy || coolingDown || query.isFetching}
                        onClick={() => void complete(followUp)}
                      >
                        {busy === followUp.id
                          ? 'Registrando…'
                          : 'Registrar cobrança realizada'}
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>
          {(query.data.next || query.data.previous || page > 1) && (
            <nav
              className="process-actions"
              aria-label="Paginação das cobranças"
            >
              <button
                className="btn sm"
                disabled={!!busy || query.isFetching || !query.data.previous}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </button>
              <span>
                Página {page} · {query.data.count} cobranças
              </span>
              <button
                className="btn sm"
                disabled={!!busy || query.isFetching || !query.data.next}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      ) : null}
    </section>
  )
}
