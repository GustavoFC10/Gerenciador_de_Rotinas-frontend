import type {
  ProcessCatalog,
  ProcessIndicators,
  ProcessResource,
  ProcessSector,
} from '../../types/processes'
import {
  PROCESS_SECTORS,
  processAge,
  processMonth,
} from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'
import ProcessSummaryRow from './ProcessSummaryRow'

interface Props {
  processes: ProcessResource[]
  catalog: ProcessCatalog
  indicators: ProcessIndicators
  sector?: ProcessSector
  timeZone: string
  onOpen: (id: string) => void
  onList: (view: string, type?: string) => void
  onSector: (sector: ProcessSector) => void
  onCreate: () => void
}

export default function ProcessOverview({
  processes,
  catalog,
  indicators,
  sector,
  timeZone,
  onOpen,
  onList,
  onSector,
  onCreate,
}: Props) {
  const active = processes.filter((process) => process.status === 'andamento')
  const execution = active.filter((process) => !process.analysis.waiting)
  const byDeadline = (a: ProcessResource, b: ProcessResource) =>
    Number(b.analysis.late) - Number(a.analysis.late) ||
    (a.prazo ?? '9').localeCompare(b.prazo ?? '9') ||
    b.atualizadoEm.localeCompare(a.atualizadoEm)
  const mine = sector
    ? active
        .filter((process) => process.analysis.pendingSectors.includes(sector))
        .sort(byDeadline)
    : []
  const others = execution
    .filter(
      (process) => !sector || !process.analysis.pendingSectors.includes(sector),
    )
    .sort(byDeadline)
  const onTime = Math.max(0, execution.length - indicators.late)
  const onTimePercent = execution.length
    ? Math.round((onTime / execution.length) * 100)
    : 0
  const maxSector = Math.max(1, ...Object.values(indicators.bySector))
  const month = processMonth(timeZone)
  const doneMonth = processes.filter(
    (process) =>
      process.status === 'concluido' &&
      processMonth(timeZone, new Date(process.concluidoEm!)) === month,
  ).length
  const age = execution.length
    ? Math.round(
        execution.reduce((sum, process) => sum + processAge(process), 0) /
          execution.length,
      )
    : null

  return (
    <>
      <div className="page-h">
        <h1>Início</h1>
        <span className="meta">
          {new Date().toLocaleDateString('pt-BR', {
            timeZone,
            month: '2-digit',
            year: 'numeric',
          })}{' '}
          · visão da equipe
        </span>
      </div>
      <div className="home">
        <div className="home-left">
          {!processes.length ? (
            <section className="panel">
              <div className="empty">
                <div className="ico-sq">
                  <ProcessIcon name="list" />
                </div>
                <h3>Nenhum processo cadastrado</h3>
                <p>
                  Cada tipo já vem com as etapas de Diretoria, Regularidade e
                  Financeiro.
                </p>
                {catalog.permissions.create && (
                  <button className="btn primary" onClick={onCreate}>
                    <ProcessIcon name="plus" size={16} />
                    Novo processo
                  </button>
                )}
              </div>
            </section>
          ) : !sector ? (
            <section className="panel mine-panel">
              <div className="empty">
                <div className="ico-sq">
                  <ProcessIcon name="users" />
                </div>
                <h3>Qual é o seu departamento?</h3>
                <p>
                  Escolha seu setor para ver os processos que estão esperando
                  uma ação sua.
                </p>
                <div className="process-actions">
                  {catalog.permissions.executeSectors.map((key) => (
                    <button
                      key={key}
                      className="btn"
                      onClick={() => onSector(key)}
                    >
                      <span className={`dot ${key}`} />
                      {PROCESS_SECTORS[key]}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : mine.length ? (
            <section className="panel mine-panel">
              <div className="panel-h">
                <div>
                  <h2>Aguardando você</h2>
                  <p className="ph-sub">
                    <span className={`dot ${sector}`} />
                    Ações do {PROCESS_SECTORS[sector]} na etapa atual de cada
                    processo
                  </p>
                </div>
                <span className="pill brand">
                  {mine.length} {mine.length === 1 ? 'processo' : 'processos'}
                </span>
              </div>
              {mine.slice(0, 8).map((process) => (
                <ProcessSummaryRow
                  key={process.id}
                  {...{ process, catalog, onOpen, sector, timeZone }}
                  compact
                />
              ))}
              {mine.length > 8 && (
                <button className="morel" onClick={() => onList('fila')}>
                  Ver os {mine.length} processos da sua fila{' '}
                  <ProcessIcon name="arrow" size={14} />
                </button>
              )}
            </section>
          ) : (
            <section className="panel mine-panel clear">
              <div className="clear-body">
                <span className="clear-ic">
                  <ProcessIcon name="tick" size={26} />
                </span>
                <div>
                  <h2>Tudo em dia</h2>
                  <p>
                    Nenhum processo aguarda ação do {PROCESS_SECTORS[sector]} no
                    momento. Quando um processo chegar à etapa do seu setor, ele
                    aparecerá aqui.
                  </p>
                </div>
                <span className="pill ok">
                  <ProcessIcon name="tick" size={13} />
                  Em dia
                </span>
              </div>
            </section>
          )}
          {!!others.length && (
            <section className="panel">
              <div className="panel-h">
                <div>
                  <h2>
                    {sector ? 'Com outros setores' : 'Prioridades da equipe'}
                  </h2>
                  <p className="ph-sub">
                    {sector
                      ? 'Em andamento, sem ação sua no momento'
                      : 'Todos os processos em andamento'}
                  </p>
                </div>
                <span className="pill">{others.length}</span>
              </div>
              {others.slice(0, 6).map((process) => (
                <ProcessSummaryRow
                  key={process.id}
                  {...{ process, catalog, onOpen, timeZone }}
                  compact
                />
              ))}
              {others.length > 6 && (
                <button className="morel" onClick={() => onList('ativos')}>
                  Ver todos em andamento <ProcessIcon name="arrow" size={14} />
                </button>
              )}
            </section>
          )}
        </div>
        <div className="home-left">
          <section className="panel stat">
            <div className="stat-h">
              <div className="ico-sq">
                <ProcessIcon name="chart" />
              </div>
              <div>
                <h2>Panorama da operação</h2>
                <p>
                  Processos em execução agora, sem contar agendados e
                  concluídos.
                </p>
              </div>
            </div>
            <div className="big">
              <b className="num">{execution.length}</b>
              <span>
                {execution.length === 1
                  ? 'processo em execução'
                  : 'processos em execução'}
              </span>
              <em
                className={
                  onTimePercent < 100 && execution.length ? 'warn' : ''
                }
              >
                {execution.length ? `${onTimePercent}% no prazo` : '—'}
              </em>
            </div>
            <div
              className="sbar"
              role="img"
              aria-label={`${onTime} no prazo e ${indicators.late} atrasados`}
            >
              {execution.length ? (
                <>
                  {onTime > 0 && <i className="ok" style={{ flex: onTime }} />}
                  {indicators.late > 0 && (
                    <i className="late" style={{ flex: indicators.late }} />
                  )}
                </>
              ) : (
                <i className="empty" style={{ flex: 1 }} />
              )}
            </div>
            <div className="sbar-lg">
              <span>
                <i className="ok" />
                {onTime} no prazo
              </span>
              <span>
                <i className="late" />
                {indicators.late} atrasados
              </span>
            </div>
            <div className="dchart">
              <div className="dchart-h">Onde os processos estão agora</div>
              {(Object.keys(PROCESS_SECTORS) as ProcessSector[]).map((key) => (
                <div key={key} className="drow">
                  <span className="dl">
                    <span className={`dot ${key}`} />
                    {PROCESS_SECTORS[key]}
                    {key === sector && <em>você</em>}
                  </span>
                  <span className="dtrack">
                    <i
                      style={{
                        width: `${((indicators.bySector[key] ?? 0) / maxSector) * 100}%`,
                      }}
                    />
                  </span>
                  <b className="num">{indicators.bySector[key] ?? 0}</b>
                </div>
              ))}
            </div>
            <div className="mini3">
              <button onClick={() => onList('agendados')}>
                <span>Agendados</span>
                <b className="num">{indicators.waiting}</b>
                <small>aguardando data</small>
              </button>
              <button onClick={() => onList('concluidos')}>
                <span>Concluídos no mês</span>
                <b className="num">{doneMonth}</b>
                <small>
                  {new Date().toLocaleDateString('pt-BR', {
                    timeZone,
                    month: 'long',
                  })}
                </small>
              </button>
              <div>
                <span>Tempo médio</span>
                <b className="num">{age == null ? '—' : `${age} d`}</b>
                <small>dos em execução</small>
              </div>
            </div>
            <button className="link" onClick={() => onList('ativos')}>
              Ver processos em andamento <ProcessIcon name="arrow" size={16} />
            </button>
          </section>
          <LeggacyStats processes={processes} />
        </div>
      </div>
    </>
  )
}

function LeggacyStats({ processes }: { processes: ProcessResource[] }) {
  const types = [
    ['abertura', 'Novo CNPJ', 'building', 'CNPJ liberado'],
    ['alteracao', 'Alteração contratual', 'pen', 'registro na Junta'],
    ['baixa', 'Baixa empresarial', 'box', 'baixa concluída'],
  ]
  const daysLabel = (value: number | null) =>
    value == null
      ? '—'
      : value < 1
        ? '< 1 dia'
        : `${Math.round(value)} ${Math.round(value) === 1 ? 'dia' : 'dias'}`
  return (
    <section className="panel stat leg">
      <div className="stat-h">
        <div className="ico-sq">
          <ProcessIcon name="clock" />
        </div>
        <div>
          <h2>Prazos da Leggacy</h2>
          <p>
            Tempo médio da abertura do processo até o resultado efetivo na
            Receita Federal.
          </p>
        </div>
      </div>
      <div className="leg-list">
        {types.map(([type, label, icon]) => {
          const records = processes.filter(
            (process) =>
              process.tipo === type && process.status !== 'cancelado',
          )
          const durations = records.flatMap((process) => {
            const milestone = process.etapas
              .flatMap((stage) => stage.tasks)
              .find((task) => task.marco)
            const state = milestone ? process.tarefas[milestone.id] : undefined
            return state?.s === 'feito'
              ? [
                  Math.max(
                    0,
                    (Date.parse(state.em) - Date.parse(process.criadoEm)) /
                      86_400_000,
                  ),
                ]
              : []
          })
          const waiting = records.filter(
            (process) =>
              process.status === 'andamento' &&
              process.etapas
                .flatMap((stage) => stage.tasks)
                .some((task) => task.marco && !process.tarefas[task.id]),
          ).length
          const average = durations.length
            ? durations.reduce((sum, value) => sum + value, 0) /
              durations.length
            : null
          return (
            <div className="leg-r" key={type}>
              <span className="leg-ic">
                <ProcessIcon name={icon} size={16} />
              </span>
              <div className="leg-t">
                <b>{label}</b>
                <small>
                  {durations.length
                    ? `média de ${durations.length} processos · mín. ${daysLabel(Math.min(...durations))} · máx. ${daysLabel(Math.max(...durations))}`
                    : 'ainda sem processos concluídos na Leggacy'}
                  {waiting > 0 && ` · ${waiting} em curso`}
                </small>
              </div>
              <span className={`leg-v ${average == null ? 'none' : ''}`}>
                {daysLabel(average)}
              </span>
            </div>
          )
        })}
      </div>
      <p className="leg-note">
        Contado da abertura do processo até o CNPJ liberado, registro na Junta
        ou baixa concluída.
      </p>
    </section>
  )
}
