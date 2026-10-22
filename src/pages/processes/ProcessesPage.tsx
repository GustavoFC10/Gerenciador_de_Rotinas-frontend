import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ProcessDetails from '../../components/processes/ProcessDetails'
import PrivateImage from '../../components/files/PrivateImage'
import ProcessForm from '../../components/processes/ProcessForm'
import ProcessIcon from '../../components/processes/ProcessIcon'
import ProcessList from '../../components/processes/ProcessList'
import { PROCESS_VIEWS } from '../../utils/processFilters'
import ProcessMovements from '../../components/processes/ProcessMovements'
import ProcessOverview from '../../components/processes/ProcessOverview'
import { changedProcessFields } from '../../components/processes/processFormUtils'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import { processQueryKeys } from '../../query/processQueryKeys'
import { isApiError } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type {
  ProcessCreateInput,
  ProcessIndicators,
  ProcessResource,
  ProcessSector,
  ProcessTypeId,
} from '../../types/processes'
import { getErrorPresentation } from '../../utils/apiErrors'
import { PROCESS_SECTORS, processMonth } from '../../utils/processPresentation'
import '../../styles/processes.css'

const emptyIndicators: ProcessIndicators = {
  total: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
  late: 0,
  waiting: 0,
  bySector: {},
  byType: {},
}

export default function ProcessesPage() {
  const { activeMembership, logout } = useAuth()
  const { notify } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const scope = useMemo(
    () => ({
      organizationId: activeMembership!.organization.id,
      membershipId: activeMembership!.id,
    }),
    [activeMembership],
  )
  const timeZone =
    activeMembership!.organization.timezone || 'America/Sao_Paulo'
  const [sector, setSector] = useState<ProcessSector>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [departmentMenu, setDepartmentMenu] = useState(false)
  const [processMenu, setProcessMenu] = useState(true)
  const [form, setForm] = useState<'create' | 'edit' | null>(null)
  const [editingResource, setEditingResource] =
    useState<ProcessResource | null>(null)
  const [initialType, setInitialType] = useState<ProcessTypeId>()
  const [isLeaving, setIsLeaving] = useState(false)
  const createKey = useRef('')
  const navigationRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const page = location.pathname
    .slice(ROUTES.PROCESSES.length)
    .replace(/^\/+|\/+$/g, '')
  const processId =
    page && !['lista', 'fila', 'movimentacoes'].includes(page) ? page : ''
  const requestedView =
    page === 'fila' ? 'fila' : (searchParams.get('situacao') ?? 'ativos')
  const view = PROCESS_VIEWS[requestedView] ? requestedView : 'ativos'
  const type = searchParams.get('tipo') ?? ''
  const search = searchParams.get('q') ?? ''
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.get('mes') ?? '')
    ? searchParams.get('mes')!
    : processMonth(timeZone)
  const catalogQuery = useQuery({
    queryKey: processQueryKeys.catalog(scope),
    queryFn: ({ signal }) =>
      processService.catalog(signal).then((response) => response.data),
    refetchOnWindowFocus: true,
  })
  const listQuery = useQuery({
    queryKey: processQueryKeys.list(scope),
    queryFn: ({ signal }) => processService.listAll({}, signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  const indicatorsQuery = useQuery({
    queryKey: processQueryKeys.indicators(scope),
    queryFn: ({ signal }) =>
      processService.indicators({}, signal).then((response) => response.data),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  const detailQuery = useQuery({
    queryKey: processQueryKeys.detail(scope, processId),
    queryFn: ({ signal }) =>
      processService.get(processId, signal).then((response) => response.data),
    enabled: !!processId,
    refetchOnWindowFocus: true,
  })
  const catalog = catalogQuery.data
  const detailUnavailable =
    isApiError(detailQuery.error) &&
    [403, 404].includes(detailQuery.error.status)
  const processes = listQuery.data ?? []
  const indicators = indicatorsQuery.data ?? emptyIndicators
  const allowedSectors = catalog?.permissions.executeSectors ?? []
  const chosenSector =
    sector && allowedSectors.includes(sector) ? sector : allowedSectors[0]

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])
  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    const returnTarget = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = [
        ...(navigationRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled])',
        ) ?? []),
      ].filter((item) => item.getClientRects().length > 0)
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) return
      if (
        !navigationRef.current?.contains(document.activeElement) ||
        (!event.shiftKey && document.activeElement === last) ||
        (event.shiftKey && document.activeElement === first)
      ) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      returnTarget?.focus()
    }
  }, [menuOpen])

  function updateSearch(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }
  function openList(nextView: string, nextType = '') {
    const params = new URLSearchParams()
    if (nextView !== 'fila') params.set('situacao', nextView)
    if (nextType) params.set('tipo', nextType)
    navigate(
      `${ROUTES.PROCESSES}/${nextView === 'fila' ? 'fila' : 'lista'}${params.size ? `?${params}` : ''}`,
    )
  }
  function openProcess(id: string) {
    navigate(`${ROUTES.PROCESSES}/${encodeURIComponent(id)}`, {
      state: { processBack: `${location.pathname}${location.search}` },
    })
  }
  function closeProcess() {
    const back = (location.state as { processBack?: unknown } | null)
      ?.processBack
    navigate(
      typeof back === 'string' &&
        (back === ROUTES.PROCESSES ||
          back.startsWith(`${ROUTES.PROCESSES}/lista`) ||
          back.startsWith(`${ROUTES.PROCESSES}/fila`) ||
          back.startsWith(`${ROUTES.PROCESSES}/movimentacoes`))
        ? back
        : ROUTES.PROCESSES,
    )
  }
  function changed(process: ProcessResource) {
    queryClient.setQueryData(
      processQueryKeys.detail(scope, process.id),
      process,
    )
    queryClient.setQueryData<ProcessResource[]>(
      processQueryKeys.list(scope),
      (current) =>
        current?.some((item) => item.id === process.id)
          ? current.map((item) => (item.id === process.id ? process : item))
          : current
            ? [...current, process]
            : [process],
    )
    void queryClient.invalidateQueries({
      queryKey: processQueryKeys.root(scope),
    })
  }
  function openCreate() {
    createKey.current = crypto.randomUUID()
    setInitialType(catalog?.types.find((item) => item.id === type)?.id)
    setForm('create')
  }
  async function submit(input: ProcessCreateInput) {
    if (form === 'edit' && editingResource) {
      const original = editingResource
      const patch = changedProcessFields(input, original)
      if (!Object.keys(patch).length) {
        setForm(null)
        return
      }
      try {
        const response = await processService.update(original.id, {
          ...patch,
          version: original.version,
        })
        changed(response.data)
        setForm(null)
        notify({ tone: 'success', title: 'Alterações salvas' })
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          await detailQuery.refetch()
          setForm(null)
          notify({
            tone: 'warning',
            title: 'O processo foi atualizado',
            message:
              'Revise os dados atuais e abra a edição novamente para aplicar suas alterações.',
          })
        }
        throw error
      }
      return
    }
    const response = await processService.create(input, createKey.current)
    changed(response.data)
    setForm(null)
    openProcess(response.data.id)
    notify({
      tone: 'success',
      title: 'Processo aberto',
      message:
        'As notificações de abertura foram registradas. Acompanhe o estado dos envios no processo.',
    })
  }
  async function remove() {
    if (!detailQuery.data) return
    await processService.remove(detailQuery.data.id, detailQuery.data.version)
    queryClient.removeQueries({
      queryKey: processQueryKeys.detail(scope, detailQuery.data.id),
    })
    await queryClient.invalidateQueries({
      queryKey: processQueryKeys.root(scope),
    })
    closeProcess()
    notify({
      tone: 'success',
      title: 'Processo excluído',
      message: 'O histórico permanece preservado no sistema.',
    })
  }
  async function leave() {
    setIsLeaving(true)
    try {
      await logout()
    } catch (error) {
      notify({
        tone: 'error',
        title: 'Não foi possível sair',
        message: getErrorPresentation(error).message,
      })
      setIsLeaving(false)
    }
  }
  const mainError =
    catalogQuery.error ??
    (!processId && page !== 'movimentacoes'
      ? (listQuery.error ?? indicatorsQuery.error)
      : null)

  return (
    <div className={`processes-module ${menuOpen ? 'nav-open' : ''}`}>
      <a href="#processes-main" className="process-skip">
        Ir para o conteúdo
      </a>
      {menuOpen && (
        <div
          className="scrim process-nav-scrim"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        ref={navigationRef}
        className="side"
        aria-label="Navegação de Processos"
        aria-modal={menuOpen ? true : undefined}
        role={menuOpen ? 'dialog' : undefined}
      >
        <div className="process-side-header">
          <Link className="side-head" to={ROUTES.PROCESSES}>
            <span className="logo">
              <ProcessIcon name="list" />
            </span>
            <span>
              <b>Processos</b>
              <small>{activeMembership!.organization.name}</small>
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            className="menu-btn"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          >
            <ProcessIcon name="x" />
          </button>
        </div>
        <div className="side-scroll">
          <section>
            <nav>
              <Link className="nav-i" to={ROUTES.HUB}>
                <ProcessIcon name="swap" />
                Trocar módulo
              </Link>
              <Link
                className="nav-i"
                aria-current={!page ? 'page' : undefined}
                to={ROUTES.PROCESSES}
              >
                <ProcessIcon name="home" />
                Início
              </Link>
              <button
                className="nav-i"
                aria-current={page === 'fila' ? 'page' : undefined}
                onClick={() => openList('fila')}
              >
                <ProcessIcon name="inbox" />
                Minha fila
                {chosenSector && (
                  <span className="ct">
                    {indicators.bySector[chosenSector] ?? 0}
                  </span>
                )}
              </button>
            </nav>
          </section>
          <section>
            <h2 className="sec-t">Meu departamento</h2>
            <button
              className="dept-card"
              aria-expanded={departmentMenu}
              onClick={() => setDepartmentMenu((current) => !current)}
            >
              <span className="ico">
                <ProcessIcon name="users" />
              </span>
              <span>
                <b>
                  {chosenSector
                    ? PROCESS_SECTORS[chosenSector]
                    : 'Sem setor disponível'}
                </b>
                <small>
                  {chosenSector
                    ? `${indicators.bySector[chosenSector] ?? 0} processos aguardando`
                    : 'Consulte seus acessos'}
                </small>
              </span>
              <span className="chev">
                <ProcessIcon
                  name={departmentMenu ? 'chev' : 'chevr'}
                  size={16}
                />
              </span>
            </button>
            {departmentMenu && (
              <div
                className="dept-menu"
                role="group"
                aria-label="Departamento ativo"
              >
                {allowedSectors.map((key) => (
                  <button
                    key={key}
                    aria-pressed={chosenSector === key}
                    onClick={() => {
                      setSector(key)
                      setDepartmentMenu(false)
                    }}
                  >
                    <span className={`dot ${key}`} />
                    {PROCESS_SECTORS[key]}
                  </button>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="sec-t">Listagens</h2>
            <nav>
              <button
                className="nav-i nav-parent"
                aria-expanded={processMenu}
                onClick={() => setProcessMenu((current) => !current)}
              >
                <ProcessIcon name="list" />
                Processos
                <span className="cv">
                  <ProcessIcon name="chev" size={16} />
                </span>
              </button>
              {processMenu && (
                <div className="subnav">
                  {(
                    [
                      'ativos',
                      'atrasados',
                      'agendados',
                      'concluidos',
                      'encerrados',
                      'todos',
                    ] as const
                  ).map((key) => (
                    <button
                      key={key}
                      className="sub-i"
                      aria-current={
                        page === 'lista' && view === key ? 'page' : undefined
                      }
                      onClick={() => openList(key)}
                    >
                      <span className={`dot process-view-${key}`} />
                      {PROCESS_VIEWS[key].title}
                      <span
                        className={`ct ${key === 'atrasados' && indicators.late ? 'err' : ''}`}
                      >
                        {
                          {
                            ativos: indicators.active,
                            atrasados: indicators.late,
                            agendados: indicators.waiting,
                            concluidos: indicators.completed,
                            encerrados: indicators.cancelled,
                            todos: indicators.total,
                          }[key]
                        }
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </nav>
          </section>
          {catalog?.permissions.viewMovements && (
            <section>
              <h2 className="sec-t">Gestão</h2>
              <Link
                className="nav-i"
                aria-current={page === 'movimentacoes' ? 'page' : undefined}
                to={`${ROUTES.PROCESSES}/movimentacoes`}
              >
                <ProcessIcon name="chart" />
                Movimentações Empresariais
              </Link>
            </section>
          )}
        </div>
        <div className="side-foot">
          <Link
            className="user"
            to={ROUTES.HUB_PROFILE}
            aria-label={`Abrir perfil de ${activeMembership!.displayName}`}
          >
            {activeMembership!.avatar ? (
              <PrivateImage
                reference={activeMembership!.avatar}
                label={activeMembership!.displayName}
                className="size-9"
              />
            ) : (
              <span className="avatar">
                {activeMembership!.displayName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join('')}
              </span>
            )}
            <span>
              <b>{activeMembership!.displayName}</b>
              <small>
                {chosenSector ? PROCESS_SECTORS[chosenSector] : 'Processos'}
              </small>
            </span>
          </Link>
          <button
            className="nav-i sm"
            onClick={() => void leave()}
            disabled={isLeaving}
          >
            <ProcessIcon name="out" size={16} />
            {isLeaving ? 'Saindo…' : 'Sair da conta'}
          </button>
        </div>
      </aside>
      <div className="shell">
        <header className="top">
          <button
            ref={menuButtonRef}
            className="menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
          >
            <ProcessIcon name="list" />
          </button>
          <label className="search">
            <span className="sr-only">Buscar processo</span>
            <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                const value = event.target.value
                if (page !== 'lista') {
                  navigate(
                    `${ROUTES.PROCESSES}/lista?situacao=todos&q=${encodeURIComponent(value)}`,
                    { replace: true },
                  )
                } else updateSearch({ q: value })
              }}
              placeholder="Buscar empresa, CNPJ ou protocolo"
            />
          </label>
          <span className="sp" />
          <button
            className="btn process-refresh"
            disabled={listQuery.isFetching || catalogQuery.isFetching}
            onClick={() =>
              void queryClient.invalidateQueries({
                queryKey: processQueryKeys.root(scope),
              })
            }
            aria-label="Atualizar processos"
            title="Atualizar processos"
          >
            <ProcessIcon name="refresh" size={16} />
          </button>
          {catalog?.permissions.create && (
            <button
              className="btn primary"
              onClick={openCreate}
              aria-label="Novo processo"
            >
              <ProcessIcon name="plus" />
              <span>Novo processo</span>
            </button>
          )}
        </header>
        <main
          id="processes-main"
          tabIndex={-1}
          aria-busy={
            catalogQuery.isPending || (!!processId && detailQuery.isPending)
          }
        >
          {mainError ? (
            <div className="panel empty" role="alert">
              <h1>Não foi possível carregar Processos</h1>
              <p>{getErrorPresentation(mainError).message}</p>
              <button
                className="btn primary"
                onClick={() =>
                  void queryClient.invalidateQueries({
                    queryKey: processQueryKeys.root(scope),
                  })
                }
              >
                Tentar novamente
              </button>
            </div>
          ) : !catalog ||
            (!processId &&
              page !== 'movimentacoes' &&
              (listQuery.isPending || indicatorsQuery.isPending)) ? (
            <div className="panel empty" role="status">
              Carregando processos…
            </div>
          ) : processId ? (
            detailQuery.data && !detailUnavailable ? (
              <ProcessDetails
                key={processId}
                process={detailQuery.data}
                catalog={catalog}
                timeZone={timeZone}
                onChange={changed}
                onClose={closeProcess}
                onEdit={() => {
                  setEditingResource(detailQuery.data!)
                  setForm('edit')
                }}
                onDelete={remove}
              />
            ) : detailQuery.error ? (
              <div className="panel empty" role="alert">
                <h1>Processo indisponível</h1>
                <p>{getErrorPresentation(detailQuery.error).message}</p>
                <div className="process-actions">
                  <button className="btn" onClick={closeProcess}>
                    Voltar
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => void detailQuery.refetch()}
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel empty" role="status">
                Carregando processo…
              </div>
            )
          ) : page === 'movimentacoes' ? (
            catalog.permissions.viewMovements ? (
              <ProcessMovements
                scope={scope}
                catalog={catalog}
                month={month}
                authorName={activeMembership!.displayName}
                onMonth={(value) => updateSearch({ mes: value })}
                onOpen={openProcess}
              />
            ) : (
              <div className="panel empty">
                <h1>Acesso restrito</h1>
                <p>
                  Movimentações disponíveis para a Diretoria e o Financeiro.
                </p>
                <Link className="btn" to={ROUTES.PROCESSES}>
                  Voltar ao início
                </Link>
              </div>
            )
          ) : page === 'lista' || page === 'fila' ? (
            <ProcessList
              key={`${view}:${chosenSector ?? ''}`}
              processes={processes}
              catalog={catalog}
              sector={chosenSector}
              view={view}
              type={type}
              search={search}
              timeZone={timeZone}
              onSearch={(value) => updateSearch({ q: value })}
              onType={(value) => updateSearch({ tipo: value })}
              onOpen={openProcess}
              onCreate={openCreate}
            />
          ) : (
            <ProcessOverview
              processes={processes}
              catalog={catalog}
              indicators={indicators}
              sector={chosenSector}
              timeZone={timeZone}
              onOpen={openProcess}
              onList={openList}
              onSector={setSector}
              onCreate={openCreate}
            />
          )}
        </main>
      </div>
      {form &&
        !detailUnavailable &&
        catalog &&
        (form !== 'edit' || editingResource) && (
          <ProcessForm
            key={form === 'edit' ? editingResource!.id : createKey.current}
            catalog={catalog}
            process={form === 'edit' ? editingResource! : undefined}
            initialType={initialType}
            onSubmit={submit}
            onClose={() => setForm(null)}
          />
        )}
    </div>
  )
}
