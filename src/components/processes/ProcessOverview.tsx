import type {
  ProcessCatalog,
  ProcessIndicators,
  ProcessPage,
  ProcessSector,
  ProcessLeggacyMetric,
} from '../../types/processes'
import { PROCESS_SECTORS, formatProcessDays, processTypeName } from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'
import ProcessSummaryRow from './ProcessSummaryRow'
import ProcessIndicatorCards from './ProcessIndicatorCards'

interface Props {
  queue?: ProcessPage
  scheduled: ProcessPage
  execution: ProcessPage
  catalog: ProcessCatalog
  indicators: ProcessIndicators
  leggacyMetrics?: ProcessLeggacyMetric[]
  sector?: ProcessSector
  timeZone: string
  onOpen: (id: string) => void
  onList: (view: string, type?: string) => void
  onSector: (sector: ProcessSector) => void
  onQueueSector?: (sector: ProcessSector) => void
}

export default function ProcessOverview({
  queue,
  scheduled,
  execution,
  catalog,
  indicators,
  leggacyMetrics,
  sector,
  timeZone,
  onOpen,
  onList,
  onSector,
  onQueueSector,
}: Props) {
  const executable =
    indicators.byStatus.andamento + indicators.byStatus.atrasado
  const onTimePercent = executable
    ? Math.round((indicators.byStatus.andamento / executable) * 100)
    : null
  const rows = (data: ProcessPage) =>
    data.results.map((process) => (
      <ProcessSummaryRow
        key={process.id}
        {...{ process, catalog, onOpen, sector, timeZone }}
        compact
      />
    ))
  return (
    <>
      <div className="page-h">
        <h1>Início</h1>
        <span className="meta">Visão da equipe · indicadores globais</span>
      </div>
      <div className="home">
        <div className="home-left">
          {!indicators.total && (
            <section className="panel empty">
              <h2>Nenhum processo cadastrado</h2>
              <p>
                {catalog.permissions.create
                  ? 'Use Novo processo na barra superior para iniciar o acompanhamento.'
                  : 'Os processos cadastrados pela Diretoria aparecerão aqui.'}
              </p>
            </section>
          )}
          <section className="panel mine-panel">
            <div className="panel-h">
              <div>
                <h2>{sector ? 'Aguardando você' : 'Prioridades da execução'}</h2>
                <p className="ph-sub">
                  {sector
                    ? `Ações liberadas para ${PROCESS_SECTORS[sector]}`
                    : 'Visão geral dos processos em andamento e atrasados'}
                </p>
              </div>
              <span className="pill brand">{queue?.count ?? 0}</span>
            </div>
            {!sector && !queue?.results.length ? (
              <div className="empty">
                {catalog.permissions.executeSectors.length ? (
                  catalog.permissions.executeSectors.map((key) => (
                    <button
                      key={key}
                      className="btn"
                      onClick={() => onSector(key)}
                    >
                      {PROCESS_SECTORS[key]}
                    </button>
                  ))
                ) : (
                  <p>
                    Seu acesso permite consultar os processos. A execução
                    depende das permissões de cada setor.
                  </p>
                )}
              </div>
            ) : queue?.results.length ? (
              rows(queue)
            ) : (
              <div className="empty">
                <h3>Nenhuma ação liberada</h3>
                <p>
                  {scheduled.count
                    ? 'Há processos aguardando liberação. Eles continuam abertos e aparecem abaixo.'
                    : 'Nenhum processo aguarda uma ação deste setor no momento.'}
                </p>
                {scheduled.count > 0 && (
                  <button className="btn" onClick={() => onList('agendados')}>
                    Ver aguardando liberação
                  </button>
                )}
              </div>
            )}
            {sector && (
              <button className="morel" onClick={() => onList('fila')}>
                Ver fila completa ({queue?.count ?? 0})
              </button>
            )}
          </section>
          <section className="panel">
            <div className="panel-h">
              <div>
                <h2>Aguardando liberação</h2>
                <p className="ph-sub">
                  Processos abertos, com responsável e data de liberação
                </p>
              </div>
              <span className="pill">{scheduled.count}</span>
            </div>
            {scheduled.results.length ? (
              rows(scheduled)
            ) : (
              <p className="empty">Nenhum processo aguarda liberação.</p>
            )}
            <button className="morel" onClick={() => onList('agendados')}>
              Ver todos aguardando liberação ({scheduled.count})
            </button>
          </section>
          <section className="panel">
            <div className="panel-h">
              <div>
                <h2>{sector ? 'Com outros setores' : 'Em execução na equipe'}</h2>
                <p className="ph-sub">{sector ? `Sem pendências de ${PROCESS_SECTORS[sector]}` : 'Em andamento e atrasados'}</p>
              </div>
              <span className="pill">{execution.count}</span>
            </div>
            {rows(execution)}
            <button className="morel" onClick={() => onList(sector ? 'outrosSetores' : 'fila')}>
              {sector ? 'Ver com outros setores' : 'Ver execução completa'}
            </button>
          </section>
        </div>
        <div className="home-left">
          <ProcessIndicatorCards indicators={indicators} />
          {leggacyMetrics && <section className="panel">
            <div className="panel-h"><div><h2>Prazos da Leggacy</h2>
              <p className="ph-sub">Dias corridos da abertura até o marco concluído · toda a organização</p></div></div>
            {leggacyMetrics.map(metric => <div className="process-leggacy-metric" key={metric.tipo}>
              <h3>{processTypeName(catalog, metric.tipo)}</h3>
              <dl className="process-indicator-grid">
                <div><dt>Média</dt><dd>{formatProcessDays(metric.averageDays)}</dd></div>
                <div><dt>Mínimo</dt><dd>{formatProcessDays(metric.minDays)}</dd></div>
                <div><dt>Máximo</dt><dd>{formatProcessDays(metric.maxDays)}</dd></div>
                <div><dt>Amostra concluída</dt><dd>{metric.completedCount}</dd></div>
                <div><dt>Aguardando</dt><dd>{metric.waitingCount}</dd></div>
              </dl>
            </div>)}
          </section>}
          <section className="panel stat">
            <div className="stat-h">
              <div className="ico-sq">
                <ProcessIcon name="chart" />
              </div>
              <div>
                <h2>Panorama da operação</h2>
                <p>Totais de todos os processos da organização</p>
              </div>
            </div>
            <div className="big">
              <b className="num">{indicators.active}</b>
              <span>processos abertos</span>
              <em>
                {onTimePercent == null
                  ? 'Sem processos em execução'
                  : `${onTimePercent}% da execução no prazo`}
              </em>
            </div>
            <div className="mini3">
              <button onClick={() => onList('andamento')}>
                <span>Em andamento</span>
                <b className="num">{indicators.byStatus.andamento}</b>
              </button>
              <button onClick={() => onList('agendados')}>
                <span>Aguardando liberação</span>
                <b className="num">{indicators.waiting}</b>
              </button>
              <button onClick={() => onList('atrasados')}>
                <span>Atrasados</span>
                <b className="num">{indicators.late}</b>
              </button>
            </div>
            <div className="dchart">
              <div className="dchart-h">Filas executáveis por setor</div>
              {Object.entries(PROCESS_SECTORS).map(([key, label]) => (
                <button className="drow" key={key} onClick={() => onQueueSector?.(key as ProcessSector)}
                  disabled={!onQueueSector} aria-label={`Consultar responsabilidade de ${label}`}>
                  <span className="dl">{label}</span>
                  <b className="num">
                    {indicators.bySector[key as ProcessSector] ?? 0}
                  </b>
                </button>
              ))}
            </div>
            <div className="dchart">
              <div className="dchart-h">Processos por tipo</div>
              {catalog.types.map(type => <button className="drow" key={type.id} onClick={() => onList('todos', type.id)}>
                <span className="dl">{type.nome}</span><b className="num">{indicators.byType[type.id] ?? 0}</b>
              </button>)}
            </div>
            <div className="mini3">
              <button onClick={() => onList('concluidos')}>
                <span>Concluídos</span>
                <b className="num">{indicators.completed}</b>
              </button>
              <button onClick={() => onList('encerrados')}>
                <span>Cancelados</span>
                <b className="num">{indicators.cancelled}</b>
              </button>
              <button onClick={() => onList('todos')}>
                <span>Total</span>
                <b className="num">{indicators.total}</b>
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
