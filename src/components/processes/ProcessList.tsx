import { useState } from 'react'
import type {
  ProcessCatalog,
  ProcessResource,
  ProcessSector,
} from '../../types/processes'
import { normalizeSearch } from '../../utils/normalizeSearch'
import {
  PROCESS_SECTORS,
  monthLabel,
  processAge,
  processDaysLate,
  processDaysUntilDue,
  processMonth,
} from '../../utils/processPresentation'
import { PROCESS_VIEWS, inProcessView } from '../../utils/processFilters'
import ProcessIcon from './ProcessIcon'
import ProcessSummaryRow from './ProcessSummaryRow'

interface Props {
  processes: ProcessResource[]
  catalog: ProcessCatalog
  sector?: ProcessSector
  view: string
  type: string
  search: string
  timeZone: string
  onSearch: (value: string) => void
  onType: (value: string) => void
  onOpen: (id: string) => void
  onCreate: () => void
}

export default function ProcessList({
  processes,
  catalog,
  sector,
  view,
  type,
  search,
  timeZone,
  onSearch,
  onType,
  onOpen,
  onCreate,
}: Props) {
  const [pendingSector, setPendingSector] = useState('')
  const [collapsed, setCollapsed] = useState(new Set<string>(['encerrados']))
  const metadata = PROCESS_VIEWS[view] ?? PROCESS_VIEWS.todos
  const scope = processes.filter(
    (process) =>
      inProcessView(process, view, sector) &&
      (!pendingSector ||
        process.analysis.pendingSectors.includes(
          pendingSector as ProcessSector,
        )),
  )
  const query = normalizeSearch(search.trim())
  const list = scope.filter(
    (process) =>
      (!type || process.tipo === type) &&
      (!query ||
        normalizeSearch(
          [process.empresa, process.cnpj, process.codigo, process.protocolo]
            .filter(Boolean)
            .join(' '),
        ).includes(query) ||
        (query.replace(/\D/g, '').length >= 3 &&
          (process.cnpj ?? '')
            .replace(/\D/g, '')
            .includes(query.replace(/\D/g, '')))),
  )
  const stats = scope.filter((process) => !type || process.tipo === type)
  const late = stats.filter((process) => process.analysis.late)
  const active = stats.filter((process) => process.status === 'andamento')
  const month = processMonth(timeZone)
  const lateDays = late.map((process) => processDaysLate(process, timeZone))
  const completed = stats.filter((process) => process.status === 'concluido')
  const dueSoon = active.filter((process) => {
    const days = processDaysUntilDue(process, timeZone)
    return days != null && days >= 0 && days <= 7
  })
  const departmentBreakdown = (label: string, items: ProcessResource[]) => (
    <div className="scard">
      <span>{label}</span>
      <div className="dsplit">
        {(Object.keys(PROCESS_SECTORS) as ProcessSector[]).map((key) => (
          <div key={key}>
            <span className={`dot ${key}`} />
            {PROCESS_SECTORS[key]}
            <em className="num">
              {
                items.filter((process) =>
                  process.analysis.pendingSectors.includes(key),
                ).length
              }
            </em>
          </div>
        ))}
      </div>
    </div>
  )
  const metric = (
    label: string,
    value: number | string,
    description: string,
    tone = '',
  ) => (
    <div className={`scard ${tone}`}>
      <span>{label}</span>
      <b className="num">{value}</b>
      <small>{description}</small>
    </div>
  )
  const groups: Array<{
    id: string
    title: string
    tone: string
    items: ProcessResource[]
  }> =
    view === 'atrasados'
      ? [
          {
            id: 'g30',
            title: 'Mais de 30 dias de atraso',
            tone: 'error',
            items: list.filter(
              (process) => processDaysLate(process, timeZone) > 30,
            ),
          },
          {
            id: 'g8',
            title: 'De 8 a 30 dias',
            tone: 'error',
            items: list.filter(
              (process) =>
                processDaysLate(process, timeZone) >= 8 &&
                processDaysLate(process, timeZone) <= 30,
            ),
          },
          {
            id: 'g7',
            title: 'Até 7 dias',
            tone: 'progress',
            items: list.filter(
              (process) => processDaysLate(process, timeZone) < 8,
            ),
          },
        ]
      : view === 'concluidos'
        ? [
            ...new Set(
              list.map((process) =>
                processMonth(timeZone, new Date(process.concluidoEm!)),
              ),
            ),
          ]
            .sort()
            .reverse()
            .map((key) => ({
              id: key,
              title: monthLabel(key),
              tone: 'completed',
              items: list.filter(
                (process) =>
                  processMonth(timeZone, new Date(process.concluidoEm!)) ===
                  key,
              ),
            }))
        : [
            {
              id: 'atrasados',
              title: 'Atrasados',
              tone: 'error',
              items: list.filter((process) => process.analysis.late),
            },
            {
              id: 'andamento',
              title: 'Em andamento',
              tone: 'progress',
              items: list.filter(
                (process) =>
                  process.status === 'andamento' &&
                  !process.analysis.late &&
                  !process.analysis.waiting,
              ),
            },
            {
              id: 'agendados',
              title: 'Agendados · aguardando a data da próxima etapa',
              tone: 'scheduled',
              items: list
                .filter((process) => process.analysis.waiting)
                .sort((a, b) =>
                  (a.analysis.releaseDate ?? '').localeCompare(
                    b.analysis.releaseDate ?? '',
                  ),
                ),
            },
            {
              id: 'concluidos',
              title: 'Concluídos',
              tone: 'completed',
              items: list.filter((process) => process.status === 'concluido'),
            },
            {
              id: 'encerrados',
              title: 'Cancelados',
              tone: 'pending',
              items: list.filter((process) => process.status === 'cancelado'),
            },
          ]

  return (
    <>
      <div className="lhead">
        <div className="tt">
          <h1>{metadata.title}</h1>
          <p>
            {view === 'fila' && sector
              ? `Processos com tarefa do ${PROCESS_SECTORS[sector]} na etapa atual.`
              : metadata.description}
          </p>
        </div>
        {catalog.permissions.create && (
          <button className="btn primary" onClick={onCreate}>
            <ProcessIcon name="plus" size={16} />
            Novo processo
          </button>
        )}
      </div>
      <div className="scards">
        {view === 'atrasados' ? (
          <>
            {metric(
              'Atrasados',
              late.length,
              'processos com prazo vencido',
              'error',
            )}
            {metric(
              'Atraso médio',
              lateDays.length
                ? `${Math.round(lateDays.reduce((sum, days) => sum + days, 0) / lateDays.length)} d`
                : '—',
              'desde o vencimento',
            )}
            {metric(
              'Maior atraso',
              lateDays.length ? `${Math.max(...lateDays)} d` : '—',
              'processo mais antigo',
            )}
            {departmentBreakdown('Travados em', late)}
          </>
        ) : view === 'concluidos' ? (
          <>
            {metric(
              'Concluídos no mês',
              completed.filter(
                (process) =>
                  processMonth(timeZone, new Date(process.concluidoEm!)) ===
                  month,
              ).length,
              monthLabel(month),
              'completed',
            )}
            {metric(
              'Concluídos no ano',
              completed.filter((process) =>
                processMonth(
                  timeZone,
                  new Date(process.concluidoEm!),
                ).startsWith(month.slice(0, 4)),
              ).length,
              month.slice(0, 4),
            )}
            {metric(
              'Tempo médio',
              completed.length
                ? `${Math.round(completed.reduce((sum, process) => sum + processAge(process), 0) / completed.length)} d`
                : '—',
              'da abertura à conclusão',
            )}
            {metric('Total concluído', completed.length, 'desde o início')}
          </>
        ) : view === 'ativos' || view === 'fila' ? (
          <>
            {metric(
              view === 'fila'
                ? `Aguardando ${sector ? PROCESS_SECTORS[sector] : 'seu setor'}`
                : 'Em andamento',
              active.length,
              view === 'fila'
                ? 'tarefas do seu setor na etapa atual'
                : 'processos abertos',
            )}
            {metric(
              'Atrasados',
              late.length,
              'prazo vencido',
              late.length ? 'error' : '',
            )}
            {metric(
              'Vencem em 7 dias',
              dueSoon.length,
              'atenção ao prazo',
              dueSoon.length ? 'progress' : '',
            )}
            {view === 'ativos' &&
              departmentBreakdown('Pendências por setor', active)}
          </>
        ) : view === 'encerrados' ? (
          metric('Cancelados', stats.length, 'podem ser reabertos')
        ) : (
          <>
            {metric(
              view === 'fila' ? 'Aguardando seu setor' : 'Total',
              stats.length,
              'processos nesta situação',
            )}
            {metric('Em andamento', active.length, 'abertos agora', 'progress')}
            {metric(
              'Atrasados',
              late.length,
              'prazo vencido',
              late.length ? 'error' : '',
            )}
            {metric(
              view === 'agendados' ? 'Agendados' : 'Concluídos',
              view === 'agendados'
                ? stats.filter((process) => process.analysis.waiting).length
                : completed.length,
              view === 'agendados'
                ? 'aguardando a próxima etapa'
                : 'finalizados',
            )}
          </>
        )}
      </div>
      <div className="chips" role="group" aria-label="Tipo de processo">
        <button
          className="chip"
          aria-pressed={!type}
          onClick={() => onType('')}
        >
          Todos os tipos<span className="n">{scope.length}</span>
        </button>
        {catalog.types.map((item) => (
          <button
            key={item.id}
            className="chip"
            aria-pressed={type === item.id}
            onClick={() => onType(item.id)}
          >
            <ProcessIcon name={item.icon} size={16} />
            {item.nome}
            <span className="n">
              {scope.filter((process) => process.tipo === item.id).length}
            </span>
          </button>
        ))}
      </div>
      <div className="filters">
        <label className="search">
          <span className="sr-only">Buscar nesta lista</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar empresa, CNPJ ou protocolo nesta lista"
          />
        </label>
        {view !== 'fila' && (
          <select
            className="input"
            aria-label="Pendente com"
            value={pendingSector}
            onChange={(event) => setPendingSector(event.target.value)}
          >
            <option value="">Qualquer departamento</option>
            {catalog.permissions.executeSectors.map((key) => (
              <option key={key} value={key}>
                Pendente com {PROCESS_SECTORS[key]}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="list-count" role="status">
        {list.length}{' '}
        {list.length === 1 ? 'processo encontrado' : 'processos encontrados'}
      </p>
      {!list.length ? (
        <section className="panel">
          <div className="empty">
            <div className="ico-sq">
              <ProcessIcon name="check" />
            </div>
            <h3>
              {view === 'fila' ? 'Tudo em dia' : 'Nenhum processo encontrado'}
            </h3>
            <p>
              {query || type || pendingSector
                ? 'Ajuste os filtros para encontrar outros processos.'
                : 'Os processos desta situação aparecerão aqui.'}
            </p>
            {(query || type || pendingSector) && (
              <button
                className="btn"
                onClick={() => {
                  onSearch('')
                  onType('')
                  setPendingSector('')
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </section>
      ) : (
        groups
          .filter((group) => group.items.length)
          .map((group) => (
            <section key={group.id} className={`panel lgroup ${group.tone}`}>
              <button
                className="group-h"
                aria-expanded={!collapsed.has(group.id)}
                onClick={() =>
                  setCollapsed((current) => {
                    const next = new Set(current)
                    if (next.has(group.id)) next.delete(group.id)
                    else next.add(group.id)
                    return next
                  })
                }
              >
                <ProcessIcon
                  name={collapsed.has(group.id) ? 'chevr' : 'chev'}
                  size={16}
                />
                <span className={`dot group-dot ${group.tone}`} />
                <h2>{group.title}</h2>
                <span className="pill">{group.items.length}</span>
              </button>
              {!collapsed.has(group.id) &&
                [...group.items]
                  .sort((a, b) =>
                    group.id === 'concluidos' || view === 'concluidos'
                      ? (b.concluidoEm ?? '').localeCompare(a.concluidoEm ?? '')
                      : (a.prazo ?? '9').localeCompare(b.prazo ?? '9') ||
                        b.atualizadoEm.localeCompare(a.atualizadoEm),
                  )
                  .map((process) => (
                    <ProcessSummaryRow
                      key={process.id}
                      {...{ process, catalog, onOpen, sector, timeZone }}
                    />
                  ))}
            </section>
          ))
      )}
    </>
  )
}
