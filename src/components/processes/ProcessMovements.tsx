import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import logoUrl from '../../assets/jaralcon-report-logo.png'
import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import { processQueryKeys } from '../../query/processQueryKeys'
import type { OrganizationQueryScope } from '../../query/queryKeys'
import { processService } from '../../services/processService'
import { isApiError } from '../../services/httpClient'
import {
  downloadProcessReportPdf,
  processReportSummary,
} from '../../services/processReportPdf'
import type {
  ProcessCatalog,
  ProcessMonthlyReport,
  ProcessMovementItem,
} from '../../types/processes'
import { getErrorPresentation } from '../../utils/apiErrors'
import {
  formatBRL,
  monthLabel,
  processTypeName,
  shiftMonth,
} from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'

interface Props {
  scope: OrganizationQueryScope
  catalog: ProcessCatalog
  month: string
  authorName: string
  onMonth: (month: string) => void
  onOpen: (id: string) => void
}

export default function ProcessMovements({
  scope,
  catalog,
  month,
  authorName,
  onMonth,
  onOpen,
}: Props) {
  const [showReport, setShowReport] = useState(false)
  const query = useQuery({
    queryKey: processQueryKeys.report(scope, month),
    queryFn: ({ signal }) =>
      processService
        .monthlyReport(month, signal)
        .then((response) => response.data),
  })
  const report =
    isApiError(query.error) && [403, 404].includes(query.error.status)
      ? undefined
      : query.data
  return (
    <>
      <div className="lhead">
        <div className="tt">
          <h1>Movimentações Empresariais</h1>
          <p>
            Novos honorários mensais x honorários perdidos, pelo mês de abertura
            do processo.
          </p>
        </div>
        <div className="process-actions">
          <button
            className="btn primary"
            onClick={() => setShowReport(true)}
            disabled={!report || query.isFetching}
          >
            <ProcessIcon name="pen" size={16} />
            Relatório do mês
          </button>
          <div className="mnav">
            <button
              className="icon-btn"
              onClick={() => onMonth(shiftMonth(month, -1))}
              aria-label="Mês anterior"
            >
              <span className="process-rotate">
                <ProcessIcon name="chevr" />
              </span>
            </button>
            <label>
              <span className="sr-only">Mês das movimentações</span>
              <input
                aria-label="Mês das movimentações"
                type="month"
                min="1900-01"
                max="9999-12"
                value={month}
                onChange={(event) => {
                  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value))
                    onMonth(event.target.value)
                }}
              />
            </label>
            <button
              className="icon-btn"
              onClick={() => onMonth(shiftMonth(month, 1))}
              aria-label="Próximo mês"
            >
              <ProcessIcon name="chevr" />
            </button>
          </div>
        </div>
      </div>
      {query.isPending && (
        <div className="panel empty" role="status">
          Carregando movimentações…
        </div>
      )}
      {query.error && (
        <div className="banner" role="alert">
          {getErrorPresentation(query.error).message}{' '}
          <button className="btn sm" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </div>
      )}
      {report && (
        <>
          <ReportMetrics report={report} />
          <div className="mgrid">
            <MovementList
              title="Novos honorários"
              description="Aberturas, transformações MEI → ME e clientes de outro escritório"
              items={report.entries}
              total={report.gain}
              sign={1}
              catalog={catalog}
              onOpen={onOpen}
            />
            <MovementList
              title="Honorários perdidos"
              description="Baixas, paralisações, inatividades, saídas e exclusões"
              items={report.exits}
              total={report.loss}
              sign={-1}
              catalog={catalog}
              onOpen={onOpen}
            />
          </div>
          <section className="panel process-section">
            <div className="panel-h">
              <div>
                <h2>Perdas por tipo de processo</h2>
                <p className="ph-sub">
                  Honorário mensal perdido em {monthLabel(month)}
                </p>
              </div>
            </div>
            <LossBreakdown report={report} catalog={catalog} />
          </section>
          <section className="panel process-section">
            <div className="panel-h">
              <div>
                <h2>Últimos 12 meses</h2>
                <p className="ph-sub">
                  <span className="lg up" /> Novos honorários{' '}
                  <span className="lg down" /> Honorários perdidos
                </p>
              </div>
            </div>
            <div className="mchart-wrap">
              <HistoryChart report={report} />
            </div>
          </section>
          {showReport && (
            <ReportDialog
              report={report}
              catalog={catalog}
              authorName={authorName}
              onClose={() => setShowReport(false)}
            />
          )}
        </>
      )}
    </>
  )
}

function ReportMetrics({ report }: { report: ProcessMonthlyReport }) {
  return (
    <div className="scards">
      <div className="scard completed">
        <span>Novos honorários</span>
        <b className="num">+ {formatBRL(report.gain)}</b>
        <small>{report.entries.length} contratos novos · por mês</small>
      </div>
      <div className="scard error">
        <span>Honorários perdidos</span>
        <b className="num">− {formatBRL(report.loss)}</b>
        <small>{report.exits.length} empresas · por mês</small>
      </div>
      <div
        className={`scard ${Number(report.balance) >= 0 ? 'completed' : 'error'}`}
      >
        <span>Saldo mensal</span>
        <b className="num">
          {Number(report.balance) > 0 ? '+ ' : ''}
          {formatBRL(report.balance)}
        </b>
        <small>
          {Number(report.balance) >= 0
            ? 'receita recorrente acrescentada'
            : 'receita recorrente reduzida'}
        </small>
      </div>
      {report.missingValues > 0 && (
        <div className="scard progress">
          <span>Valores não informados</span>
          <b className="num">{report.missingValues}</b>
          <small>processos fora dos totais</small>
        </div>
      )}
    </div>
  )
}

function MovementList({
  title,
  description,
  items,
  total,
  sign,
  catalog,
  onOpen,
}: {
  title: string
  description: string
  items: ProcessMovementItem[]
  total: string
  sign: number
  catalog: ProcessCatalog
  onOpen: (id: string) => void
}) {
  return (
    <section className="panel">
      <div className="panel-h">
        <div>
          <h2>{title}</h2>
          <p className="ph-sub">{description}</p>
        </div>
        <span className={`pill ${sign > 0 ? 'okp' : 'errp'}`}>
          {sign > 0 ? '+' : '−'} {formatBRL(total)}
        </span>
      </div>
      {items.length ? (
        [...items]
          .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
          .map((item) => (
            <button
              key={item.processId}
              className="mrow"
              onClick={() => onOpen(item.processId)}
            >
              <span className="nm">
                <b>{item.empresa}</b>
                <small>{processTypeName(catalog, item.tipo)}</small>
              </span>
              <span
                className={`mv ${item.value == null ? 'none' : sign > 0 ? 'up' : 'down'}`}
              >
                {item.value == null
                  ? 'Valor não informado'
                  : `${sign > 0 ? '+ ' : '− '}${formatBRL(item.value)}`}
                {item.value != null && <small>/mês</small>}
              </span>
            </button>
          ))
      ) : (
        <div className="empty small">
          <p>
            {sign > 0
              ? 'Nenhum contrato novo neste mês.'
              : 'Nenhuma perda de honorário neste mês.'}
          </p>
        </div>
      )}
    </section>
  )
}

function LossBreakdown({
  report,
  catalog,
}: {
  report: ProcessMonthlyReport
  catalog: ProcessCatalog
}) {
  const types = Object.entries(report.lossesByType).sort(
    (a, b) => Number(b[1]) - Number(a[1]),
  )
  const maximum = Math.max(1, ...types.map(([, amount]) => Number(amount)))
  return types.length ? (
    <div className="mot">
      {types.map(([type, amount]) => (
        <div key={type} className="mot-r">
          <span className="ml">
            {processTypeName(catalog, type)}
            <small>
              {report.exits.filter((item) => item.tipo === type).length}{' '}
              empresas
            </small>
          </span>
          <span className="mt">
            <i style={{ width: `${(Number(amount) / maximum) * 100}%` }} />
          </span>
          <b className="num">{formatBRL(amount)}</b>
          <em className="num">
            {Number(report.loss)
              ? Math.round((Number(amount) / Number(report.loss)) * 100)
              : 0}
            %
          </em>
        </div>
      ))}
    </div>
  ) : (
    <div className="empty small">
      <p>Nenhuma perda neste mês.</p>
    </div>
  )
}

function HistoryChart({ report }: { report: ProcessMonthlyReport }) {
  const maximum = Math.max(
    1,
    ...report.history.flatMap((item) => [Number(item.gain), Number(item.loss)]),
  )
  return (
    <svg
      viewBox="0 0 720 210"
      className="mchart"
      role="img"
      aria-label="Novos honorários e honorários perdidos nos últimos 12 meses"
    >
      <line x1="8" x2="712" y1="176" y2="176" stroke="var(--panel-border)" />
      {report.history.map((item, index) => {
        const x = 8 + index * (704 / 12) + 704 / 24
        const gain = (Number(item.gain) / maximum) * 150
        const loss = (Number(item.loss) / maximum) * 150
        return (
          <g key={item.month}>
            {item.month === report.month && (
              <rect
                x={x - 27}
                y="4"
                width="54"
                height="192"
                rx="6"
                fill="var(--nav-active)"
              />
            )}
            <rect
              x={x - 19}
              y={176 - gain}
              width="18"
              height={gain}
              rx="3"
              fill="var(--ok-strong)"
            >
              <title>
                {monthLabel(item.month)}: novos {formatBRL(item.gain)}
              </title>
            </rect>
            <rect
              x={x + 1}
              y={176 - loss}
              width="18"
              height={loss}
              rx="3"
              fill="var(--err-strong)"
            >
              <title>
                {monthLabel(item.month)}: perdidos {formatBRL(item.loss)}
              </title>
            </rect>
            <text
              x={x}
              y="194"
              textAnchor="middle"
              fontSize="11"
              fontWeight={item.month === report.month ? 800 : 600}
              fill="var(--text-muted)"
            >
              {monthLabel(item.month).split(' ')[0].slice(0, 3)}
            </text>
            {(index === 0 || item.month.endsWith('-01')) && (
              <text
                x={x}
                y="208"
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-subtle)"
              >
                {item.month.slice(0, 4)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function ReportDialog({
  report,
  catalog,
  authorName,
  onClose,
}: {
  report: ProcessMonthlyReport
  catalog: ProcessCatalog
  authorName: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  useOverlayDialog(ref, onClose)
  async function save() {
    setError('')
    setIsSaving(true)
    try {
      await downloadProcessReportPdf(report, catalog, authorName)
    } catch {
      setError('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }
  return createPortal(
    <div className="processes-module">
      <div className="overlay" onClick={onClose} />
      <div
        ref={ref}
        className="modal report"
        role="dialog"
        aria-modal="true"
        aria-labelledby="process-report-title"
        tabIndex={-1}
      >
        <div className="rhero">
          <img src={logoUrl} className="rlogo" alt="Jaralcon" />
          <button
            className="icon-btn rx"
            data-overlay-close
            aria-label="Fechar relatório"
            onClick={onClose}
          >
            <ProcessIcon name="x" />
          </button>
          <div className="rkick">Movimentações Empresariais</div>
          <h2 id="process-report-title">{monthLabel(report.month)}</h2>
          <svg
            className="rwave"
            viewBox="0 0 820 30"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 24Q205 0 410 16T820 8"
              fill="none"
              stroke="#DEAC29"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="rbody">
          <div className="process-report-metrics">
            <ReportMetrics report={report} />
          </div>
          <p className="rsum">{processReportSummary(report)}</p>
          <div className="rsec">
            <h3>Evolução dos honorários</h3>
            <HistoryChart report={report} />
            <div className="rleg">
              <span>
                <i className="g" />
                Novos honorários
              </span>
              <span>
                <i className="l" />
                Honorários perdidos
              </span>
            </div>
          </div>
          <div className="rsec">
            <h3>Novos honorários</h3>
            <ReportRows items={report.entries} catalog={catalog} sign={1} />
          </div>
          <div className="rsec">
            <h3>Honorários perdidos</h3>
            <ReportRows items={report.exits} catalog={catalog} sign={-1} />
          </div>
          {Object.keys(report.lossesByType).length > 0 && (
            <div className="rsec">
              <h3>Perdas por tipo de processo</h3>
              <LossBreakdown report={report} catalog={catalog} />
            </div>
          )}
          {report.missingValues > 0 && (
            <p className="rmuted">
              {report.missingValues} processos sem valor informado não entram
              nos totais.
            </p>
          )}
        </div>
        <div className="m-foot process-report-footer">
          <span role="alert" className="err-msg">
            {error}
          </span>
          <button className="btn" onClick={onClose}>
            Fechar
          </button>
          <button
            className="btn primary rbtn"
            onClick={() => void save()}
            disabled={isSaving}
          >
            {isSaving ? 'Gerando…' : 'Baixar PDF'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ReportRows({
  items,
  catalog,
  sign,
}: {
  items: ProcessMovementItem[]
  catalog: ProcessCatalog
  sign: number
}) {
  return items.length ? (
    items.map((item) => (
      <div className="rr" key={item.processId}>
        <div>
          <b>{item.empresa}</b>
          <small>{processTypeName(catalog, item.tipo)}</small>
        </div>
        <span className={item.value == null ? 'na' : sign > 0 ? 'up' : 'down'}>
          {item.value == null
            ? 'Valor não informado'
            : `${sign > 0 ? '+ ' : '− '}${formatBRL(item.value)}`}
        </span>
      </div>
    ))
  ) : (
    <p className="rmuted">Nenhuma movimentação no mês.</p>
  )
}
