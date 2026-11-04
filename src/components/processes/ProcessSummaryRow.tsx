import type {
  ProcessCatalog,
  ProcessSummary,
  ProcessSector,
} from '../../types/processes'
import {
  formatProcessDate,
  PROCESS_SECTORS,
  processStatus,
} from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'
import ProcessTypeBadge from './ProcessTypeBadge'

interface Props {
  process: ProcessSummary
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
  const progress = analysis.totalTasks
    ? Math.round((analysis.completedTasks / analysis.totalTasks) * 100)
    : 0
  const step =
    analysis.currentStage == null
      ? process.status === 'concluido'
        ? `Concluído em ${formatProcessDate(process.concluidoEm, timeZone)}`
        : status.label
      : `Etapa ${analysis.currentStage + 1} · ${analysis.completedTasks} de ${analysis.totalTasks} tarefas`
  const responsible = process.responsibleSectors
    .map((key) => PROCESS_SECTORS[key])
    .join(' e ')
  const release =
    process.status === 'agendado'
      ? `Libera em ${formatProcessDate(analysis.releaseDate, timeZone)}`
      : ''
  if (compact)
    return (
      <button
        className={`prow ${process.status === 'atrasado' ? 'is-late' : ''}`}
        data-process-id={process.id}
        onClick={() => onOpen(process.id)}
      >
        <span className={`badge ${status.tone}`}>{status.label}</span>
        <span className="t">
          <b>{process.empresa}</b>
          <small>{step}</small>
          <ProcessTypeBadge catalog={catalog} tipo={process.tipo} />
          {responsible && (
            <span className="waiting">Responsável: {responsible}</span>
          )}
          {release && <span className="waiting sched">{release}</span>}
        </span>
        {process.prazo && (
          <span
            className={`due ${process.status === 'atrasado' ? 'late' : ''}`}
          >
            Prazo {formatProcessDate(process.prazo, timeZone)}
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
      data-process-id={process.id}
      onClick={() => onOpen(process.id)}
    >
      <span className="nm">
        <b>{process.empresa}</b>
        <small>
          <ProcessTypeBadge catalog={catalog} tipo={process.tipo} />
          {process.cnpj ? ` · ${process.cnpj}` : ''}
        </small>
      </span>
      <span className="st">
        <small>
          {step}
          {release && ` · ${release}`}
        </small>
        <span className="bar">
          <i style={{ width: `${progress}%` }} />
        </span>
      </span>
      <span className="depts">
        {process.responsibleSectors.map((key) => (
          <span key={key} className={`dchip ${key === sector ? 'me' : ''}`}>
            <span className={`dot ${key}`} />
            {PROCESS_SECTORS[key]}
          </span>
        ))}
      </span>
      <span className="dl">
        <span className="lab">Prazo</span>
        <b className="num">{formatProcessDate(process.prazo, timeZone)}</b>
      </span>
      <span className={`badge ${status.tone}`}>{status.label}</span>
      <span className="arr">
        <ProcessIcon name="chevr" size={16} />
      </span>
    </button>
  )
}
