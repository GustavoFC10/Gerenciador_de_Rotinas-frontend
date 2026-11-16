import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProcessSummaryRow from '../../../src/components/processes/ProcessSummaryRow'
import ProcessIndicatorCards from '../../../src/components/processes/ProcessIndicatorCards'
import ProcessList from '../../../src/components/processes/ProcessList'
import ProcessTypeBadge from '../../../src/components/processes/ProcessTypeBadge'
import ProcessIcon from '../../../src/components/processes/ProcessIcon'
import { processService } from '../../../src/services/processService'
import {
  PROCESS_SECTORS,
  formatProcessDays,
  processTypeName,
} from '../../../src/utils/processPresentation'
import type {
  ProcessFilters,
  ProcessSector,
  ProcessSummary,
  ProcessStatus,
} from '../../../src/types/processes'
import {
  processViewFilters,
  PROCESS_VIEWS,
} from '../../../src/utils/processFilters'
import ProcessMovementsPreview from './ProcessMovementsPreview'
import {
  catalog,
  indicators,
  leggacyMetrics,
  processes,
  reportFor,
} from './fixtures'
import '../../../src/styles/processes.css'
import './review.css'

declare global {
  interface Window {
    Review: {
      mount: (settings: Record<string, unknown>) => HTMLElement
      toast: (text: string) => void
    }
  }
}
// Deliberately replace the only query made by the reused movement component.
processService.monthlyReport = async (month) => ({
  data: reportFor(month),
  status: 200,
  etag: null,
  requestId: null,
  headers: new Headers(),
})
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
  },
})
const isMovements = document.body.dataset.proposal === 'P17'
const requestedList = new URLSearchParams(window.location.search)
const requestedListView = requestedList.get('situacao') || 'todos'
const requestedSector = requestedList.get('setor') || ''
const nav = [
  {
    label: 'Início',
    icon: 'home',
    href: 'dashboard-processos.html',
    active: !isMovements,
  },
  {
    label: 'Processos',
    icon: 'list',
    href: 'dashboard-processos.html?referencia=lista',
  },
  {
    label: 'Movimentações',
    icon: 'list',
    href: 'movimentacoes-processos.html',
    active: isMovements,
  },
  { label: 'Avisos por e-mail', icon: 'file', href: 'estados.html' },
]
const root = window.Review.mount({
  id: isMovements ? 'P17' : 'P15',
  module: 'Processos',
  title: isMovements ? 'Movimentações Empresariais' : 'Início',
  nav,
  actions: isMovements
    ? ''
    : '<a class="button primary" href="processos.html">Novo processo</a>',
  before: isMovements
    ? '../../processos-jaralcon%20(1).html'
    : '../../docs/auditoria-ux/evidencias/10-processos-inicio.png',
  notes: isMovements
    ? [
        'Organização da diretoria preservada: mês, ganhos/perdas/saldo, duas listas, perdas por tipo, histórico de 12 meses e relatório comercial com seis meses.',
        'Derivado diretamente de ProcessMovements.tsx. Ícones, badges, gráfico, relatório e geração de PDF usam o sistema atual. O ajuste para seis meses fica só nesta prévia; src não foi editado.',
        'Os valores são exemplos de honorários mensais por mês de abertura do processo; não representam recebimentos de caixa. Valores ausentes ficam fora dos totais e nunca viram zero.',
        'Troque o mês, abra uma linha e consulte Relatório do mês. Todas as consultas desta prévia são respondidas por dados em memória.',
      ]
    : [
        'Base da diretoria recuperada: Aguardando você e Com outros setores à esquerda; Panorama da operação e Prazos da Leggacy à direita. O bloco de liberação explicita os processos agendados do React atual.',
        'O número principal conta execução (andamento + atrasados), sem incluir os agendados. A barra de prazo e as barras por setor voltam ao formato do original. Setores podem atuar em paralelo; suas contagens não precisam somar o total de processos.',
        'Os indicadores adicionais já existentes no React permanecem disponíveis abaixo do panorama. Tempo médio da execução usa um exemplo visual de 18 dias; a definição do agregado para produção foi registrada no documento de mudanças funcionais.',
        'Nenhuma média global é calculada a partir de uma página de resultados. Os dados fictícios simulam agregados do servidor, e não métricas reais de produção.',
      ],
  content:
    '<div id="process-review-root" class="processes-module process-secondary-review"></div>',
})
const filtered = (sector: ProcessSector) =>
  processes.filter(
    (p) =>
      p.responsibleSectors.includes(sector) &&
      !p.analysis.waiting &&
      ['andamento', 'atrasado'].includes(p.status),
  )
const open = (p: ProcessSummary) =>
  ['andamento', 'atrasado', 'agendado'].includes(p.status)

function Dashboard({
  onOpen,
  onList,
}: {
  onOpen: (id: string) => void
  onList: (view: string, sector?: ProcessSector) => void
}) {
  const [sector, setSector] = useState<ProcessSector>('fin')
  const queue = filtered(sector).sort(
    (a, b) => Number(b.analysis.late) - Number(a.analysis.late),
  )
  const scheduled = processes.filter((p) => p.status === 'agendado')
  const others = processes.filter(
    (p) =>
      open(p) && !p.analysis.waiting && !p.responsibleSectors.includes(sector),
  )
  const executable =
    indicators.byStatus.andamento + indicators.byStatus.atrasado
  const onTime = Math.round((indicators.byStatus.andamento / executable) * 100)
  const maximum = Math.max(1, ...Object.values(indicators.bySector))
  const rows = (items: ProcessSummary[]) =>
    items.map((process) => (
      <ProcessSummaryRow
        key={process.id}
        {...{ process, catalog, sector, onOpen }}
        timeZone="America/Sao_Paulo"
        compact
      />
    ))
  return (
    <>
      <div className="secondary-scope">
        <label>
          Setor de trabalho
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value as ProcessSector)}
            aria-label="Setor de trabalho"
          >
            {Object.entries(PROCESS_SECTORS).map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span>Indicadores da organização · dados demonstrativos</span>
      </div>
      <div className="home">
        <div className="home-left">
          <section className="panel mine-panel">
            <div className="panel-h">
              <div>
                <h2>Aguardando você</h2>
                <p className="ph-sub">
                  Ações liberadas para {PROCESS_SECTORS[sector]}
                </p>
              </div>
              <span className="pill brand">{queue.length}</span>
            </div>
            {rows(queue)}
            <button className="morel" onClick={() => onList('fila', sector)}>
              Ver ações liberadas de {PROCESS_SECTORS[sector]} ({queue.length}){' '}
              <ProcessIcon name="arrow" />
            </button>
          </section>
          <section className="panel">
            <div className="panel-h">
              <div>
                <h2>Aguardando liberação</h2>
                <p className="ph-sub">Abrem para execução na data prevista</p>
              </div>
              <span className="pill">{scheduled.length}</span>
            </div>
            {rows(scheduled.slice(0, 2))}
            <button className="morel" onClick={() => onList('agendados')}>
              Ver todos aguardando liberação ({scheduled.length}){' '}
              <ProcessIcon name="arrow" />
            </button>
          </section>
          <section className="panel">
            <div className="panel-h">
              <div>
                <h2>Com outros setores</h2>
                <p className="ph-sub">
                  Em execução, sem ação de {PROCESS_SECTORS[sector]} no momento
                </p>
              </div>
              <span className="pill">{others.length}</span>
            </div>
            {rows(others.slice(0, 4))}
            <button
              className="morel"
              onClick={() => onList('outrosSetores', sector)}
            >
              Ver com outros setores <ProcessIcon name="arrow" />
            </button>
          </section>
        </div>
        <div className="home-left">
          <section className="panel stat" data-panorama>
            <div className="stat-h">
              <div className="ico-sq">
                <ProcessIcon name="chart" />
              </div>
              <div>
                <h2>Panorama da operação</h2>
                <p>Em execução agora, sem agendados e concluídos</p>
              </div>
            </div>
            <div className="big">
              <b className="num" data-executing-count>
                {executable}
              </b>
              <span>processos em execução</span>
              <em className="warn">{onTime}% no prazo</em>
            </div>
            <div
              className="sbar"
              role="img"
              aria-label={`${indicators.byStatus.andamento} no prazo e ${indicators.late} atrasados`}
            >
              <i
                className="ok"
                style={{ flex: indicators.byStatus.andamento }}
              />
              <i className="late" style={{ flex: indicators.late }} />
            </div>
            <div className="sbar-lg">
              <span>
                <i className="ok" />
                {indicators.byStatus.andamento} no prazo
              </span>
              <span>
                <i className="late" />
                {indicators.late} atrasados
              </span>
            </div>
            <div className="dchart">
              <div className="dchart-h">Onde os processos estão agora</div>
              {Object.entries(PROCESS_SECTORS).map(([key, label]) => (
                <button
                  className="drow"
                  key={key}
                  aria-label={`Consultar ações liberadas de ${label}`}
                  onClick={() => onList('fila', key as ProcessSector)}
                >
                  <span className="dl">
                    <span className={`dot ${key}`} />
                    {label}
                  </span>
                  <span className="dtrack">
                    <i
                      style={{
                        width: `${((indicators.bySector[key as ProcessSector] ?? 0) / maximum) * 100}%`,
                      }}
                    />
                  </span>
                  <b className="num">
                    {indicators.bySector[key as ProcessSector] ?? 0}
                  </b>
                </button>
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
                <b className="num">{indicators.completedThisMonth}</b>
                <small>novembro</small>
              </button>
              <div>
                <span>Tempo médio</span>
                <b className="num" data-demo-execution-average>
                  18 d
                </b>
                <small>dos em execução</small>
              </div>
            </div>
            <button className="morel" onClick={() => onList('ativos')}>
              Ver processos abertos <ProcessIcon name="arrow" />
            </button>
          </section>
          <section className="panel stat leg">
            <div className="stat-h">
              <div className="ico-sq">
                <ProcessIcon name="clock" />
              </div>
              <div>
                <h2>Prazos da Leggacy</h2>
                <p>Da abertura ao marco concluído · organização</p>
              </div>
            </div>
            {leggacyMetrics.map((metric) => (
              <div className="process-leggacy-metric" key={metric.tipo}>
                <h3>{processTypeName(catalog, metric.tipo)}</h3>
                <dl className="process-indicator-grid">
                  <div>
                    <dt>Média</dt>
                    <dd>{formatProcessDays(metric.averageDays)}</dd>
                  </div>
                  <div>
                    <dt>Mínimo</dt>
                    <dd>{formatProcessDays(metric.minDays)}</dd>
                  </div>
                  <div>
                    <dt>Máximo</dt>
                    <dd>{formatProcessDays(metric.maxDays)}</dd>
                  </div>
                  <div>
                    <dt>Amostra concluída</dt>
                    <dd>{metric.completedCount}</dd>
                  </div>
                  <div>
                    <dt>Aguardando</dt>
                    <dd>{metric.waitingCount}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </section>
          <details className="panel secondary-additional">
            <summary>Outros indicadores da organização</summary>
            <ProcessIndicatorCards indicators={indicators} />
          </details>
        </div>
      </div>
    </>
  )
}

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const process = processes.find((p) => p.id === id)!
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      className="secondary-detail"
      ref={ref}
      onClose={onClose}
      aria-labelledby="secondary-detail-title"
    >
      <header>
        <h2 id="secondary-detail-title">{process.empresa}</h2>
        <button
          className="button"
          onClick={() => ref.current?.close()}
          aria-label="Fechar ficha do processo"
        >
          Fechar
        </button>
      </header>
      <div>
        <ProcessTypeBadge catalog={catalog} tipo={process.tipo} />
        <dl>
          <dt>Situação</dt>
          <dd>{catalog.statuses[process.status]}</dd>
          <dt>Próxima ação</dt>
          <dd>{process.nextTask?.text || 'Processo encerrado'}</dd>
          <dt>Setor responsável</dt>
          <dd>
            {process.responsibleSectors
              .map((s) => PROCESS_SECTORS[s])
              .join(' e ') || '—'}
          </dd>
        </dl>
        <p>
          Ficha resumida para testar a abertura pela linha. O fluxo completo de
          execução continua sendo o do sistema.
        </p>
        <a className="button" href="processos.html">
          Consultar prévia do formulário
        </a>
      </div>
    </dialog>
  )
}
function ListReference({
  initial,
  onClose,
  onOpen,
}: {
  initial: { view: string; sector?: ProcessSector }
  onClose: () => void
  onOpen: (id: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState(initial.view)
  const [filters, setFilters] = useState<ProcessFilters>({
    ...processViewFilters(initial.view),
    ...(initial.view === 'responsabilidade' && initial.sector
      ? { responsibleSector: initial.sector }
      : {}),
    page: 1,
    pageSize: 50,
    ordering: initial.view === 'fila' ? 'urgency' : 'recent',
  })
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  const selection = processes
    .filter((process) => {
      if (filters.status?.length && !filters.status.includes(process.status))
        return false
      if (filters.tipo && filters.tipo !== process.tipo) return false
      if (
        filters.q &&
        !`${process.empresa} ${process.codigo}`
          .toLocaleLowerCase('pt-BR')
          .includes(filters.q.toLocaleLowerCase('pt-BR'))
      )
        return false
      if (
        filters.responsibleSector &&
        !process.responsibleSectors.includes(filters.responsibleSector)
      )
        return false
      if (filters.month && !process.criadoEm.startsWith(filters.month))
        return false
      if (
        view === 'fila' &&
        initial.sector &&
        (!process.responsibleSectors.includes(initial.sector) ||
          process.analysis.waiting)
      )
        return false
      if (
        view === 'outrosSetores' &&
        initial.sector &&
        process.responsibleSectors.includes(initial.sector)
      )
        return false
      return true
    })
    .sort((a, b) =>
      filters.ordering === 'urgency'
        ? Number(b.analysis.late) - Number(a.analysis.late) ||
          (a.prazo || '').localeCompare(b.prazo || '')
        : b.atualizadoEm.localeCompare(a.atualizadoEm),
    )
  const update = (patch: Record<string, string | string[]>) => {
    if (typeof patch.situacao === 'string') setView(patch.situacao)
    setFilters((current) => ({
      ...current,
      ...(typeof patch.q === 'string' ? { q: patch.q } : {}),
      ...(typeof patch.tipo === 'string'
        ? { tipo: patch.tipo as ProcessFilters['tipo'] }
        : {}),
      ...(typeof patch.month === 'string' ? { month: patch.month } : {}),
      ...(typeof patch.responsibleSector === 'string'
        ? {
            responsibleSector:
              (patch.responsibleSector as ProcessSector) || undefined,
          }
        : {}),
      ...(typeof patch.ordering === 'string'
        ? { ordering: patch.ordering as ProcessFilters['ordering'] }
        : {}),
      ...(Array.isArray(patch.status)
        ? { status: patch.status as ProcessStatus[] }
        : {}),
    }))
  }
  return (
    <dialog
      className="secondary-detail secondary-list"
      ref={ref}
      onClose={onClose}
      aria-labelledby="list-reference-title"
    >
      <header>
        <div>
          <h2 id="list-reference-title">Referência: lista atual</h2>
          <p>
            A organização das filas aguarda sua decisão. Este diálogo reutiliza
            ProcessList sem reformulação.
          </p>
        </div>
        <button className="button" onClick={() => ref.current?.close()}>
          Fechar lista
        </button>
      </header>
      <div>
        <ProcessList
          data={{
            count: selection.length,
            results: selection,
            next: null,
            previous: null,
          }}
          catalog={catalog}
          filters={filters}
          sector={initial.sector}
          view={PROCESS_VIEWS[view] ? view : 'todos'}
          timeZone="America/Sao_Paulo"
          onFilters={update}
          onClear={() =>
            setFilters({
              ...processViewFilters(view),
              ...(initial.view === 'responsabilidade' && initial.sector
                ? { responsibleSector: initial.sector }
                : {}),
              page: 1,
              pageSize: 50,
            })
          }
          onOpen={onOpen}
          onWaiting={() => {
            setView('agendados')
            setFilters({ status: ['agendado'] })
          }}
        />
      </div>
    </dialog>
  )
}
export default function App() {
  const [month, setMonth] = useState('2026-11')
  const [opened, setOpened] = useState<string | null>(null)
  const [list, setList] = useState<{
    view: string
    sector?: ProcessSector
  } | null>(() =>
    requestedList.get('referencia') === 'lista'
      ? {
          view: PROCESS_VIEWS[requestedListView] ? requestedListView : 'todos',
          ...(requestedSector in PROCESS_SECTORS
            ? { sector: requestedSector as ProcessSector }
            : {}),
        }
      : null,
  )
  const onList = (view: string, sector?: ProcessSector) => {
    setList({ view, sector })
  }
  return (
    <QueryClientProvider client={queryClient}>
      {isMovements ? (
        <ProcessMovementsPreview
          scope={{
            organizationId: 'review-office',
            membershipId: 'review-member',
          }}
          catalog={catalog}
          month={month}
          authorName="Mariana Costa"
          onMonth={setMonth}
          onOpen={setOpened}
        />
      ) : (
        <Dashboard onOpen={setOpened} onList={onList} />
      )}
      {list && (
        <ListReference
          key={`${list.view}:${list.sector}`}
          initial={list}
          onClose={() => setList(null)}
          onOpen={setOpened}
        />
      )}
      {opened && <Detail id={opened} onClose={() => setOpened(null)} />}
    </QueryClientProvider>
  )
}
const host = root.querySelector('#process-review-root')
if (host) createRoot(host).render(<App />)
