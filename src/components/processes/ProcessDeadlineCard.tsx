import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query'
import { useContext, useId, useRef, useState, type FormEvent } from 'react'
import { processQueryKeys } from '../../query/processQueryKeys'
import type { OrganizationQueryScope } from '../../query/queryKeys'
import type { ApiResponse } from '../../services/httpClient'
import type {
  ProcessDeadlineDecision,
  ProcessResource,
} from '../../types/processes'
import { getErrorPresentation } from '../../utils/apiErrors'
import { formatProcessDate } from '../../utils/processPresentation'
import Button from '../ui/Button'
import Dialog from '../ui/Dialog'
import IconButton from '../ui/IconButton'
import Textarea from '../ui/Textarea'
import TextField from '../ui/TextField'
import { ProcessDeadlineRequestsContext } from './ProcessDeadlineRequestsContext'
import ProcessIcon from './ProcessIcon'

type DeadlineMutation = (
  action: () => Promise<ApiResponse<ProcessResource>>,
  success: string,
  reportError: (message: string) => void,
) => Promise<boolean>

export default function ProcessDeadlineCard({
  scope,
  process,
  timeZone,
  busy,
  saving,
  onMutate,
}: {
  scope: OrganizationQueryScope
  process: ProcessResource
  timeZone: string
  busy: boolean
  saving: boolean
  onMutate: DeadlineMutation
}) {
  const titleId = useId()
  const integrationId = useId()
  const gateway = useContext(ProcessDeadlineRequestsContext)
  const [requestOpen, setRequestOpen] = useState(false)
  const [decisionInFlight, setDecisionInFlight] =
    useState<ProcessDeadlineDecision | null>(null)
  const [decisionError, setDecisionError] = useState('')
  const [reviewedRequest, setReviewedRequest] = useState<string | null>(null)
  const mayRequest = process.permissions.sectors.some(
    (sector) => sector === 'fin' || sector === 'reg',
  )
  const mayReview = process.permissions.sectors.includes('com')
  const query = useQuery({
    queryKey: processQueryKeys.deadlineExtensions(
      scope,
      process.id,
      process.version,
    ),
    queryFn: gateway
      ? ({ signal }) => gateway.read(process.id, signal)
      : skipToken,
    enabled: !!gateway && (mayRequest || mayReview),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const workflow = gateway && !query.isError ? query.data : undefined
  const pending =
    workflow?.pending && workflow.pending.id !== reviewedRequest
      ? workflow.pending
      : null
  const canReview = mayReview && workflow?.canReview
  const active = ['andamento', 'agendado', 'atrasado'].includes(process.status)
  const showRequest = mayRequest && active && !!process.prazo && !pending
  const deadlineLabel = formatProcessDate(process.prazo, timeZone)
  const deadlineTone =
    process.status === 'atrasado'
      ? 'overdue'
      : deadlineLabel === formatProcessDate(new Date().toISOString(), timeZone)
        ? 'today'
        : undefined
  const canSend =
    !!gateway &&
    showRequest &&
    !!workflow?.canRequest &&
    !query.isPlaceholderData
  const readError = query.error ? getErrorPresentation(query.error) : null

  async function decide(choice: ProcessDeadlineDecision) {
    if (!gateway || !pending || !canReview || busy || query.isPlaceholderData)
      return
    const id = pending.id
    setDecisionInFlight(choice)
    setDecisionError('')
    try {
      const done = await onMutate(
        () => gateway.decide(process.id, id, process.version, choice),
        choice === 'accept'
          ? 'Pedido aceito. Prazo atualizado.'
          : 'Pedido recusado.',
        setDecisionError,
      )
      if (done) setReviewedRequest(id)
    } finally {
      setDecisionInFlight(null)
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="process-deadline-card"
      data-overdue={process.status === 'atrasado' || undefined}
    >
      <h2 id={titleId}>
        <ProcessIcon name="clock" size={18} /> Prazo do processo
      </h2>
      <div className="process-deadline-value">
        {process.prazo ? (
          <time dateTime={process.prazo}>{deadlineLabel}</time>
        ) : (
          'Sem prazo definido'
        )}
      </div>
      {pending && (
        <div className="process-deadline-pending">
          <div className="process-deadline-pending-summary">
            <span className="badge progress" role="status">
              Pedido em análise
            </span>
            {canReview && (
              <span className="process-deadline-increase">
                <strong>
                  +{pending.additionalDays.toLocaleString('pt-BR')}{' '}
                  {pending.additionalDays === 1 ? 'dia' : 'dias'}
                </strong>
                {pending.reason && <DeadlineReason reason={pending.reason} />}
              </span>
            )}
          </div>
          {canReview && (
            <div className="process-deadline-decisions">
              <button
                type="button"
                className="btn sm"
                disabled={busy || !!decisionInFlight || query.isPlaceholderData}
                onClick={() => void decide('reject')}
              >
                {decisionInFlight === 'reject'
                  ? 'Recusando…'
                  : 'Recusar pedido'}
              </button>
              <button
                type="button"
                className="btn sm primary"
                disabled={
                  busy ||
                  !!decisionInFlight ||
                  query.isPlaceholderData ||
                  !process.prazo
                }
                onClick={() => void decide('accept')}
              >
                {decisionInFlight === 'accept'
                  ? 'Aceitando…'
                  : 'Aceitar pedido'}
              </button>
            </div>
          )}
          {decisionError && (
            <p className="process-deadline-error" role="alert">
              {decisionError}
            </p>
          )}
        </div>
      )}
      {showRequest && (
        <>
          <button
            type="button"
            className="btn primary"
            data-deadline-tone={deadlineTone}
            disabled={busy || !canSend}
            aria-describedby={!gateway ? integrationId : undefined}
            onClick={() => setRequestOpen(true)}
          >
            Pedir aumento de prazo
          </button>
          {!gateway && (
            <p className="app-caption" id={integrationId}>
              Envio aguardando integração.
            </p>
          )}
        </>
      )}
      {gateway && (mayRequest || mayReview) && query.isPending && (
        <p className="app-caption" role="status">
          Carregando situação do pedido…
        </p>
      )}
      {gateway && (mayRequest || mayReview) && readError && (
        <div className="process-deadline-error" role="alert">
          <p className="app-caption">
            Não foi possível consultar o pedido de prazo.
          </p>
          {readError.supportReference && (
            <p className="app-caption">{readError.supportReference}</p>
          )}
          <button
            type="button"
            className="btn sm"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {requestOpen && gateway && (
        <ProcessDeadlineRequestDialog
          process={process}
          enabled={canSend}
          busy={busy}
          saving={saving}
          onClose={() => setRequestOpen(false)}
          submit={(days, reason, key, reportError) =>
            onMutate(
              () =>
                gateway.submit(
                  process.id,
                  { version: process.version, additionalDays: days, reason },
                  key,
                ),
              'Pedido de aumento de prazo registrado para a Diretoria.',
              reportError,
            )
          }
        />
      )}
    </section>
  )
}

function DeadlineReason({ reason }: { reason: string }) {
  const popoverId = useId()
  const titleId = useId()
  return (
    <>
      <IconButton
        label="Ver motivo do pedido"
        className="process-deadline-reason-trigger"
        tone="ghost"
        title={undefined}
        popoverTarget={popoverId}
      >
        <span aria-hidden="true">?</span>
      </IconButton>
      <div
        id={popoverId}
        popover="auto"
        className="process-deadline-reason"
        role="region"
        aria-labelledby={titleId}
        tabIndex={0}
      >
        <h3 id={titleId}>Motivo do pedido</h3>
        <p>{reason}</p>
      </div>
    </>
  )
}

function ProcessDeadlineRequestDialog({
  process,
  enabled,
  busy,
  saving,
  onClose,
  submit,
}: {
  process: ProcessResource
  enabled: boolean
  busy: boolean
  saving: boolean
  onClose: () => void
  submit: (
    days: number,
    reason: string,
    key: string,
    reportError: (message: string) => void,
  ) => Promise<boolean>
}) {
  const formId = useId()
  const [days, setDays] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!enabled || busy) return
    const additionalDays = Number(days)
    if (
      !/^\d+$/.test(days.trim()) ||
      !Number.isSafeInteger(additionalDays) ||
      additionalDays < 1
    ) {
      setError('Informe um número inteiro de dias, maior que zero.')
      return
    }
    const message = reason.trim()
    if (!message) {
      setError('Informe o motivo do aumento de prazo.')
      return
    }
    const fingerprint = JSON.stringify([additionalDays, message])
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, key: crypto.randomUUID() }
    setError('')
    if (await submit(additionalDays, message, attempt.current.key, setError))
      onClose()
  }

  return (
    <Dialog
      open
      size="sm"
      title="Pedir aumento de prazo"
      description="O pedido será analisado pela Diretoria. O prazo vigente fica mantido durante a análise."
      closeDisabled={saving}
      closeOnBackdrop={false}
      onClose={onClose}
      footer={
        <>
          <Button disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            tone="primary"
            disabled={busy || !enabled}
            aria-busy={saving}
          >
            {saving ? 'Enviando…' : 'Enviar pedido'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="grid gap-4"
        noValidate
        onSubmit={(event) => void send(event)}
      >
        <p className="app-description">
          Prazo vigente:{' '}
          <strong>
            {process.prazo
              ? formatProcessDate(process.prazo)
              : 'Sem prazo definido'}
          </strong>
        </p>
        <TextField
          label="Dias adicionais"
          data-overlay-initial-focus
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          disabled={saving}
          value={days}
          onChange={(event) => setDays(event.currentTarget.value)}
        />
        <Textarea
          label="Motivo"
          rows={4}
          required
          disabled={saving}
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
        />
        {error && (
          <p className="text-sm text-[var(--status-error-text)]" role="alert">
            {error}
          </p>
        )}
        {!enabled && !busy && (
          <p className="text-sm" role="status">
            O envio está indisponível para este processo.
          </p>
        )}
      </form>
    </Dialog>
  )
}
