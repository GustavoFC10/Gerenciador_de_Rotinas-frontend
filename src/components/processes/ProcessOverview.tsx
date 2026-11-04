import type {
  ProcessCatalog,
  ProcessIndicators,
  ProcessPage,
  ProcessSector,
} from '../../types/processes'
import { PROCESS_SECTORS } from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'
import ProcessSummaryRow from './ProcessSummaryRow'

interface Props {
  queue?: ProcessPage
  scheduled: ProcessPage
  execution: ProcessPage
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
  queue,
  scheduled,
  execution,
  catalog,
  indicators,
  sector,
  timeZone,
  onOpen,
  onList,
  onSector,
  onCreate,
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
              {catalog.permissions.create && (
                <button className="btn primary" onClick={onCreate}>
                  <ProcessIcon name="plus" />
                  Novo processo
                </button>
              )}
            </section>
          )}
          <section className="panel mine-panel">
            <div className="panel-h">
              <div>
                <h2>Aguardando você</h2>
                <p className="ph-sub">
                  {sector
                    ? `Ações liberadas para ${PROCESS_SECTORS[sector]}`
                    : 'Selecione um setor com autorização de execução'}
                </p>
              </div>
              <span className="pill brand">{queue?.count ?? 0}</span>
            </div>
            {!sector ? (
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
                <h2>Em execução na equipe</h2>
                <p className="ph-sub">Em andamento e atrasados</p>
              </div>
              <span className="pill">{execution.count}</span>
            </div>
            {rows(execution)}
            <button className="morel" onClick={() => onList('ativos')}>
              Ver todos os abertos
            </button>
          </section>
        </div>
        <div className="home-left">
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
                <div className="drow" key={key}>
                  <span className="dl">{label}</span>
                  <b className="num">
                    {indicators.bySector[key as ProcessSector] ?? 0}
                  </b>
                </div>
              ))}
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
