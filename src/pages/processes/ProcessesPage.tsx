import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import ProcessDetails from '../../components/processes/ProcessDetails'
import PrivateImage from '../../components/files/PrivateImage'
import ProcessForm from '../../components/processes/ProcessForm'
import ProcessIcon from '../../components/processes/ProcessIcon'
import ProcessList from '../../components/processes/ProcessList'
import { PROCESS_VIEWS, processViewFilters } from '../../utils/processFilters'
import ProcessMovements from '../../components/processes/ProcessMovements'
import ProcessOverview from '../../components/processes/ProcessOverview'
import ProcessAlerts from '../../components/processes/ProcessAlerts'
import ProcessFollowUps from '../../components/processes/ProcessFollowUps'
import { useProcessAlerts } from '../../hooks/useProcessCommunications'
import ProcessPageError from '../../components/processes/ProcessQueryError'
import { changedProcessFields } from '../../components/processes/processFormUtils'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import {
  useProcessCatalog,
  useProcessList,
  useProcessIndicators,
  useProcessDetail,
  useProcessLeggacyMetrics,
} from '../../hooks/useProcessQueries'
import {
  processQueryKeys,
  normalizeProcessFilters,
} from '../../query/processQueryKeys'
import { isApiError } from '../../services/httpClient'
import { processService } from '../../services/processService'
import { ProcessContractError } from '../../services/processContract'
import type {
  ProcessCreateInput,
  ProcessFilters,
  ProcessIndicators,
  ProcessPage,
  ProcessResource,
  ProcessSector,
  ProcessTypeId,
  ProcessStatus,
} from '../../types/processes'
import { getErrorPresentation } from '../../utils/apiErrors'
import {
  PROCESS_SECTORS,
  processMonth,
  processVersionFromEtag,
} from '../../utils/processPresentation'
import '../../styles/processes.css'

const emptyIndicators: ProcessIndicators = {
  total: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
  late: 0,
  waiting: 0,
  dueSoon: 0,
  completedThisMonth: 0,
  completedThisYear: 0,
  averageOverdueDays: null,
  maxOverdueDays: null,
  averageCompletionDays: null,
  averageOpenAgeDays: null,
  bySector: {},
  byType: {},
  byStatus: {
    andamento: 0,
    agendado: 0,
    atrasado: 0,
    concluido: 0,
    cancelado: 0,
  },
}
const loadingPage: ProcessPage = {
  count: 0,
  next: null,
  previous: null,
  results: [],
}

export default function ProcessesPage() {
  const { activeMembership, logout, refreshSession } = useAuth()
  const { notify, dismiss } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const organizationId = activeMembership!.organization.id
  const membershipId = activeMembership!.id
  const scope = useMemo(
    () => ({
      organizationId,
      membershipId,
    }),
    [organizationId, membershipId],
  )
  const activeScope = useRef<typeof scope | null>(scope)
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
  const [deniedDetail, setDeniedDetail] = useState<{
    key: string
    error: unknown
  } | null>(null)
  const [scopeDenial, setScopeDenial] = useState<{
    key: string
    error: unknown
  } | null>(null)
  const [formAccess, setFormAccess] = useState('')
  const [alertDenial, setAlertDenial] = useState<{
    key: string
    error: unknown
  } | null>(null)
  const createKey = useRef('')
  const createAttempt = useRef<{ body: string; key: string } | null>(null)
  const undoNotifications = useRef(new Set<string>())
  const deletedDetailContext = useRef<string | null>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const restoredListLocation = useRef('')
  const page = location.pathname
    .slice(ROUTES.PROCESSES.length)
    .replace(/^\/+|\/+$/g, '')
  const processId =
    page && !['lista', 'fila', 'movimentacoes', 'avisos'].includes(page)
      ? page
      : ''
  const requestedView =
    page === 'fila' ? 'fila' : (searchParams.get('situacao') ?? 'ativos')
  const explicitStatuses = searchParams.getAll('status')
  const namedView = PROCESS_VIEWS[requestedView] ? requestedView : 'ativos'
  const view = explicitStatuses.length ? 'todos' : namedView
  const type = searchParams.get('tipo') ?? ''
  const search = searchParams.get('q') ?? ''
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.get('mes') ?? '')
    ? searchParams.get('mes')!
    : processMonth(timeZone)
  const scopeContext = `${organizationId}:${membershipId}`
  const retainedScopeError =
    scopeDenial?.key === scopeContext ? scopeDenial.error : null
  const catalogQuery = useProcessCatalog(scope, !retainedScopeError)
  const catalog = catalogQuery.data
  // No collection/detail of a different revision is activated before the catalog.
  const ready = !!catalog && !catalogQuery.error && !retainedScopeError
  const retainedAlertError =
    alertDenial?.key === scopeContext ? alertDenial.error : null
  const canReadAlerts =
    ready && catalog.permissions.create && !retainedAlertError
  const pendingAlertsQuery = useProcessAlerts(
    scope,
    { status: 'pending', pageSize: 1 },
    canReadAlerts,
  )
  const catalogAccess = JSON.stringify(catalog?.permissions ?? null)
  const allowedSectors = catalog?.permissions.executeSectors ?? []
  const chosenSector =
    sector && allowedSectors.includes(sector) ? sector : allowedSectors[0]
  const isList = page === 'lista' || page === 'fila'
  const rawFilters: ProcessFilters = {
    ...(explicitStatuses.length
      ? { status: explicitStatuses as ProcessStatus[] }
      : processViewFilters(view)),
    ...(type ? { tipo: type as ProcessTypeId } : {}),
    ...(search ? { q: search } : {}),
    ...(searchParams.get('month') ? { month: searchParams.get('month')! } : {}),
    ...(searchParams.get('responsibleSector') ||
    (view === 'responsabilidade' && chosenSector)
      ? {
          responsibleSector: (searchParams.get('responsibleSector') ||
            chosenSector) as ProcessSector,
        }
      : {}),
    ...(view === 'fila' && chosenSector ? { queueSector: chosenSector } : {}),
    ...(view === 'fila' && chosenSector ? { taskSector: chosenSector } : {}),
    ...(view === 'outrosSetores' && chosenSector
      ? { otherSector: chosenSector }
      : {}),
    ordering: (searchParams.get('ordering') ??
      (view === 'fila' || view === 'outrosSetores'
        ? 'urgency'
        : 'recent')) as ProcessFilters['ordering'],
    page: Number(searchParams.get('page') ?? 1),
    pageSize: Number(searchParams.get('pageSize') ?? 50),
  }
  let filterError: Error | null = null
  let filters: ProcessFilters = {}
  try {
    for (const key of ['waiting', 'late', 'setor'])
      if (searchParams.has(key))
        throw new Error(
          `O filtro ${key} foi removido. Remova os filtros e refaça a consulta.`,
        )
    for (const key of [
      'tipo',
      'q',
      'month',
      'responsibleSector',
      'ordering',
      'page',
      'pageSize',
    ])
      if (searchParams.getAll(key).length > 1)
        throw new Error(`O filtro ${key} só pode ser informado uma vez.`)
    filters = normalizeProcessFilters(rawFilters)
  } catch (error) {
    filterError =
      error instanceof Error ? error : new Error('Filtros inválidos.')
  }
  const listQuery = useProcessList(
    scope,
    filters,
    ready && !filterError && isList,
  )
  const indicatorsQuery = useProcessIndicators(scope, {}, ready)
  const filteredIndicatorsQuery = useProcessIndicators(
    scope,
    filters,
    ready && isList && !filterError,
  )
  const metricsQuery = useProcessLeggacyMetrics(scope, ready && !page)
  const queueQuery = useProcessList(
    scope,
    {
      ...(chosenSector
        ? { queueSector: chosenSector, taskSector: chosenSector }
        : { status: ['andamento', 'atrasado'] as const }),
      ordering: 'urgency',
      pageSize: 8,
    },
    ready && !page,
  )
  const scheduledQuery = useProcessList(
    scope,
    { status: ['agendado'], ordering: 'urgency', pageSize: 6 },
    ready && !page,
  )
  const executionQuery = useProcessList(
    scope,
    {
      ...(chosenSector
        ? { otherSector: chosenSector }
        : { status: ['andamento', 'atrasado'] as const }),
      ordering: 'urgency',
      pageSize: 6,
    },
    ready && !page,
  )
  const detailContext = `${scope.organizationId}:${scope.membershipId}:${processId}`
  const retainedDetailError =
    deniedDetail?.key === detailContext ? deniedDetail.error : null
  const detailQuery = useProcessDetail(
    scope,
    processId,
    ready &&
      !retainedDetailError &&
      deletedDetailContext.current !== detailContext,
  )
  const detailError = retainedDetailError ?? detailQuery.error
  const detailUnavailable =
    isApiError(detailError) && [403, 404].includes(detailError.status)
  const indicators = indicatorsQuery.data ?? emptyIndicators
  const scopeQueryError =
    catalogQuery.error ??
    indicatorsQuery.error ??
    listQuery.error ??
    queueQuery.error ??
    scheduledQuery.error ??
    executionQuery.error ??
    filteredIndicatorsQuery.error ??
    metricsQuery.error

  const clearAlertData = useCallback(() => {
    for (const key of [
      processQueryKeys.alerts(scope),
      processQueryKeys.alert(scope, '').slice(0, -1),
      processQueryKeys.alertRecipients(scope),
    ]) {
      void queryClient.cancelQueries({ queryKey: key })
      queryClient.removeQueries({ queryKey: key })
    }
  }, [scope, queryClient])
  const denyAlertAccess = useCallback(
    (error: unknown) => {
      if (!isApiError(error) || error.status !== 403) return
      setAlertDenial({ key: scopeContext, error })
      clearAlertData()
      void refreshSession().catch(() => undefined)
    },
    [scopeContext, clearAlertData, refreshSession],
  )
  const handleDetailUnavailable = useCallback(
    (error: unknown) => {
      setDeniedDetail({ key: detailContext, error })
      if (isApiError(error) && error.status === 403) {
        clearAlertData()
        for (const key of [
          processQueryKeys.followUps(scope),
          processQueryKeys.followUp(scope, '').slice(0, -1),
        ]) {
          void queryClient.cancelQueries({ queryKey: key })
          queryClient.removeQueries({ queryKey: key })
        }
        void refreshSession().catch(() => undefined)
      }
    },
    [detailContext, scope, queryClient, clearAlertData, refreshSession],
  )

  useEffect(() => {
    if (deletedDetailContext.current !== detailContext)
      deletedDetailContext.current = null
  }, [detailContext])

  useEffect(() => {
    if (
      isApiError(pendingAlertsQuery.error) &&
      pendingAlertsQuery.error.status === 403
    )
      denyAlertAccess(pendingAlertsQuery.error)
  }, [pendingAlertsQuery.error, denyAlertAccess])

  useEffect(() => {
    if (page !== 'fila' || !explicitStatuses.length || filterError) return
    const params = new URLSearchParams(searchParams)
    params.set('situacao', 'todos')
    navigate(`${ROUTES.PROCESSES}/lista?${params}`, {
      replace: true,
      state: location.state,
    })
  }, [
    page,
    explicitStatuses.length,
    filterError,
    searchParams,
    navigate,
    location.state,
  ])

  useEffect(() => {
    if (
      !isApiError(scopeQueryError) ||
      ![403, 404].includes(scopeQueryError.status)
    )
      return
    setScopeDenial({ key: scopeContext, error: scopeQueryError })
    setForm(null)
    setEditingResource(null)
    setSector(undefined)
    void queryClient.cancelQueries({ queryKey: processQueryKeys.root(scope) })
    queryClient.removeQueries({ queryKey: processQueryKeys.root(scope) })
    if (scopeQueryError.status === 403)
      void refreshSession().catch(() => undefined)
  }, [scopeQueryError, scopeContext, scope, queryClient, refreshSession])

  useEffect(() => {
    if (canReadAlerts) return
    clearAlertData()
  }, [canReadAlerts, clearAlertData])

  useEffect(() => {
    if (catalog?.permissions.delete) return
    for (const id of undoNotifications.current) dismiss(id)
    undoNotifications.current.clear()
  }, [catalog?.permissions.delete, dismiss])

  useEffect(() => {
    if (
      !form ||
      (catalog &&
        formAccess === catalogAccess &&
        (form === 'edit'
          ? catalog.permissions.edit
          : catalog.permissions.create))
    )
      return
    setForm(null)
    setEditingResource(null)
  }, [form, formAccess, catalogAccess, catalog])

  useEffect(() => {
    activeScope.current = scope
    const notices = undoNotifications.current
    setSector(undefined)
    setForm(null)
    setEditingResource(null)
    return () => {
      activeScope.current = null
      for (const id of notices) dismiss(id)
      notices.clear()
      void queryClient.cancelQueries({ queryKey: processQueryKeys.root(scope) })
      queryClient.removeQueries({ queryKey: processQueryKeys.root(scope) })
    }
  }, [scope, queryClient, dismiss])

  useEffect(() => {
    const restore = (
      location.state as {
        restoreProcessList?: { scope: string; scroll?: number; id?: string }
      } | null
    )?.restoreProcessList
    if (
      !isList ||
      listQuery.isPending ||
      !listQuery.data ||
      !restore ||
      restore.scope !== scopeContext ||
      restoredListLocation.current === location.key
    )
      return
    const frame = requestAnimationFrame(() => {
      const row = [
        ...document.querySelectorAll<HTMLElement>('[data-process-id]'),
      ].find((item) => item.dataset.processId === restore.id)
      row?.focus({ preventScroll: true })
      if (Number.isFinite(restore.scroll))
        window.scrollTo({
          top: Math.max(0, restore.scroll!),
          behavior: 'instant',
        })
      restoredListLocation.current = location.key
    })
    return () => cancelAnimationFrame(frame)
  }, [
    isList,
    listQuery.isPending,
    listQuery.data,
    location.key,
    location.state,
    scopeContext,
  ])

  useEffect(() => {
    if (
      !isApiError(detailQuery.error) ||
      ![403, 404].includes(detailQuery.error.status)
    )
      return
    handleDetailUnavailable(detailQuery.error)
    void queryClient.cancelQueries({ queryKey: processQueryKeys.root(scope) })
    queryClient.removeQueries({
      queryKey: processQueryKeys.detail(scope, processId),
    })
    queryClient.removeQueries({
      queryKey: processQueryKeys.entries(scope, processId),
    })
    queryClient.removeQueries({ queryKey: processQueryKeys.list(scope) })
    queryClient.removeQueries({ queryKey: processQueryKeys.indicators(scope) })
    queryClient.removeQueries({
      queryKey: processQueryKeys.report(scope, '').slice(0, -1),
    })
    setForm(null)
    setEditingResource(null)
  }, [
    detailQuery.error,
    handleDetailUnavailable,
    processId,
    queryClient,
    scope,
  ])

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

  function updateSearch(patch: Record<string, string | string[]>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (Array.isArray(value)) {
        next.delete(key)
        value.forEach((item) => next.append(key, item))
      } else if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in patch)) next.delete('page')
    if (patch.situacao && page === 'fila' && patch.situacao !== 'fila') {
      navigate(`${ROUTES.PROCESSES}/lista?${next}`, { replace: true })
      return
    }
    setSearchParams(next, { replace: true })
  }
  function openList(nextView: string, nextType = '') {
    const params = new URLSearchParams(isList ? searchParams : undefined)
    params.delete('status')
    params.delete('page')
    if (nextView === 'fila') params.delete('situacao')
    if (nextView !== 'fila') params.set('situacao', nextView)
    if (nextType) params.set('tipo', nextType)
    if (nextView === 'responsabilidade' && chosenSector)
      params.set('responsibleSector', chosenSector)
    navigate(
      `${ROUTES.PROCESSES}/${nextView === 'fila' ? 'fila' : 'lista'}${params.size ? `?${params}` : ''}`,
    )
  }
  function clearListFilters() {
    const params = new URLSearchParams()
    if (view !== 'fila') params.set('situacao', view)
    if (view === 'responsabilidade' && filters.responsibleSector)
      params.set('responsibleSector', filters.responsibleSector)
    if (searchParams.has('pageSize'))
      params.set('pageSize', String(filters.pageSize ?? 50))
    if (searchParams.has('ordering'))
      params.set('ordering', filters.ordering ?? 'recent')
    navigate(
      `${ROUTES.PROCESSES}/${view === 'fila' ? 'fila' : 'lista'}${params.size ? `?${params}` : ''}`,
      { replace: true },
    )
  }
  function openProcess(id: string) {
    navigate(`${ROUTES.PROCESSES}/${encodeURIComponent(id)}`, {
      state: {
        processBack: `${location.pathname}${location.search}`,
        processBackScroll: window.scrollY,
        processBackId: id,
        processBackScope: scopeContext,
      },
    })
  }
  function closeProcess() {
    const backState = location.state as {
      processBack?: unknown
      processBackScroll?: number
      processBackId?: string
      processBackScope?: string
    } | null
    const back = backState?.processBack
    navigate(
      typeof back === 'string' &&
        (back === ROUTES.PROCESSES ||
          back.startsWith(`${ROUTES.PROCESSES}/lista`) ||
          back.startsWith(`${ROUTES.PROCESSES}/fila`) ||
          back.startsWith(`${ROUTES.PROCESSES}/avisos`) ||
          back.startsWith(`${ROUTES.PROCESSES}/movimentacoes`))
        ? back
        : ROUTES.PROCESSES,
      {
        state:
          backState?.processBackScope === scopeContext
            ? {
                restoreProcessList: {
                  scope: scopeContext,
                  scroll: backState.processBackScroll,
                  id: backState.processBackId,
                },
              }
            : null,
      },
    )
  }
  function changed(process: ProcessResource) {
    if (activeScope.current !== scope) return false
    if (process.organizationId !== scope.organizationId)
      throw new ProcessContractError(
        'response.organizationId (organização diferente do contexto ativo)',
      )
    queryClient.setQueryData(
      processQueryKeys.detail(scope, process.id),
      process,
    )
    for (const key of [
      processQueryKeys.list(scope),
      processQueryKeys.indicators(scope),
      processQueryKeys.leggacyMetrics(scope),
      processQueryKeys.entries(scope, process.id),
      processQueryKeys.report(scope, '').slice(0, -1),
      processQueryKeys.followUps(scope),
      processQueryKeys.followUp(scope, '').slice(0, -1),
      processQueryKeys.alerts(scope),
      processQueryKeys.alert(scope, '').slice(0, -1),
    ]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    return true
  }
  function openCreate() {
    createKey.current = crypto.randomUUID()
    createAttempt.current = null
    setInitialType(catalog?.types.find((item) => item.id === type)?.id)
    setFormAccess(catalogAccess)
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
        if (!changed(response.data)) return
        setForm(null)
        notify({ tone: 'success', title: 'Alterações salvas' })
      } catch (error) {
        if (activeScope.current !== scope) throw error
        if (isApiError(error) && [403, 404].includes(error.status)) {
          handleDetailUnavailable(error)
          setForm(null)
          setEditingResource(null)
          void queryClient.cancelQueries({
            queryKey: processQueryKeys.root(scope),
          })
          for (const key of [
            processQueryKeys.detail(scope, original.id),
            processQueryKeys.entries(scope, original.id),
            processQueryKeys.list(scope),
            processQueryKeys.indicators(scope),
            processQueryKeys.report(scope, '').slice(0, -1),
          ])
            queryClient.removeQueries({ queryKey: key })
        }
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
    let response
    try {
      const body = JSON.stringify(input)
      if (createAttempt.current?.body !== body)
        createAttempt.current = { body, key: crypto.randomUUID() }
      response = await processService.create(input, createAttempt.current.key)
    } catch (error) {
      if (
        activeScope.current === scope &&
        isApiError(error) &&
        [403, 404].includes(error.status)
      ) {
        setScopeDenial({ key: scopeContext, error })
        setForm(null)
        setEditingResource(null)
        void queryClient.cancelQueries({
          queryKey: processQueryKeys.root(scope),
        })
        queryClient.removeQueries({ queryKey: processQueryKeys.root(scope) })
      }
      throw error
    }
    if (!changed(response.data)) return
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
    if (!detailQuery.data?.permissions.delete) return
    const id = detailQuery.data.id
    const response = await processService.remove(id, detailQuery.data.version)
    if (activeScope.current !== scope) return
    // Prevent an active observer from recreating the removed query before navigation commits.
    deletedDetailContext.current = detailContext
    await queryClient.cancelQueries({
      queryKey: processQueryKeys.detail(scope, id),
    })
    await queryClient.cancelQueries({
      queryKey: processQueryKeys.entries(scope, id),
    })
    queryClient.removeQueries({
      queryKey: processQueryKeys.detail(scope, id),
    })
    queryClient.removeQueries({ queryKey: processQueryKeys.entries(scope, id) })
    closeProcess()
    void queryClient.invalidateQueries({
      queryKey: processQueryKeys.root(scope),
      predicate: (query) =>
        !query.queryKey.includes('detail') &&
        !(query.queryKey.includes('entries') && query.queryKey.includes(id)),
    })
    const version = processVersionFromEtag(response.etag)
    let used = false
    let notificationId = ''
    const undo = async () => {
      if (used || activeScope.current !== scope || version === null) return
      used = true
      dismiss(notificationId)
      undoNotifications.current.delete(notificationId)
      try {
        const restored = await processService.restore(id, version)
        if (!changed(restored.data)) return
        notify({ tone: 'success', title: 'Processo restaurado' })
      } catch (error) {
        if (activeScope.current !== scope) return
        void queryClient.invalidateQueries({
          queryKey: processQueryKeys.root(scope),
        })
        notify({
          tone: 'error',
          title: 'Não foi possível desfazer a exclusão',
          message:
            isApiError(error) && error.status === 409
              ? 'A versão ou o estado do processo mudou. Os dados foram recarregados; a restauração não será repetida automaticamente.'
              : getErrorPresentation(error).message,
        })
      }
    }
    notificationId = notify({
      tone: 'success',
      title: 'Processo excluído',
      message: 'O histórico permanece preservado no sistema.',
      duration: version === null ? undefined : 15000,
      dedupeKey: `process-delete:${scopeContext}:${id}`,
      ...(version !== null
        ? { action: { label: 'Desfazer', onClick: () => void undo() } }
        : {}),
    })
    if (version !== null) undoNotifications.current.add(notificationId)
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
    retainedScopeError ??
    catalogQuery.error ??
    (isList ? filterError : null) ??
    (!processId && page !== 'movimentacoes' && page !== 'avisos'
      ? (indicatorsQuery.error ??
        filteredIndicatorsQuery.error ??
        (isList
          ? listQuery.error
          : (queueQuery.error ??
            scheduledQuery.error ??
            executionQuery.error ??
            metricsQuery.error)))
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
                aria-current={view === 'fila' && isList ? 'page' : undefined}
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
              <button
                className="nav-i"
                aria-current={
                  view === 'responsabilidade' && isList ? 'page' : undefined
                }
                onClick={() => openList('responsabilidade')}
              >
                <ProcessIcon name="users" />
                Responsabilidade
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
                    ? `${indicators.bySector[chosenSector] ?? 0} processos na fila`
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
                      if (view === 'fila' || view === 'outrosSetores')
                        updateSearch({ page: '' })
                      else if (view === 'responsabilidade')
                        updateSearch({ responsibleSector: key, page: '' })
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
            <p className="process-count-scope">
              Contagens de toda a organização
            </p>
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
                      'andamento',
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
                            andamento: indicators.byStatus.andamento,
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
          {canReadAlerts && (
            <section>
              <Link
                className="nav-i"
                aria-current={page === 'avisos' ? 'page' : undefined}
                to={`${ROUTES.PROCESSES}/avisos`}
              >
                <ProcessIcon name="mail" />
                Avisos por e-mail
                {pendingAlertsQuery.isError ? (
                  <span
                    className="ct err"
                    title="Não foi possível atualizar a contagem"
                  >
                    !
                  </span>
                ) : pendingAlertsQuery.data ? (
                  <span
                    className={`ct ${pendingAlertsQuery.data.count ? 'err' : ''}`}
                  >
                    {pendingAlertsQuery.data.count}
                  </span>
                ) : null}
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
          <nav className="process-breadcrumb" aria-label="Localização">
            <Link to={ROUTES.PROCESSES}>Processos</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">
              {processId
                ? (detailQuery.data?.codigo ?? 'Ficha do processo')
                : page === 'avisos'
                  ? 'Avisos por e-mail'
                  : page === 'movimentacoes'
                    ? 'Movimentações Empresariais'
                    : isList
                      ? PROCESS_VIEWS[view].title
                      : 'Início'}
            </span>
          </nav>
          <button
            className="btn process-refresh"
            disabled={
              listQuery.isFetching || catalogQuery.isFetching || !!mainError
            }
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
            <ProcessPageError
              error={mainError}
              retry={() => {
                setScopeDenial(null)
                void queryClient.invalidateQueries({
                  queryKey: processQueryKeys.root(scope),
                })
              }}
              clear={
                filterError
                  ? () => navigate(`${ROUTES.PROCESSES}/lista?situacao=todos`)
                  : undefined
              }
            />
          ) : !catalog ||
            (!processId &&
              page !== 'movimentacoes' &&
              page !== 'avisos' &&
              (indicatorsQuery.isPending ||
                (!isList &&
                  (scheduledQuery.isPending ||
                    executionQuery.isPending ||
                    metricsQuery.isPending ||
                    (!!chosenSector && queueQuery.isPending))))) ? (
            <div className="panel empty" role="status">
              Carregando processos…
            </div>
          ) : processId ? (
            detailError ? (
              <>
                <ProcessPageError
                  title="Processo indisponível"
                  error={detailError}
                  retry={() => {
                    setDeniedDetail(null)
                    void detailQuery.refetch()
                  }}
                />
                <button className="btn" onClick={closeProcess}>
                  Voltar
                </button>
              </>
            ) : detailQuery.data && !detailUnavailable ? (
              <ProcessDetails
                key={`${scopeContext}:${processId}`}
                scope={scope}
                process={detailQuery.data}
                catalog={catalog}
                timeZone={timeZone}
                onChange={changed}
                onUnavailable={handleDetailUnavailable}
                onClose={closeProcess}
                onEdit={() => {
                  setEditingResource(detailQuery.data!)
                  setFormAccess(catalogAccess)
                  setForm('edit')
                }}
                onDelete={remove}
              />
            ) : (
              <div className="panel empty" role="status">
                Carregando processo…
              </div>
            )
          ) : page === 'avisos' ? (
            retainedAlertError && catalog.permissions.create ? (
              <ProcessPageError
                title="Avisos indisponíveis"
                error={retainedAlertError}
                retry={() => {
                  setAlertDenial(null)
                  void catalogQuery.refetch()
                }}
              />
            ) : catalog.permissions.create ? (
              <ProcessAlerts
                key={`${scopeContext}:${catalogAccess}`}
                scope={scope}
                permissions={catalog.permissions}
                timeZone={timeZone}
                onOpen={openProcess}
                onUnavailable={denyAlertAccess}
              />
            ) : (
              <div className="panel empty">
                <h1>Acesso restrito</h1>
                <p>Avisos por e-mail disponíveis somente para a Diretoria.</p>
                <Link className="btn" to={ROUTES.PROCESSES}>
                  Voltar ao início
                </Link>
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
                onUnavailable={(error) =>
                  setScopeDenial({ key: scopeContext, error })
                }
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
          ) : isList ? (
            <>
              <ProcessList
                data={listQuery.data ?? loadingPage}
                indicators={filteredIndicatorsQuery.data}
                catalog={catalog}
                filters={filters}
                sector={chosenSector}
                view={view}
                timeZone={timeZone}
                onFilters={updateSearch}
                onClear={clearListFilters}
                customStatuses={
                  view === 'todos'
                    ? (explicitStatuses as ProcessStatus[])
                    : undefined
                }
                baseResponsibleSector={
                  view === 'responsabilidade'
                    ? filters.responsibleSector
                    : undefined
                }
                isFetching={listQuery.isFetching}
                isLoading={listQuery.isPending}
                searchValue={search}
                onOpen={openProcess}
                onWaiting={() => openList('agendados')}
              />
              {view === 'fila' &&
                catalog.permissions.executeSectors.includes('fin') && (
                  <ProcessFollowUps
                    key={scopeContext}
                    scope={scope}
                    permissions={catalog.permissions}
                    timeZone={timeZone}
                    onUnavailable={(error) => {
                      if (isApiError(error) && error.status === 403) {
                        setScopeDenial({ key: scopeContext, error })
                        void queryClient.cancelQueries({
                          queryKey: processQueryKeys.root(scope),
                        })
                        queryClient.removeQueries({
                          queryKey: processQueryKeys.root(scope),
                        })
                        void refreshSession().catch(() => undefined)
                      }
                    }}
                  />
                )}
            </>
          ) : (
            <ProcessOverview
              queue={queueQuery.data}
              scheduled={scheduledQuery.data!}
              execution={executionQuery.data!}
              catalog={catalog}
              indicators={indicators}
              leggacyMetrics={metricsQuery.data}
              sector={chosenSector}
              timeZone={timeZone}
              onOpen={openProcess}
              onList={openList}
              onSector={setSector}
              onQueueSector={(key) => {
                navigate(
                  `${ROUTES.PROCESSES}/lista?situacao=responsabilidade&responsibleSector=${key}`,
                )
              }}
            />
          )}
        </main>
      </div>
      {form &&
        !detailUnavailable &&
        !mainError &&
        !detailError &&
        formAccess === catalogAccess &&
        catalog &&
        (form === 'edit'
          ? catalog.permissions.edit
          : catalog.permissions.create) &&
        (form !== 'edit' || editingResource) && (
          <ProcessForm
            key={form === 'edit' ? editingResource!.id : createKey.current}
            catalog={catalog}
            scope={scope}
            process={form === 'edit' ? editingResource! : undefined}
            initialType={initialType}
            onSubmit={submit}
            onClose={() => setForm(null)}
          />
        )}
    </div>
  )
}
