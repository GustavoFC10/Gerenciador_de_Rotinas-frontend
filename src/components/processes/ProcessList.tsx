import type {
  ProcessCatalog,
  ProcessFilters,
  ProcessIndicators,
  ProcessPage,
  ProcessSector,
  ProcessStatus,
} from '../../types/processes'
import {
  PROCESS_SECTORS,
  PROCESS_STATUS_PRESENTATION,
} from '../../utils/processPresentation'
import { PROCESS_VIEWS } from '../../utils/processFilters'
import ProcessIcon from './ProcessIcon'
import ProcessSummaryRow from './ProcessSummaryRow'

interface Props {
  data: ProcessPage
  catalog: ProcessCatalog
  indicators: ProcessIndicators
  filters: ProcessFilters
  sector?: ProcessSector
  view: string
  timeZone: string
  onFilters: (patch: Record<string, string | string[]>) => void
  onClear: () => void
  onOpen: (id: string) => void
  onCreate: () => void
  onWaiting: () => void
}

export default function ProcessList({
  data,
  catalog,
  indicators,
  filters,
  sector,
  view,
  timeZone,
  onFilters,
  onClear,
  onOpen,
  onCreate,
  onWaiting,
}: Props) {
  const metadata = PROCESS_VIEWS[view] ?? PROCESS_VIEWS.todos
  const statuses = filters.status ?? []
  const hasFilters = !!(
    statuses.length ||
    filters.tipo ||
    filters.q ||
    filters.month ||
    filters.responsibleSector ||
    filters.queueSector
  )
  const setStatuses = (status: readonly ProcessStatus[]) =>
    onFilters({ situacao: 'todos', status: [...status] })
  return (
    <>
      <div className="lhead">
        <div className="tt">
          <h1>{metadata.title}</h1>
          <p>{metadata.description}</p>
        </div>
        {catalog.permissions.create && (
          <button className="btn primary" onClick={onCreate}>
            <ProcessIcon name="plus" size={16} />
            Novo processo
          </button>
        )}
      </div>
      <p className="meta">
        Indicadores de todos os resultados dos filtros atuais.
      </p>
      <div className="scards">
        {[
          ['Total', indicators.total],
          ['Abertos', indicators.active],
          ['Aguardando liberação', indicators.waiting],
          ['Atrasados', indicators.late],
        ].map(([label, value]) => (
          <div className="scard" key={label}>
            <span>{label}</span>
            <b className="num">{value}</b>
          </div>
        ))}
      </div>
      <div className="filters">
        <label className="search">
          <span className="sr-only">Buscar nesta lista</span>
          <input
            type="search"
            value={filters.q ?? ''}
            onChange={(event) => onFilters({ q: event.target.value })}
            placeholder="Buscar empresa, CNPJ ou protocolo"
          />
        </label>
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
        <select
          className="input"
          aria-label="Setor responsável"
          value={filters.responsibleSector ?? ''}
          onChange={(event) =>
            onFilters({
              responsibleSector: event.target.value,
              ...(view === 'responsabilidade' ? { situacao: 'todos' } : {}),
            })
          }
        >
          <option value="">Qualquer responsável</option>
          {Object.entries(PROCESS_SECTORS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label>
          Mês de abertura
          <input
            className="input"
            type="month"
            value={filters.month ?? ''}
            onChange={(event) => onFilters({ month: event.target.value })}
          />
        </label>
        <label>
          Situações
          <select
            className="input"
            multiple
            aria-label="Situações"
            value={[...statuses]}
            onChange={(event) =>
              setStatuses(
                [...event.target.selectedOptions].map(
                  (option) => option.value as ProcessStatus,
                ),
              )
            }
          >
            {Object.entries(PROCESS_STATUS_PRESENTATION).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hasFilters && (
        <div className="chips" aria-label="Filtros ativos">
          {statuses.map((status) => (
            <button
              className="chip"
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
            <button className="chip" onClick={() => onFilters({ q: '' })}>
              Busca: {filters.q} ×
            </button>
          )}
          {filters.tipo && (
            <button className="chip" onClick={() => onFilters({ tipo: '' })}>
              {catalog.types.find((type) => type.id === filters.tipo)?.nome} ×
            </button>
          )}
          {filters.month && (
            <button className="chip" onClick={() => onFilters({ month: '' })}>
              Abertura: {filters.month} ×
            </button>
          )}
          {filters.responsibleSector && (
            <button
              className="chip"
              onClick={() =>
                onFilters({
                  responsibleSector: '',
                  ...(view === 'responsabilidade' ? { situacao: 'todos' } : {}),
                })
              }
            >
              Responsável: {PROCESS_SECTORS[filters.responsibleSector]} ×
            </button>
          )}
          {filters.queueSector && (
            <span className="chip">
              Fila: {PROCESS_SECTORS[filters.queueSector]}{' '}
              <button aria-label="Remover filtro de fila" onClick={onClear}>
                ×
              </button>
            </span>
          )}
          <button className="chip" onClick={onClear}>
            Limpar filtros
          </button>
        </div>
      )}
      <p className="list-count" role="status">
        {data.count}{' '}
        {data.count === 1 ? 'processo encontrado' : 'processos encontrados'} ·
        página {filters.page ?? 1}
      </p>
      {!data.results.length ? (
        <section className="panel empty">
          <h2>
            {hasFilters
              ? 'Nenhum resultado nos filtros'
              : 'Nenhum processo cadastrado'}
          </h2>
          <p>
            {view === 'fila'
              ? 'Não há ação liberada para este setor. Processos aguardando liberação podem continuar sob sua responsabilidade.'
              : hasFilters
                ? 'Ajuste ou remova os filtros para consultar outros processos.'
                : 'Os processos cadastrados aparecerão aqui.'}
          </p>
          {view === 'fila' && (
            <button className="btn" onClick={onWaiting}>
              Ver aguardando liberação
            </button>
          )}
          {hasFilters && (
            <button className="btn" onClick={onClear}>
              Limpar filtros
            </button>
          )}
        </section>
      ) : (
        <section className="panel">
          {data.results.map((process) => (
            <ProcessSummaryRow
              key={process.id}
              {...{ process, catalog, onOpen, sector, timeZone }}
            />
          ))}
        </section>
      )}
      <nav className="process-actions" aria-label="Paginação de processos">
        <button
          className="btn"
          disabled={!data.previous}
          onClick={() =>
            onFilters({ page: String(Math.max(1, (filters.page ?? 1) - 1)) })
          }
        >
          Página anterior
        </button>
        <span>
          Página {filters.page ?? 1} de{' '}
          {Math.max(1, Math.ceil(data.count / (filters.pageSize ?? 50)))}
        </span>
        <button
          className="btn"
          disabled={!data.next}
          onClick={() => onFilters({ page: String((filters.page ?? 1) + 1) })}
        >
          Próxima página
        </button>
        <label>
          Por página{' '}
          <select
            className="input"
            aria-label="Processos por página"
            value={filters.pageSize ?? 50}
            onChange={(event) => onFilters({ pageSize: event.target.value })}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </label>
      </nav>
    </>
  )
}
