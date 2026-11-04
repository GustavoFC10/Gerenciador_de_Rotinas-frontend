import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useProcessAlert,
  useProcessAlerts,
  useProcessAlertRecipientOptions,
} from '../../hooks/useProcessCommunications'
import { processQueryKeys } from '../../query/processQueryKeys'
import type { OrganizationQueryScope } from '../../query/queryKeys'
import { isApiError } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type {
  AlertRecipient,
  PreparedProcessAlert,
  ProcessAlert,
  ProcessAlertFilters,
  ProcessAlertRecipientOption,
  ProcessPermissions,
  ProcessSector,
} from '../../types/processes'
import { getErrorPresentation } from '../../utils/apiErrors'
import {
  formatProcessDate,
  PROCESS_SECTORS,
} from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'
import ProcessQueryError from './ProcessQueryError'
import '../../styles/process-alerts.css'

interface Props {
  scope: OrganizationQueryScope
  permissions: ProcessPermissions
  timeZone?: string
  onOpen: (processId: string) => void
  onUnavailable?: (error: unknown) => void
}

const statusLabels = {
  pending: 'Pendente',
  sent: 'Envio declarado',
  resolved: 'Situação encerrada',
} as const

export default function ProcessAlerts(props: Props) {
  if (!props.permissions.create)
    return (
      <div className="panel empty">
        <h1>Acesso restrito</h1>
        <p>Avisos por e-mail disponíveis somente para a Diretoria.</p>
      </div>
    )
  return (
    <AuthorizedAlerts
      key={`${props.scope.organizationId}:${props.scope.membershipId}`}
      {...props}
    />
  )
}

function AuthorizedAlerts({ scope, timeZone, onOpen, onUnavailable }: Props) {
  const client = useQueryClient()
  const [status, setStatus] = useState<ProcessAlertFilters['status']>('pending')
  const [kind, setKind] = useState<ProcessAlertFilters['kind']>()
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState('')
  const [denied, setDenied] = useState<unknown>(null)
  const alerts = useProcessAlerts(
    scope,
    { status, kind, page, pageSize: 50 },
    !denied,
  )
  const detail = useProcessAlert(scope, selectedId, !!selectedId && !denied)
  const error = denied ?? alerts.error
  const accessError = alerts.error ?? detail.error
  useEffect(() => {
    if (!isApiError(accessError) || accessError.status !== 403) return
    setDenied(accessError)
    setSelectedId('')
    for (const queryKey of [
      processQueryKeys.alerts(scope),
      processQueryKeys.alert(scope, '').slice(0, -1),
      processQueryKeys.alertRecipients(scope),
    ]) {
      void client.cancelQueries({ queryKey })
      client.removeQueries({ queryKey })
    }
    onUnavailable?.(accessError)
  }, [accessError, client, onUnavailable, scope])
  function restrict(error: unknown) {
    setDenied(error)
    setSelectedId('')
    for (const queryKey of [
      processQueryKeys.alerts(scope),
      processQueryKeys.alert(scope, '').slice(0, -1),
      processQueryKeys.alertRecipients(scope),
    ]) {
      void client.cancelQueries({ queryKey })
      client.removeQueries({ queryKey })
    }
    onUnavailable?.(error)
  }
  return (
    <section className="process-alerts">
      <div className="lhead">
        <div className="tt">
          <h1>Avisos por e-mail</h1>
          <p>
            Prepare o texto, envie pelo seu canal de e-mail e declare o envio.
          </p>
        </div>
        {!error && alerts.data && (
          <span className="process-alert-count">
            {alerts.data.count} avisos
          </span>
        )}
      </div>
      <div className="process-alert-filters panel">
        <label>
          Situação
          <select
            value={status ?? ''}
            onChange={(event) => {
              setStatus(
                (event.target.value ||
                  undefined) as ProcessAlertFilters['status'],
              )
              setPage(1)
            }}
          >
            <option value="pending">Pendentes</option>
            <option value="sent">Envio declarado</option>
            <option value="resolved">Situação encerrada</option>
            <option value="">Todo o histórico</option>
          </select>
        </label>
        <label>
          Tipo de aviso
          <select
            value={kind ?? ''}
            onChange={(event) => {
              setKind(
                (event.target.value ||
                  undefined) as ProcessAlertFilters['kind'],
              )
              setPage(1)
            }}
          >
            <option value="">Todos os tipos</option>
            <option value="leggacy">Retorno da Leggacy</option>
            <option value="overdue">Processo em atraso</option>
          </select>
        </label>
        <button
          className="btn"
          aria-label="Atualizar avisos"
          disabled={!!denied || alerts.isFetching}
          onClick={() => void alerts.refetch()}
        >
          <ProcessIcon name="refresh" size={16} />
          Atualizar
        </button>
      </div>
      {error ? (
        <ProcessQueryError
          title="Não foi possível carregar avisos"
          error={error}
          retry={() => {
            setDenied(null)
            void alerts.refetch()
          }}
        />
      ) : alerts.isPending ? (
        <div className="panel empty" role="status">
          Carregando avisos…
        </div>
      ) : (
        <div className="process-alert-grid">
          <div className="panel process-alert-list">
            {alerts.data?.results.length === 0 && (
              <p className="empty">Nenhum aviso nesta consulta.</p>
            )}
            {alerts.data?.results.map((alert) => (
              <button
                className="process-alert-row"
                key={alert.id}
                aria-pressed={selectedId === alert.id}
                onClick={() => setSelectedId(alert.id)}
              >
                <span className={`process-alert-status ${alert.status}`}>
                  {statusLabels[alert.status]}
                </span>
                <strong>{alert.empresa}</strong>
                <span>
                  {alert.kind === 'leggacy'
                    ? 'Retorno da Leggacy'
                    : 'Processo em atraso'}{' '}
                  · {alert.codigo}
                </span>
                <small>
                  Criado em {formatProcessDate(alert.createdAt, timeZone)}
                </small>
              </button>
            ))}
            {alerts.data && (
              <AlertPagination
                page={page}
                count={alerts.data.count}
                previous={!!alerts.data.previous}
                next={!!alerts.data.next}
                onPage={setPage}
              />
            )}
          </div>
          <div className="process-alert-detail">
            {!selectedId ? (
              <div className="panel empty">
                <ProcessIcon name="inbox" />
                <p>Selecione um aviso para consultar ou preparar o envio.</p>
              </div>
            ) : detail.error ? (
              <ProcessQueryError
                error={detail.error}
                title="Aviso indisponível"
                retry={() => void detail.refetch()}
              />
            ) : !detail.data ? (
              <div className="panel empty" role="status">
                Carregando aviso…
              </div>
            ) : (
              <AlertEditor
                key={selectedId}
                scope={scope}
                alert={detail.data}
                timeZone={timeZone}
                onOpen={onOpen}
                onForbidden={restrict}
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function AlertEditor({
  scope,
  alert,
  timeZone,
  onOpen,
  onForbidden,
}: {
  scope: OrganizationQueryScope
  alert: ProcessAlert
  timeZone?: string
  onOpen: (processId: string) => void
  onForbidden: (error: unknown) => void
}) {
  const client = useQueryClient()
  const [sectors, setSectors] = useState<ProcessSector[]>(() =>
    alert.selectedSectors.length
      ? alert.selectedSectors
      : [...alert.defaultSectors],
  )
  const [memberIds, setMemberIds] = useState<string[]>(() => [
    ...alert.selectedMemberIds,
  ])
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [recipientSector, setRecipientSector] = useState<ProcessSector>()
  const [recipientPage, setRecipientPage] = useState(1)
  const [prepared, setPrepared] = useState<PreparedProcessAlert | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<'prepare' | 'copy' | 'declare' | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [notice, setNotice] = useState('')
  const [retryUntil, setRetryUntil] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const alive = useRef(true)
  const operation = useRef(false)
  const currentAlert = useRef(alert)
  currentAlert.current = alert
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    if (!retryUntil) return
    setWaiting(Date.now() < retryUntil)
    const timer = setInterval(() => {
      const remaining = Date.now() < retryUntil
      setWaiting(remaining)
      if (!remaining) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [retryUntil])
  const pending = alert.status === 'pending'
  const options = useProcessAlertRecipientOptions(
    scope,
    {
      q: search || undefined,
      sector: recipientSector,
      page: recipientPage,
      pageSize: 50,
    },
    pending,
  )
  useEffect(() => {
    if (isApiError(options.error) && options.error.status === 403)
      onForbidden(options.error)
  }, [options.error, onForbidden])
  const preparationCurrent = !!prepared && prepared.version === alert.version
  const disabled = !!busy || waiting

  function editSelection() {
    setPrepared(null)
    setCopied(false)
    setError(null)
    setNotice(
      'Seleção alterada. Prepare e copie o texto novamente antes de declarar o envio.',
    )
  }
  async function failure(cause: unknown) {
    if (!alive.current) return
    setError(cause)
    setPrepared(null)
    setCopied(false)
    const delay = getErrorPresentation(cause).retryAfterSeconds
    if (delay) {
      setRetryUntil(Date.now() + delay * 1000)
      setWaiting(true)
    }
    if (isApiError(cause) && cause.status === 403) {
      onForbidden(cause)
      return
    }
    if (isApiError(cause) && [404, 409].includes(cause.status)) {
      await client.invalidateQueries({
        queryKey: processQueryKeys.alert(scope, alert.id),
      })
      if (!alive.current) return
      if (cause.status === 409)
        setNotice(
          'O aviso foi atualizado. Sua seleção foi preservada; revise os dados, prepare e copie o texto novamente.',
        )
    }
  }
  async function prepare() {
    if (operation.current || currentAlert.current.status !== 'pending') return
    operation.current = true
    setBusy('prepare')
    setError(null)
    setNotice('')
    setPrepared(null)
    setCopied(false)
    const version = alert.version
    try {
      const response = await processService.prepareAlert(alert.id, {
        version,
        sectors,
        memberIds,
      })
      if (!alive.current) return
      if (
        currentAlert.current.version !== version ||
        currentAlert.current.status !== 'pending'
      ) {
        setNotice(
          'O aviso foi atualizado. Revise os dados e prepare o texto novamente.',
        )
        return
      }
      setPrepared(response.data)
      setNotice(
        'Destinatários conferidos. Copie o texto e envie pelo seu canal de e-mail.',
      )
    } catch (cause) {
      await failure(cause)
    } finally {
      operation.current = false
      if (alive.current) setBusy(null)
    }
  }
  async function copy() {
    if (!preparationCurrent || operation.current) return
    operation.current = true
    setBusy('copy')
    setError(null)
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error(
          'Não foi possível acessar a área de transferência. Verifique as permissões do navegador.',
        )
      await navigator.clipboard.writeText(prepared.copyText)
      if (!alive.current) return
      if (
        currentAlert.current.version === prepared.version &&
        currentAlert.current.status === 'pending'
      ) {
        setCopied(true)
        setNotice(
          'Texto copiado. Após enviar o e-mail pelo seu canal, declare o envio realizado.',
        )
      }
    } catch (cause) {
      if (alive.current) {
        setError(cause)
        setCopied(false)
      }
    } finally {
      operation.current = false
      if (alive.current) setBusy(null)
    }
  }
  async function declare() {
    if (
      !preparationCurrent ||
      !copied ||
      operation.current ||
      currentAlert.current.status !== 'pending'
    )
      return
    operation.current = true
    setBusy('declare')
    setError(null)
    try {
      const response = await processService.declareAlertSent(alert.id, {
        version: alert.version,
        sectors,
        memberIds,
      })
      if (!alive.current) return
      await client.cancelQueries({
        queryKey: processQueryKeys.alert(scope, alert.id),
      })
      if (!alive.current) return
      client.setQueryData(
        processQueryKeys.alert(scope, alert.id),
        response.data,
      )
      setPrepared(null)
      setCopied(false)
      setNotice(
        'Envio declarado. Os destinatários e o conteúdo foram registrados no histórico.',
      )
      await client.invalidateQueries({
        queryKey: processQueryKeys.alerts(scope),
      })
      if (!alive.current) return
      await client.invalidateQueries({
        queryKey: processQueryKeys.alert(scope, alert.id),
      })
      if (!alive.current) return
      await client.invalidateQueries({
        queryKey: processQueryKeys.entries(scope, alert.processId),
      })
    } catch (cause) {
      await failure(cause)
    } finally {
      operation.current = false
      if (alive.current) setBusy(null)
    }
  }

  return (
    <article className="panel process-alert-editor">
      <header>
        <span className={`process-alert-status ${alert.status}`}>
          {statusLabels[alert.status]}
        </span>
        <h2>{alert.empresa}</h2>
        <p>
          {alert.codigo} ·{' '}
          {alert.kind === 'leggacy'
            ? 'Retorno da Leggacy'
            : 'Processo em atraso'}
        </p>
        <button className="btn sm" onClick={() => onOpen(alert.processId)}>
          Abrir processo
          <ProcessIcon name="arrow" size={16} />
        </button>
      </header>
      <dl className="process-alert-dates">
        <div>
          <dt>Criado em</dt>
          <dd>{alertTimestamp(alert.createdAt, timeZone)}</dd>
        </div>
        {alert.sentAt && (
          <div>
            <dt>Envio declarado em</dt>
            <dd>
              {alertTimestamp(alert.sentAt, timeZone)} ·{' '}
              {alert.sentBy || 'Autor não informado'}
            </dd>
          </div>
        )}
        {alert.resolvedAt && (
          <div>
            <dt>Situação encerrada em</dt>
            <dd>{alertTimestamp(alert.resolvedAt, timeZone)}</dd>
          </div>
        )}
      </dl>
      <div className="process-alert-email">
        <h3>Assunto</h3>
        <p>{preparationCurrent ? prepared.subject : alert.subject}</p>
        <h3>Mensagem</h3>
        <pre>{preparationCurrent ? prepared.body : alert.body}</pre>
      </div>
      {pending ? (
        <>
          <fieldset className="process-alert-sectors" disabled={disabled}>
            <legend>Setores destinatários</legend>
            <p>Selecione setores completos e/ou membros específicos.</p>
            {(Object.keys(PROCESS_SECTORS) as ProcessSector[]).map((sector) => (
              <label key={sector}>
                <input
                  type="checkbox"
                  checked={sectors.includes(sector)}
                  onChange={() => {
                    editSelection()
                    setSectors((old) =>
                      old.includes(sector)
                        ? old.filter((id) => id !== sector)
                        : [...old, sector],
                    )
                  }}
                />
                {PROCESS_SECTORS[sector]}
              </label>
            ))}
          </fieldset>
          <fieldset className="process-alert-members" disabled={disabled}>
            <legend>Membros específicos</legend>
            <div className="process-alert-recipient-filters">
              <label>
                Buscar membro
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setRecipientPage(1)
                  }}
                />
              </label>
              <label>
                Filtrar membros por setor
                <select
                  value={recipientSector ?? ''}
                  onChange={(event) => {
                    setRecipientSector(
                      (event.target.value || undefined) as
                        ProcessSector | undefined,
                    )
                    setRecipientPage(1)
                  }}
                >
                  <option value="">Todos os setores</option>
                  {(Object.keys(PROCESS_SECTORS) as ProcessSector[]).map(
                    (sector) => (
                      <option key={sector} value={sector}>
                        {PROCESS_SECTORS[sector]}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
            {memberIds.length > 0 && (
              <ul
                className="process-alert-selected-members"
                aria-label="Membros selecionados"
              >
                {memberIds.map((id) => (
                  <li key={id}>
                    {memberNames[id] ||
                      options.data?.results.find(
                        (member) => member.memberId === id,
                      )?.name ||
                      id}
                    <button
                      type="button"
                      className="btn sm"
                      aria-label={`Remover membro ${memberNames[id] || id}`}
                      onClick={() => {
                        editSelection()
                        setMemberIds((old) => old.filter((item) => item !== id))
                      }}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {options.error ? (
              <ProcessQueryError
                title="Não foi possível carregar destinatários"
                error={options.error}
                retry={() => void options.refetch()}
              />
            ) : options.isPending ? (
              <p role="status">Carregando membros…</p>
            ) : (
              <>
                {!options.data?.results.length && (
                  <p>Nenhum membro encontrado.</p>
                )}
                <div className="process-alert-recipient-options">
                  {options.data?.results.map(
                    (member: ProcessAlertRecipientOption) => (
                      <label key={member.memberId}>
                        <input
                          type="checkbox"
                          checked={memberIds.includes(member.memberId)}
                          onChange={() => {
                            editSelection()
                            setMemberNames((old) => ({
                              ...old,
                              [member.memberId]: member.name,
                            }))
                            setMemberIds((old) =>
                              old.includes(member.memberId)
                                ? old.filter((id) => id !== member.memberId)
                                : [...old, member.memberId],
                            )
                          }}
                        />
                        <span>
                          <strong>{member.name}</strong>
                          <small>{member.email}</small>
                        </span>
                      </label>
                    ),
                  )}
                </div>
                {options.data && (
                  <AlertPagination
                    page={recipientPage}
                    count={options.data.count}
                    previous={!!options.data.previous}
                    next={!!options.data.next}
                    onPage={setRecipientPage}
                    label="membros"
                  />
                )}
              </>
            )}
          </fieldset>
          {preparationCurrent && (
            <Recipients
              recipients={prepared.recipients}
              title="Destinatários efetivos"
            />
          )}
          {prepared && !preparationCurrent && (
            <p role="status">
              O aviso foi atualizado. Prepare e copie o texto novamente.
            </p>
          )}
          <div className="process-alert-actions">
            <button
              className="btn"
              disabled={disabled || (!sectors.length && !memberIds.length)}
              onClick={() => void prepare()}
            >
              {busy === 'prepare' ? 'Preparando…' : 'Preparar texto'}
            </button>
            <button
              className="btn"
              disabled={disabled || !preparationCurrent}
              onClick={() => void copy()}
            >
              {busy === 'copy' ? 'Copiando…' : 'Copiar texto do e-mail'}
            </button>
            <button
              className="btn primary"
              disabled={disabled || !preparationCurrent || !copied}
              onClick={() => void declare()}
            >
              {busy === 'declare' ? 'Registrando…' : 'Declarar envio realizado'}
            </button>
          </div>
          <p className="process-alert-manual-note">
            A declaração registra o envio manual informado pela Diretoria. Não
            comprova a entrega do e-mail.
          </p>
        </>
      ) : (
        <Recipients
          recipients={alert.recipients}
          title="Destinatários registrados"
        />
      )}
      {!!error && (
        <div role="alert" className="err-msg">
          {getErrorPresentation(error).message}
          {getErrorPresentation(error).supportReference && (
            <p>{getErrorPresentation(error).supportReference}</p>
          )}
          {waiting && (
            <p>Aguarde o prazo informado antes de tentar novamente.</p>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="process-alert-notice">
          {notice}
        </p>
      )}
    </article>
  )
}

function alertTimestamp(value: string, timeZone = 'America/Sao_Paulo') {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('pt-BR', {
        timeZone,
        dateStyle: 'short',
        timeStyle: 'short',
      })
}

function Recipients({
  recipients,
  title,
}: {
  recipients: AlertRecipient[]
  title: string
}) {
  return (
    <div className="process-alert-effective-recipients">
      <h3>{title}</h3>
      {recipients.length ? (
        <ul>
          {recipients.map((recipient) => (
            <li key={recipient.memberId}>
              {recipient.name} <span>{recipient.email}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum destinatário registrado.</p>
      )}
    </div>
  )
}

function AlertPagination({
  page,
  count,
  previous,
  next,
  onPage,
  label = 'avisos',
}: {
  page: number
  count: number
  previous: boolean
  next: boolean
  onPage: (page: number) => void
  label?: string
}) {
  return (
    <nav
      className="process-alert-pagination"
      aria-label={`Paginação de ${label}`}
    >
      <button
        className="btn sm"
        aria-label={`Página anterior de ${label}`}
        disabled={!previous}
        onClick={() => onPage(page - 1)}
      >
        Anterior
      </button>
      <span>
        Página {page} · {count} {label}
      </span>
      <button
        className="btn sm"
        aria-label={`Próxima página de ${label}`}
        disabled={!next}
        onClick={() => onPage(page + 1)}
      >
        Próxima
      </button>
    </nav>
  )
}
