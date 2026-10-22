import type {
  ProcessCatalog,
  ProcessResource,
  ProcessSector,
} from '../../types/processes'
import {
  formatProcessDate,
  PROCESS_SECTORS,
  processDaysLate,
  processStatus,
  processTypeName,
  processAge,
} from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'

interface Props {
  process: ProcessResource
  catalog: ProcessCatalog
  onOpen: (id: string) => void
  sector?: ProcessSector
  compact?: boolean
  timeZone?: string
}

export default function ProcessSummaryRow({
  process,
  catalog,
  onOpen,
  sector,
  compact,
  timeZone,
}: Props) {
  const status = processStatus(process)
  const analysis = process.analysis
  const current =
    analysis.currentStage == null ? null : process.etapas[analysis.currentStage]
  const mine = !!sector && analysis.pendingSectors.includes(sector)
  const next =
    current?.tasks.filter(
      (task) => task.d === sector && !process.tarefas[task.id],
    ) ?? []
  const progress = analysis.totalTasks
    ? Math.round((analysis.completedTasks / analysis.totalTasks) * 100)
    : 0
  const step = current
    ? `Etapa ${analysis.currentStage! + 1} de ${process.etapas.length} · ${current.t}`
    : process.status === 'concluido'
      ? `Concluído em ${formatProcessDate(process.concluidoEm, timeZone)}`
      : 'Processo cancelado'

  if (compact)
    return (
      <button
        className={`prow ${mine ? 'mine' : ''} ${analysis.late ? 'is-late' : ''}`}
        onClick={() => onOpen(process.id)}
      >
        {mine ? (
          <span className={`turn ${analysis.late ? 'late' : ''}`}>
            <ProcessIcon name={analysis.late ? 'clock' : 'tick'} size={14} />
            {analysis.late ? 'Ação atrasada' : 'Aguardando ação'}
          </span>
        ) : (
          <span className={`badge ${status.tone}`}>{status.label}</span>
        )}
        <span className="t">
          <b>{process.empresa}</b>
          {mine && next[0] && (
            <span className="next">
              <ProcessIcon name="chevr" size={14} />
              {next[0].txt}
              {next.length > 1 && <em>+{next.length - 1} tarefas</em>}
            </span>
          )}
          <small>
            {step} · {processTypeName(catalog, process.tipo)}
          </small>
          {!mine && process.status === 'andamento' && (
            <span className={`waiting ${analysis.waiting ? 'sched' : ''}`}>
              {analysis.waiting
                ? `Próxima etapa liberada em ${formatProcessDate(analysis.releaseDate, timeZone)}`
                : `Aguardando ${analysis.pendingSectors.map((key) => PROCESS_SECTORS[key]).join(' e ')}`}
            </span>
          )}
        </span>
        {process.prazo && (
          <span className={`due ${analysis.late ? 'late' : ''}`}>
            {analysis.late ? 'Venceu' : 'Vence'}{' '}
            {formatProcessDate(process.prazo, timeZone)}
          </span>
        )}
        <span className="arr">
          <ProcessIcon name="arrow" size={16} />
        </span>
      </button>
    )

  return (
    <button
      className={`lrow ${process.status === 'concluido' ? 'is-done' : ''}`}
      onClick={() => onOpen(process.id)}
    >
      <span className="nm">
        <b>
          {process.status === 'concluido' && (
            <span className="okmark">
              <ProcessIcon name="tick" size={12} />
            </span>
          )}
          {process.empresa}
        </b>
        <small>
          {processTypeName(catalog, process.tipo)}
          {process.cnpj ? ` · ${process.cnpj}` : ''}
        </small>
      </span>
      <span className="st">
        <small>
          {step}
          {analysis.waiting &&
            ` · libera em ${formatProcessDate(analysis.releaseDate, timeZone)}`}
        </small>
        <span className="bar">
          <i
            style={{
              width: `${progress}%`,
              ...(process.status === 'concluido'
                ? { background: 'var(--ok-strong)' }
                : {}),
            }}
          />
        </span>
      </span>
      <span className="depts">
        {analysis.waiting ? (
          <span className="dchip sched">
            <ProcessIcon name="clock" size={13} />
            Libera em {formatProcessDate(analysis.releaseDate, timeZone)}
          </span>
        ) : (
          analysis.pendingSectors.map((key) => (
            <span key={key} className={`dchip ${key === sector ? 'me' : ''}`}>
              <span className={`dot ${key}`} />
              {key === sector ? 'Aguardando ação' : PROCESS_SECTORS[key]}
            </span>
          ))
        )}
      </span>
      <span className={`dl ${analysis.late ? 'late' : ''}`}>
        <span className="lab">
          {analysis.late
            ? 'Atraso'
            : process.status === 'concluido'
              ? 'Duração'
              : process.inicioInat
                ? 'Início'
                : 'Prazo'}
        </span>
        <b className="num">
          {analysis.late
            ? `${processDaysLate(process, timeZone)} d`
            : process.status === 'concluido'
              ? `${processAge(process)} d`
              : formatProcessDate(
                  process.inicioInat ?? process.prazo,
                  timeZone,
                )}
        </b>
      </span>
      <span className={`badge ${status.tone}`}>{status.label}</span>
      <span className="arr">
        <ProcessIcon name="chevr" size={16} />
      </span>
    </button>
  )
}
