import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import {
  CatalogAction,
  CatalogChevron,
  CatalogDatum,
  CatalogEmpty,
  CatalogHeader,
  CatalogList,
  CatalogPrimary,
  CatalogRow,
  CatalogRows,
  CatalogStatus,
} from '../components/catalog/CatalogList'
import {
  CreationErrorSummary,
  FieldError,
} from '../components/forms/CreationFeedback'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { isApiError } from '../services/httpClient'
import { screenService, type ScreenPatch } from '../services/screenService'
import type { Client, Department, Routine, Screen } from '../types/domain'
import { getCompanyCodeLabel } from '../utils/companyCode'
import { normalizeSearch } from '../utils/normalizeSearch'

const screenGrid =
  'lg:grid-cols-[minmax(14rem,1.35fr)_9rem_minmax(10rem,1fr)_7rem_7rem_7rem_1.25rem]'

const COMPANY_LIMIT = 500
const ROUTINE_LIMIT = 200

type ScreenEditField = 'name' | 'departmentId' | 'position'
type ScreenEditErrors = Partial<Record<ScreenEditField, string>>

interface SelectionItem {
  id: string
  label: string
  description: string
  selectable: boolean
  warning?: string
}

interface ScreensPageProps {
  screens: Screen[]
  departments: Department[]
  clients: Client[]
  routines: Routine[]
  onScreenSave: (
    screenId: string,
    changes: ScreenPatch,
    etag: string,
  ) => Promise<Screen>
}

function ScreensPage({
  screens,
  departments,
  clients,
  routines,
  onScreenSave,
}: ScreensPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null)
  const requestedScreenId = searchParams.get('screenId')
  const visibleScreens = useMemo(() => {
    const query = normalizeSearch(search)
    return [...screens]
      .filter((screen) => !screen.archivedAt)
      .filter((screen) =>
        normalizeSearch(
          [
            screen.name,
            screen.type === 'spreadsheet' ? 'planilha' : 'agenda',
            departments.find(
              (department) => department.id === screen.departmentId,
            )?.name ?? screen.departmentName,
          ].join(' '),
        ).includes(query),
      )
      .sort(
        (left, right) =>
          (
            departments.find(
              (department) => department.id === left.departmentId,
            )?.name ?? left.departmentName
          ).localeCompare(
            departments.find(
              (department) => department.id === right.departmentId,
            )?.name ?? right.departmentName,
            'pt-BR',
          ) ||
          left.position - right.position ||
          left.name.localeCompare(right.name, 'pt-BR'),
      )
  }, [departments, screens, search])

  useEffect(() => {
    if (!requestedScreenId) return

    const requestedScreen = screens.find(
      (screen) => screen.id === requestedScreenId && !screen.archivedAt,
    )
    if (requestedScreen) setSelectedScreen(requestedScreen)
  }, [requestedScreenId, screens])

  function closeScreenEditor() {
    setSelectedScreen(null)

    if (!requestedScreenId) return

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete('screenId')
    setSearchParams(nextSearchParams, { replace: true })
  }

  return (
    <>
      <CatalogList
        title="Telas operacionais"
        countLabel={
          String(screens.filter((screen) => !screen.archivedAt).length) +
          ' configuradas'
        }
        resultLabel={String(visibleScreens.length) + ' exibidas'}
        searchLabel="Buscar telas"
        searchPlaceholder="Buscar por tela, departamento ou tipo"
        searchValue={search}
        onSearchChange={setSearch}
        action={
          <CatalogAction to={ROUTES.SCREEN_CREATE}>Nova tela</CatalogAction>
        }
      >
        <CatalogHeader gridClass={screenGrid}>
          <span>Tela</span>
          <span>Tipo</span>
          <span>Departamento</span>
          <span>Empresas</span>
          <span>Rotinas</span>
          <span>Situação</span>
          <span />
        </CatalogHeader>
        {visibleScreens.length ? (
          <CatalogRows>
            {visibleScreens.map((screen) => (
              <ScreenRow
                key={screen.id}
                screen={screen}
                departmentName={
                  departments.find(
                    (department) => department.id === screen.departmentId,
                  )?.name ?? screen.departmentName
                }
                onEdit={() => setSelectedScreen(screen)}
              />
            ))}
          </CatalogRows>
        ) : (
          <CatalogEmpty
            title={
              search
                ? 'Nenhuma tela encontrada para a busca.'
                : 'Nenhuma tela operacional configurada.'
            }
            searchValue={search}
            onClear={() => setSearch('')}
          />
        )}
      </CatalogList>

      {selectedScreen && (
        <ScreenEditDrawer
          key={selectedScreen.id}
          screen={selectedScreen}
          departments={departments}
          clients={clients}
          routines={routines}
          onClose={closeScreenEditor}
          onSave={onScreenSave}
        />
      )}
    </>
  )
}

function ScreenRow({
  screen,
  departmentName,
  onEdit,
}: {
  screen: Screen
  departmentName: string
  onEdit: () => void
}) {
  return (
    <CatalogRow
      onClick={onEdit}
      ariaLabel={'Editar tela ' + screen.name}
      gridClass={screenGrid}
    >
      <CatalogPrimary
        title={screen.name}
        description={
          screen.type === 'spreadsheet'
            ? 'Matriz operacional'
            : 'Fila de acompanhamento'
        }
      />
      <CatalogDatum label="Tipo">
        {screen.type === 'spreadsheet' ? 'Planilha' : 'Agenda'}
      </CatalogDatum>
      <CatalogDatum label="Departamento">{departmentName}</CatalogDatum>
      <CatalogDatum label="Empresas">{screen.companies.length}</CatalogDatum>
      <CatalogDatum label="Rotinas">{screen.routines.length}</CatalogDatum>
      <CatalogDatum label="Situação">
        <CatalogStatus active={!screen.archivedAt} />
      </CatalogDatum>
      <CatalogChevron />
    </CatalogRow>
  )
}

export function ScreenEditDrawer({
  screen,
  departments,
  clients,
  routines,
  onClose,
  onSave,
  onSavedNavigate,
  presentation = 'drawer',
}: {
  screen: Screen
  departments: Department[]
  clients: Client[]
  routines: Routine[]
  onClose: () => void
  onSave: (
    screenId: string,
    changes: ScreenPatch,
    etag: string,
  ) => Promise<Screen>
  onSavedNavigate?: (departmentId: string) => void
  presentation?: 'drawer' | 'page'
}) {
  const isDrawer = presentation === 'drawer'
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  const savingRef = useRef(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState<Screen | null>(null)
  const [etag, setEtag] = useState<string | null>(null)
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [position, setPosition] = useState('')
  const [companyIds, setCompanyIds] = useState<string[]>([])
  const [routineIds, setRoutineIds] = useState<string[]>([])
  const [companySearch, setCompanySearch] = useState('')
  const [routineSearch, setRoutineSearch] = useState('')
  const [errors, setErrors] = useState<ScreenEditErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  closeRef.current = onClose
  savingRef.current = isSaving

  useEffect(() => {
    if (!isDrawer) return undefined

    const previousOverflow = document.body.style.overflow
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const dialog = dialogRef.current
    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!savingRef.current) {
          event.preventDefault()
          closeRef.current()
        }
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const focusableElements = [
        ...dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter((element) => element.getClientRects().length > 0)

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstElement = focusableElements[0]!
      const lastElement = focusableElements.at(-1)!

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? lastElement : firstElement).focus()
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => {
      const autofocusTarget = dialog?.querySelector<HTMLElement>(
        '[data-dialog-autofocus]',
      )
      ;(autofocusTarget ?? dialog)?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus()
    }
  }, [isDrawer])

  useEffect(() => {
    if (isLoadingSnapshot || !snapshot) return

    const frame = window.requestAnimationFrame(() =>
      dialogRef.current
        ?.querySelector<HTMLElement>('[data-dialog-autofocus]')
        ?.focus(),
    )

    return () => window.cancelAnimationFrame(frame)
  }, [isLoadingSnapshot, snapshot])

  useEffect(() => {
    let isCurrent = true

    setIsLoadingSnapshot(true)
    setLoadError('')
    setSubmitError('')
    setStatusMessage('')

    void screenService
      .get(screen.id)
      .then((response) => {
        if (!isCurrent) return

        setSnapshot(response.data)
        setName(response.data.name)
        setDepartmentId(response.data.departmentId)
        setPosition(String(response.data.position))
        setCompanyIds(getOrderedIds(response.data.companies))
        setRoutineIds(getOrderedIds(response.data.routines))
        setEtag(response.etag)

        if (!response.etag) {
          setLoadError(
            'A API não informou a versão atual da tela. Atualize os dados antes de salvar alterações.',
          )
        }
      })
      .catch((caughtError: unknown) => {
        if (!isCurrent) return
        setSnapshot(null)
        setEtag(null)
        setLoadError(
          getScreenErrorMessage(
            caughtError,
            'Não foi possível carregar a configuração da tela.',
          ),
        )
      })
      .finally(() => {
        if (isCurrent) setIsLoadingSnapshot(false)
      })

    return () => {
      isCurrent = false
    }
  }, [loadAttempt, screen.id])

  const originalCompanyIds = useMemo(
    () => getOrderedIds(snapshot?.companies ?? []),
    [snapshot],
  )
  const originalRoutineIds = useMemo(
    () => getOrderedIds(snapshot?.routines ?? []),
    [snapshot],
  )
  const isCompanyCompositionChanged = !sameOrder(companyIds, originalCompanyIds)
  const isRoutineCompositionChanged = !sameOrder(routineIds, originalRoutineIds)

  const eligibleRoutineIds = useMemo(
    () =>
      new Set(
        routines
          .filter(
            (routine) =>
              routine.active !== false && routine.departmentId === departmentId,
          )
          .map((routine) => routine.id),
      ),
    [departmentId, routines],
  )

  const activeCompanyIds = useMemo(
    () =>
      new Set(
        clients
          .filter((client) => client.active !== false)
          .map((client) => client.id),
      ),
    [clients],
  )

  const companyItems = useMemo<SelectionItem[]>(() => {
    const byId = new Map<string, SelectionItem>()

    snapshot?.companies.forEach((company) => {
      byId.set(company.id, {
        id: company.id,
        label: company.name,
        description: [getCompanyCodeLabel(company.code), company.legalName]
          .filter(Boolean)
          .join(' · '),
        selectable: false,
        warning: 'Empresa arquivada ou indisponível.',
      })
    })

    clients.forEach((client) => {
      const selected = companyIds.includes(client.id)
      const selectable = client.active !== false

      if (selectable || selected) {
        byId.set(client.id, {
          id: client.id,
          label: client.name,
          description: [getCompanyCodeLabel(client.code), client.legalName]
            .filter(Boolean)
            .join(' · '),
          selectable,
          warning: selectable
            ? undefined
            : 'Empresa arquivada ou indisponível.',
        })
      }
    })

    return [...byId.values()]
      .filter((item) => item.selectable || companyIds.includes(item.id))
      .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'))
  }, [clients, companyIds, snapshot?.companies])

  const routineItems = useMemo<SelectionItem[]>(() => {
    const byId = new Map<string, SelectionItem>()

    snapshot?.routines.forEach((routine) => {
      byId.set(routine.id, {
        id: routine.id,
        label: routine.name,
        description: routine.shotname,
        selectable: false,
      })
    })

    routines.forEach((routine) => {
      const selected = routineIds.includes(routine.id)
      const selectable = eligibleRoutineIds.has(routine.id)

      if (selectable || selected) {
        byId.set(routine.id, {
          id: routine.id,
          label: routine.name,
          description: routine.shortName,
          selectable,
          warning:
            selected && !selectable
              ? 'Rotina inativa ou fora do departamento da tela.'
              : undefined,
        })
      }
    })

    return [...byId.values()]
      .map((item) =>
        routineIds.includes(item.id) && !item.selectable && !item.warning
          ? {
              ...item,
              warning: 'Rotina inativa ou fora do departamento da tela.',
            }
          : item,
      )
      .filter((item) => item.selectable || routineIds.includes(item.id))
      .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'))
  }, [eligibleRoutineIds, routineIds, routines, snapshot?.routines])

  const invalidCompanyIds = useMemo(
    () => companyIds.filter((companyId) => !activeCompanyIds.has(companyId)),
    [activeCompanyIds, companyIds],
  )
  const invalidRoutineIds = useMemo(
    () => routineIds.filter((routineId) => !eligibleRoutineIds.has(routineId)),
    [eligibleRoutineIds, routineIds],
  )

  function clearSubmitFeedback() {
    setSubmitError('')
    setStatusMessage('')
  }

  function updateName(nextName: string) {
    setName(nextName)
    setErrors((current) => ({ ...current, name: undefined }))
    clearSubmitFeedback()
  }

  function updateDepartment(nextDepartmentId: string) {
    setDepartmentId(nextDepartmentId)
    setRoutineIds((current) =>
      current.filter((routineId) =>
        routines.some(
          (routine) =>
            routine.id === routineId &&
            routine.active !== false &&
            routine.departmentId === nextDepartmentId,
        ),
      ),
    )
    setErrors((current) => ({ ...current, departmentId: undefined }))
    clearSubmitFeedback()
  }

  function updatePosition(nextPosition: string) {
    setPosition(nextPosition)
    setErrors((current) => ({ ...current, position: undefined }))
    clearSubmitFeedback()
  }

  function toggleCompany(companyId: string) {
    if (companyIds.includes(companyId)) {
      setCompanyIds((current) => current.filter((id) => id !== companyId))
      clearSubmitFeedback()
      return
    }

    if (!activeCompanyIds.has(companyId)) {
      setSubmitError('Selecione apenas empresas ativas do tenant.')
      return
    }

    if (companyIds.length >= COMPANY_LIMIT) {
      setSubmitError('Uma tela aceita no máximo 500 empresas.')
      return
    }

    setCompanyIds((current) => [...current, companyId])
    clearSubmitFeedback()
  }

  function toggleRoutine(routineId: string) {
    if (routineIds.includes(routineId)) {
      setRoutineIds((current) => current.filter((id) => id !== routineId))
      clearSubmitFeedback()
      return
    }

    if (!eligibleRoutineIds.has(routineId)) {
      setSubmitError('Selecione apenas rotinas ativas do departamento da tela.')
      return
    }

    if (routineIds.length >= ROUTINE_LIMIT) {
      setSubmitError('Uma tela aceita no máximo 200 rotinas.')
      return
    }

    setRoutineIds((current) => [...current, routineId])
    clearSubmitFeedback()
  }

  function moveCompany(companyId: string, direction: 'up' | 'down') {
    setCompanyIds((current) => moveInOrder(current, companyId, direction))
    clearSubmitFeedback()
  }

  function moveRoutine(routineId: string, direction: 'up' | 'down') {
    setRoutineIds((current) => moveInOrder(current, routineId, direction))
    clearSubmitFeedback()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!snapshot || !etag) {
      setSubmitError(
        'Não foi possível obter a versão atual da tela para salvar as alterações.',
      )
      return
    }

    const nextErrors: ScreenEditErrors = {}
    const nextName = name.trim()
    const nextPosition = Number(position)

    if (!nextName) nextErrors.name = 'Informe o nome da tela.'
    if (!departmentId) {
      nextErrors.departmentId = 'Selecione o departamento da tela.'
    } else if (
      !departments.some((department) => department.id === departmentId)
    ) {
      nextErrors.departmentId = 'Selecione um departamento disponível.'
    }
    if (nextName.length > 160) {
      nextErrors.name = 'O nome da tela pode ter até 160 caracteres.'
    }
    if (
      !position.trim() ||
      !Number.isSafeInteger(nextPosition) ||
      nextPosition < 0
    ) {
      nextErrors.position =
        'Informe uma posição inteira igual ou maior que zero.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const nameChanged = nextName !== snapshot.name
    const departmentChanged = departmentId !== snapshot.departmentId
    const positionChanged = nextPosition !== snapshot.position

    if (snapshot.type === 'spreadsheet' && isCompanyCompositionChanged) {
      if (companyIds.length > COMPANY_LIMIT) {
        setSubmitError('Uma tela aceita no máximo 500 empresas.')
        return
      }
      if (invalidCompanyIds.length > 0) {
        setSubmitError(
          'Remova as empresas arquivadas ou indisponíveis antes de salvar.',
        )
        return
      }
    }

    if (snapshot.type === 'spreadsheet' && isRoutineCompositionChanged) {
      if (routineIds.length > ROUTINE_LIMIT) {
        setSubmitError('Uma tela aceita no máximo 200 rotinas.')
        return
      }
      if (invalidRoutineIds.length > 0) {
        setSubmitError(
          'Remova as rotinas inativas ou de outro departamento antes de salvar.',
        )
        return
      }
    }

    if (
      !nameChanged &&
      !departmentChanged &&
      !positionChanged &&
      !isCompanyCompositionChanged &&
      !isRoutineCompositionChanged
    ) {
      setSubmitError('')
      setStatusMessage('Nenhuma alteração para salvar.')
      return
    }

    setIsSaving(true)
    setSubmitError('')
    setStatusMessage('')

    try {
      const updatedScreen = await onSave(
        snapshot.id,
        {
          ...(nameChanged ? { name: nextName } : {}),
          ...(departmentChanged ? { departmentId } : {}),
          ...(positionChanged ? { position: nextPosition } : {}),
          ...(snapshot.type === 'spreadsheet' && isCompanyCompositionChanged
            ? { companyIds }
            : {}),
          ...(snapshot.type === 'spreadsheet' && isRoutineCompositionChanged
            ? { routineIds }
            : {}),
        },
        etag,
      )
      if (onSavedNavigate) {
        onSavedNavigate(updatedScreen.departmentId)
      } else {
        onClose()
      }
    } catch (caughtError) {
      setSubmitError(
        getScreenErrorMessage(
          caughtError,
          'Não foi possível salvar as alterações da tela.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const screenToOpen = snapshot ?? screen
  const openingLabel =
    screenToOpen.type === 'spreadsheet' ? 'Abrir planilha' : 'Abrir agenda'

  return (
    <div
      className={
        isDrawer
          ? 'fixed inset-0 z-50 flex justify-end bg-[var(--color-overlay-bg)] backdrop-blur-[2px]'
          : 'w-full'
      }
      role={isDrawer ? 'presentation' : undefined}
      onMouseDown={(event) => {
        if (isDrawer && event.target === event.currentTarget && !isSaving) {
          onClose()
        }
      }}
    >
      <aside
        ref={dialogRef}
        role={isDrawer ? 'dialog' : undefined}
        aria-modal={isDrawer || undefined}
        aria-labelledby="screen-edit-title"
        tabIndex={isDrawer ? -1 : undefined}
        className={
          isDrawer
            ? '@container/screen-editor flex h-full w-full max-w-5xl flex-col overflow-hidden border-l border-[var(--color-panel-border)] bg-[var(--color-app-bg)] shadow-[-12px_0_36px_rgb(15_23_42_/_0.22)]'
            : '@container/screen-editor flex min-h-[34rem] w-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-app-bg)]'
        }
      >
        <header className="flex flex-wrap items-start gap-4 border-b border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-4 py-5 sm:px-6">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
              Configuração visual
            </p>
            <h2
              id="screen-edit-title"
              className="mt-1 text-xl font-black text-[var(--color-text-strong)]"
            >
              {isDrawer ? 'Editar tela' : 'Configuração da tela'}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--color-text-muted)]">
              Atualize a estrutura da visualização. A versão mais recente é
              carregada antes do salvamento para proteger a configuração contra
              alterações concorrentes.
            </p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <Link
              to={getScreenRoute(screenToOpen)}
              className={`inline-flex min-h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] px-3 text-sm font-bold text-[var(--color-button-neutral-text)] transition hover:bg-[var(--color-button-neutral-hover-bg)] ${focusRing}`}
            >
              {openingLabel}
            </Link>
            {isDrawer ? (
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                aria-label="Fechar edição"
                className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] disabled:opacity-60 ${focusRing}`}
              >
                <CloseIcon />
              </button>
            ) : (
              <Button
                type="button"
                tone="neutral"
                disabled={isSaving}
                onClick={onClose}
              >
                Voltar às telas
              </Button>
            )}
          </div>
        </header>

        {isLoadingSnapshot ? (
          <div className="grid min-h-0 flex-1 place-items-center px-5 py-12 text-center sm:px-6">
            <div>
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <LoadingIcon />
              </span>
              <p className="mt-3 text-sm font-bold text-[var(--color-text-strong)]">
                Carregando a configuração atual…
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Obtendo a versão necessária para salvar com segurança.
              </p>
            </div>
          </div>
        ) : !snapshot ? (
          <div className="grid min-h-0 flex-1 place-items-center px-5 py-12 text-center sm:px-6">
            <div className="max-w-md">
              <p
                role="alert"
                className="rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-error-text)]"
              >
                {loadError || 'Não foi possível carregar a tela.'}
              </p>
              <Button
                className="mt-4"
                onClick={() => setLoadAttempt((current) => current + 1)}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <CreationErrorSummary
                title="Revise a configuração da tela"
                messages={[
                  ...Object.values(errors).filter(
                    (message): message is string => Boolean(message),
                  ),
                  ...(submitError ? [submitError] : []),
                ]}
              />

              {loadError && (
                <p
                  role="alert"
                  className="mb-5 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)]"
                >
                  {loadError}
                </p>
              )}

              {statusMessage && (
                <p
                  role="status"
                  className="mb-5 rounded-[var(--radius-control)] border border-[var(--status-completed-border)] bg-[var(--status-completed-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-completed-text)]"
                >
                  {statusMessage}
                </p>
              )}

              <section aria-labelledby="screen-edit-structure-title">
                <DrawerSectionHeader
                  id="screen-edit-structure-title"
                  eyebrow="Estrutura"
                  title="Identidade e ordem"
                  description="O tipo é permanente. Ao trocar de departamento, as empresas selecionadas são preservadas e as rotinas incompatíveis são removidas."
                />
                <div className="mt-5 grid gap-4 @min-[32rem]/screen-editor:grid-cols-2">
                  <div>
                    <TextField
                      data-dialog-autofocus
                      id="edit-screen-name"
                      label="Nome da tela *"
                      value={name}
                      maxLength={160}
                      onChange={(event) => updateName(event.target.value)}
                      required
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={
                        errors.name ? 'edit-screen-name-error' : undefined
                      }
                    />
                    <FieldError id="edit-screen-name-error">
                      {errors.name}
                    </FieldError>
                  </div>
                  <div>
                    <Select
                      id="edit-screen-department"
                      label="Departamento *"
                      value={departmentId}
                      onChange={(event) => updateDepartment(event.target.value)}
                      required
                      disabled={departments.length === 0 || isSaving}
                      aria-invalid={Boolean(errors.departmentId)}
                      aria-describedby={
                        errors.departmentId
                          ? 'edit-screen-department-error'
                          : undefined
                      }
                    >
                      <option value="">Selecione</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </Select>
                    <FieldError id="edit-screen-department-error">
                      {errors.departmentId}
                    </FieldError>
                  </div>
                  <div>
                    <TextField
                      id="edit-screen-position"
                      label="Posição *"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={position}
                      onChange={(event) => updatePosition(event.target.value)}
                      required
                      aria-invalid={Boolean(errors.position)}
                      aria-describedby={
                        errors.position
                          ? 'edit-screen-position-error'
                          : undefined
                      }
                    />
                    <FieldError id="edit-screen-position-error">
                      {errors.position}
                    </FieldError>
                  </div>
                </div>
                <dl className="mt-5 max-w-xs rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4">
                  <MetadataItem
                    label="Tipo"
                    value={
                      snapshot.type === 'spreadsheet' ? 'Planilha' : 'Agenda'
                    }
                  />
                </dl>
              </section>

              {snapshot.type === 'spreadsheet' && (
                <section
                  className="mt-7 border-t border-[var(--color-divider)] pt-6"
                  aria-labelledby="screen-edit-composition-title"
                >
                  <DrawerSectionHeader
                    id="screen-edit-composition-title"
                    eyebrow="Composição da planilha"
                    title="Linhas, colunas e sequência"
                    description="A ordem abaixo é enviada à API como a ordem das linhas e colunas. Empresas ativas do tenant podem compor a planilha; rotinas precisam pertencer ao departamento selecionado."
                  />
                  <div className="mt-5 grid gap-5 @min-[48rem]/screen-editor:grid-cols-2">
                    <OrderedSelection
                      id="edit-screen-companies"
                      title="Empresas"
                      description="Linhas da planilha · máximo de 500"
                      searchLabel="Buscar empresas"
                      searchValue={companySearch}
                      onSearchChange={setCompanySearch}
                      items={companyItems}
                      selectedIds={companyIds}
                      selectionLimit={COMPANY_LIMIT}
                      onToggle={toggleCompany}
                      onMove={moveCompany}
                      disabled={isSaving}
                      emptyLabel="Nenhuma empresa ativa encontrada."
                    />
                    <OrderedSelection
                      id="edit-screen-routines"
                      title="Rotinas"
                      description="Colunas da planilha · máximo de 200"
                      searchLabel="Buscar rotinas"
                      searchValue={routineSearch}
                      onSearchChange={setRoutineSearch}
                      items={routineItems}
                      selectedIds={routineIds}
                      selectionLimit={ROUTINE_LIMIT}
                      onToggle={toggleRoutine}
                      onMove={moveRoutine}
                      disabled={isSaving}
                      emptyLabel="Nenhuma rotina ativa neste departamento."
                    />
                  </div>
                </section>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-4 py-4 sm:px-6">
              <p className="text-sm text-[var(--color-text-muted)]">
                {snapshot.type === 'spreadsheet'
                  ? 'Use as setas para definir a ordem das linhas e colunas.'
                  : 'A agenda não possui empresas ou rotinas na composição.'}
              </p>
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  tone="neutral"
                  disabled={isSaving}
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  tone="primary"
                  disabled={isSaving || Boolean(loadError)}
                >
                  {isSaving ? 'Salvando…' : 'Salvar tela'}
                </Button>
              </div>
            </footer>
          </form>
        )}
      </aside>
    </div>
  )
}

function OrderedSelection({
  id,
  title,
  description,
  searchLabel,
  searchValue,
  onSearchChange,
  items,
  selectedIds,
  selectionLimit,
  onToggle,
  onMove,
  disabled,
  emptyLabel,
}: {
  id: string
  title: string
  description: string
  searchLabel: string
  searchValue: string
  onSearchChange: (value: string) => void
  items: SelectionItem[]
  selectedIds: string[]
  selectionLimit: number
  onToggle: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  disabled: boolean
  emptyLabel: string
}) {
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  )
  const query = normalizeSearch(searchValue)
  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        normalizeSearch([item.label, item.description].join(' ')).includes(
          query,
        ),
      ),
    [items, query],
  )

  return (
    <section
      className="@container/selection min-w-0 rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-3 sm:p-4"
      aria-labelledby={id + '-title'}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            id={id + '-title'}
            className="text-sm font-black text-[var(--color-text-strong)]"
          >
            {title}
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-panel-bg)] px-2 py-1 text-xs font-bold text-[var(--color-text-muted)]">
          {selectedIds.length}/{selectionLimit}
        </span>
      </div>

      <TextField
        id={id + '-search'}
        label={<span className="sr-only">{searchLabel}</span>}
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchLabel}
        disabled={disabled}
        className="mt-4"
      />

      <ul className="mt-3 max-h-56 divide-y divide-[var(--color-divider)] overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-bg)]">
        {visibleItems.map((item) => {
          const checked = selectedIds.includes(item.id)
          const itemDisabled = disabled || (!checked && !item.selectable)

          return (
            <li key={item.id}>
              <label
                className={
                  'flex cursor-pointer items-start gap-3 px-3 py-2.5 transition ' +
                  (checked
                    ? 'bg-[var(--color-brand-soft)]'
                    : 'hover:bg-[var(--color-control-hover-bg)]') +
                  (itemDisabled ? ' cursor-not-allowed opacity-60' : '')
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(item.id)}
                  disabled={itemDisabled}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-text-muted)]">
                    {item.description}
                  </span>
                  {checked && item.warning && (
                    <span className="mt-1 block text-xs font-bold text-[var(--status-error-text)]">
                      {item.warning}
                    </span>
                  )}
                </span>
              </label>
            </li>
          )
        })}
        {visibleItems.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">
            {emptyLabel}
          </li>
        )}
      </ul>

      <div className="mt-4 border-t border-[var(--color-divider)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
            Ordem exibida
          </h4>
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">
            Use as setas para reordenar
          </span>
        </div>
        {selectedIds.length ? (
          <ol className="mt-2 space-y-2">
            {selectedIds.map((selectedId, index) => {
              const item = itemsById.get(selectedId) ?? {
                id: selectedId,
                label: 'Item indisponível',
                description: selectedId,
                selectable: false,
                warning: 'Este item não está disponível para a tela.',
              }

              return (
                <li
                  key={selectedId}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-2.5 py-2 @min-[24rem]/selection:grid-cols-[1.5rem_minmax(0,1fr)_auto]"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-xs font-black text-[var(--color-brand)]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-text-muted)]">
                      {item.description}
                    </span>
                  </span>
                  <div className="col-span-2 flex flex-wrap items-center justify-end gap-1 @min-[24rem]/selection:col-span-1">
                    <Button
                      type="button"
                      tone="ghost"
                      size="sm"
                      className="min-w-8 px-2"
                      onClick={() => onMove(selectedId, 'up')}
                      disabled={disabled || index === 0}
                      aria-label={'Mover ' + item.label + ' para cima'}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      tone="ghost"
                      size="sm"
                      className="min-w-8 px-2"
                      onClick={() => onMove(selectedId, 'down')}
                      disabled={disabled || index === selectedIds.length - 1}
                      aria-label={'Mover ' + item.label + ' para baixo'}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      tone="ghost"
                      size="sm"
                      onClick={() => onToggle(selectedId)}
                      disabled={disabled}
                      aria-label={'Remover ' + item.label}
                    >
                      Remover
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="mt-2 rounded-[var(--radius-control)] border border-dashed border-[var(--color-divider)] px-3 py-4 text-center text-sm text-[var(--color-text-muted)]">
            Nenhum item selecionado.
          </p>
        )}
      </div>
    </section>
  )
}

function DrawerSectionHeader({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
        {eyebrow}
      </p>
      <h3
        id={id}
        className="mt-1 text-base font-black text-[var(--color-text-strong)]"
      >
        {title}
      </h3>
      <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    </header>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-extrabold text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

function getOrderedIds(
  items: Array<{ id: string; position: number }>,
): string[] {
  return [...items]
    .sort(
      (left, right) =>
        left.position - right.position ||
        left.id.localeCompare(right.id, 'pt-BR'),
    )
    .map((item) => item.id)
    .filter((id, index, all) => all.indexOf(id) === index)
}

function sameOrder(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function moveInOrder(
  items: string[],
  id: string,
  direction: 'up' | 'down',
): string[] {
  const currentIndex = items.indexOf(id)
  const nextIndex = currentIndex + (direction === 'up' ? -1 : 1)

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items
  }

  const nextItems = [...items]
  const current = nextItems[currentIndex]!
  nextItems[currentIndex] = nextItems[nextIndex]!
  nextItems[nextIndex] = current
  return nextItems
}

function getScreenErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    if (error.status === 412) {
      return 'Esta tela foi alterada por outra pessoa. Feche a edição e abra-a novamente para carregar a versão mais recente.'
    }
    if (error.status === 428) {
      return 'A API exigiu a versão atual da tela. Tente carregar a configuração novamente.'
    }
  }

  return error instanceof Error ? error.message : fallback
}

function getScreenRoute(screen: Pick<Screen, 'id' | 'type'>): string {
  return (
    (screen.type === 'spreadsheet' ? ROUTES.SPREADSHEET : ROUTES.AGENDA) +
    '?screenId=' +
    encodeURIComponent(screen.id)
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

function LoadingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    </svg>
  )
}

export default ScreensPage
