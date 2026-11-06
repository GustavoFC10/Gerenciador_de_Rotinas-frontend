import { useId, useState } from 'react'
import type {
  ProcessCatalog,
  ProcessFilters,
  ProcessPage,
  ProcessSector,
  ProcessStatus,
  ProcessIndicators,
} from '../../types/processes'
import {
  PROCESS_SECTORS,
  PROCESS_STATUS_PRESENTATION,
} from '../../utils/processPresentation'
import { PROCESS_VIEWS } from '../../utils/processFilters'
import ProcessIcon from './ProcessIcon'
import ProcessSummaryRow from './ProcessSummaryRow'
import ProcessIndicatorCards from './ProcessIndicatorCards'
import { groupProcessPage, type ProcessGrouping } from '../../utils/processGroups'

interface Props {
  data: ProcessPage
  indicators?: ProcessIndicators
  catalog: ProcessCatalog
  filters: ProcessFilters
  sector?: ProcessSector
  baseResponsibleSector?: ProcessSector
  customStatuses?: readonly ProcessStatus[]
  isFetching?: boolean
  isLoading?: boolean
  searchValue?: string
  view: string
  timeZone: string
  onFilters: (patch: Record<string, string | string[]>) => void
  onClear: () => void
  onOpen: (id: string) => void
  onWaiting: () => void
}

export default function ProcessList({
  data,
  indicators,
  catalog,
  filters,
  sector,
  baseResponsibleSector,
  customStatuses,
  isFetching = false,
  isLoading = false,
  searchValue,
  view,
  timeZone,
  onFilters,
  onClear,
  onOpen,
  onWaiting,
}: Props) {
  const moreId = useId()
  const [moreOpen, setMoreOpen] = useState(false)
  const [grouping, setGrouping] = useState<ProcessGrouping>('none')
  const groups = groupProcessPage(data.results, grouping, timeZone, filters.ordering)
  const row = (process: ProcessPage['results'][number]) => <ProcessSummaryRow
    key={process.id} {...{ process, catalog, onOpen, sector, timeZone }} />
  const metadata = PROCESS_VIEWS[view] ?? PROCESS_VIEWS.todos
  const statuses =
    view === 'todos' ? (customStatuses ?? filters.status ?? []) : []
  const responsibleBase =
    baseResponsibleSector ?? (view === 'responsabilidade' ? sector : undefined)
  const additionalResponsible =
    !!filters.responsibleSector && filters.responsibleSector !== responsibleBase
  const hasFilters = !!(
    statuses.length ||
    filters.tipo ||
    filters.q ||
    filters.month ||
    additionalResponsible
  )
  const advancedCount = Number(!!filters.month) + Number(statuses.length > 0)
  const currentPage = filters.page ?? 1
  const pageSize = filters.pageSize ?? 50
  const first = data.results.length ? (currentPage - 1) * pageSize + 1 : 0
  const last = data.results.length
    ? Math.min(first + data.results.length - 1, data.count)
    : 0
  const setStatuses = (status: readonly ProcessStatus[]) =>
    onFilters({ situacao: 'todos', status: [...status] })

  return (
    <div className="process-list" aria-busy={isFetching || isLoading}>
      <div className="lhead">
        <div className="tt">
          <h1>{metadata.title}</h1>
          <p>{metadata.description}</p>
          {view === 'fila' && sector && (
            <p className="process-list-scope">
              Setor da fila: <strong>{PROCESS_SECTORS[sector]}</strong>
            </p>
          )}
          {view === 'responsabilidade' && responsibleBase && (
            <p className="process-list-scope">
              Setor da lista:{' '}
              <strong>{PROCESS_SECTORS[responsibleBase]}</strong>
            </p>
          )}
        </div>
      </div>
      {indicators && <ProcessIndicatorCards indicators={indicators} filtered />}
      <section
        className="panel process-list-filter-panel"
        aria-label="Filtros de processos"
      >
        <div className="process-list-toolbar">
          <label className="process-list-search">
            Buscar nesta lista
            <span className="process-list-search-control">
              <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                className="input"
                type="search"
                aria-label="Buscar nesta lista"
                value={searchValue ?? filters.q ?? ''}
                maxLength={200}
                onChange={(event) => onFilters({ q: event.target.value })}
                placeholder="Empresa, CNPJ ou protocolo"
              />
            </span>
          </label>
          <label>
            Tipo de processo
            <select
              className="input"
              aria-label="Tipo de processo"
              value={filters.tipo ?? ''}
              onChange={(event) => onFilters({ tipo: event.target.value })}
            >
              <option value="">Todos os tipos</option>
              {catalog.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Setor responsável
            <select
              className="input"
              aria-label="Setor responsável"
              value={filters.responsibleSector ?? ''}
              onChange={(event) =>
                onFilters({ responsibleSector: event.target.value })
              }
            >
              <option value="">Qualquer responsável</option>
              {Object.entries(PROCESS_SECTORS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn process-list-more-toggle"
            type="button"
            aria-expanded={moreOpen}
            aria-controls={moreId}
            onClick={() => setMoreOpen((open) => !open)}
          >
            Mais filtros{advancedCount > 0 ? ` (${advancedCount})` : ''}
            <ProcessIcon name="chev" size={14} />
          </button>
          <label>Ordenação
            <select className="input" aria-label="Ordenação" value={filters.ordering ?? 'recent'}
              onChange={event => onFilters({ ordering: event.target.value })}>
              <option value="recent">Mais recentes</option><option value="urgency">Mais urgentes</option>
            </select>
          </label>
          <label>Agrupar resultados
            <select className="input" aria-label="Agrupar resultados" value={grouping}
              onChange={event => setGrouping(event.target.value as ProcessGrouping)}>
              <option value="none">Sem agrupamento</option><option value="status">Por situação</option>
              <option value="completion">Por mês de conclusão</option><option value="overdue">Por faixa de atraso</option>
            </select>
          </label>
        </div>
        <div id={moreId} className="process-list-more" hidden={!moreOpen}>
          <label className="process-list-month">
            Mês de abertura
            <input
              className="input"
              type="month"
              value={filters.month ?? ''}
              onChange={(event) => onFilters({ month: event.target.value })}
            />
          </label>
          {view === 'todos' ? (
            <fieldset className="process-list-statuses">
              <legend>Situações personalizadas</legend>
              <p>Sem seleção, todas as situações são incluídas.</p>
              <div className="process-list-status-options">
                {Object.entries(PROCESS_STATUS_PRESENTATION).map(
                  ([key, item]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={statuses.includes(key as ProcessStatus)}
                        onChange={() =>
                          setStatuses(
                            statuses.includes(key as ProcessStatus)
                              ? statuses.filter((value) => value !== key)
                              : [...statuses, key as ProcessStatus],
                          )
                        }
                      />
                      {item.label}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
          ) : (
            <div className="process-list-status-choice">
              <b>Situações</b>
              <p>
                A lista segue o recorte “{metadata.title}”. Para escolher outras
                situações, abra Todos os processos.
              </p>
              <button
                className="btn"
                type="button"
                onClick={() => setStatuses(filters.status ?? [])}
              >
                Personalizar situações
              </button>
            </div>
          )}
        </div>
      </section>
      {hasFilters && (
        <div
          className="chips process-list-chips"
          aria-label="Filtros adicionais ativos"
        >
          {statuses.map((status) => (
            <button
              className="chip"
              type="button"
              key={status}
              onClick={() =>
                setStatuses(statuses.filter((value) => value !== status))
              }
              aria-label={`Remover filtro ${PROCESS_STATUS_PRESENTATION[status].label}`}
            >
              {PROCESS_STATUS_PRESENTATION[status].label} ×
            </button>
          ))}
          {filters.q && (
            <button
              className="chip"
              type="button"
              onClick={() => onFilters({ q: '' })}
              aria-label={`Remover busca ${filters.q}`}
            >
              Busca: {filters.q} ×
            </button>
          )}
          {filters.tipo && (
            <button
              className="chip"
              type="button"
              onClick={() => onFilters({ tipo: '' })}
              aria-label="Remover filtro de tipo"
            >
              {catalog.types.find((type) => type.id === filters.tipo)?.nome} ×
            </button>
          )}
          {filters.month && (
            <button
              className="chip"
              type="button"
              onClick={() => onFilters({ month: '' })}
              aria-label="Remover filtro de mês"
            >
              Abertura: {filters.month} ×
            </button>
          )}
          {additionalResponsible && (
            <button
              className="chip"
              type="button"
              onClick={() => onFilters({ responsibleSector: '' })}
              aria-label="Remover filtro de responsável"
            >
              Responsável: {PROCESS_SECTORS[filters.responsibleSector!]} ×
            </button>
          )}
          <button className="btn sm" type="button" onClick={onClear}>
            Limpar filtros
          </button>
        </div>
      )}
      {isLoading ? (
        <section className="panel empty" role="status">
          Carregando processos…
        </section>
      ) : (
        <>
          <p className="list-count process-list-summary" role="status">
            {data.count}{' '}
            {data.count === 1
              ? 'processo nesta lista'
              : 'processos nesta lista'}
            {isFetching && <span> · Atualizando lista…</span>}
          </p>
          {!data.results.length ? (
            <section className="panel empty">
              <h2>
                {hasFilters
                  ? 'Nenhum resultado nos filtros'
                  : 'Nenhum processo nesta lista'}
              </h2>
              <p>
                {view === 'fila'
                  ? 'Não há ação liberada para este setor. Processos aguardando liberação podem continuar sob sua responsabilidade.'
                  : hasFilters
                    ? 'Ajuste ou remova os filtros para consultar outros processos.'
                    : 'Os processos deste recorte aparecerão aqui.'}
              </p>
              {view === 'fila' && (
                <button className="btn" type="button" onClick={onWaiting}>
                  Ver aguardando liberação
                </button>
              )}
            </section>
          ) : (
            <section className="panel" aria-label="Resultados da lista">
              {grouping === 'none' ? data.results.map(row) : <>
                <p className="process-group-note">Grupos desta página · contagens apenas dos resultados exibidos</p>
                {groups.map(group => <details className="process-group" key={group.id} open>
                  <summary>{group.label} <span className="pill">{group.results.length}</span></summary>
                  {group.results.map(row)}
                </details>)}
              </>}
            </section>
          )}
          <div className="process-list-pagination">
            <p>
              Exibindo {first}–{last} de {data.count}
            </p>
            <nav
              className="process-actions"
              aria-label="Paginação de processos"
            >
              <button
                className="btn"
                type="button"
                disabled={isFetching || !data.previous}
                onClick={() =>
                  onFilters({ page: String(Math.max(1, currentPage - 1)) })
                }
              >
                Página anterior
              </button>
              <span>
                Página {currentPage} de{' '}
                {Math.max(1, Math.ceil(data.count / pageSize))}
              </span>
              <button
                className="btn"
                type="button"
                disabled={isFetching || !data.next}
                onClick={() => onFilters({ page: String(currentPage + 1) })}
              >
                Próxima página
              </button>
            </nav>
            <label>
              Por página
              <select
                className="input"
                aria-label="Processos por página"
                value={pageSize}
                onChange={(event) =>
                  onFilters({ pageSize: event.target.value })
                }
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  )
}
