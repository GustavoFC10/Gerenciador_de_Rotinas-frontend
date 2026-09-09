import { useState } from 'react'

import EmptyState from '../../components/common/EmptyState'
import {
  SettingsContentSection,
  SettingsPageHeader,
} from '../../components/settings/SettingsPageChrome'
import Button from '../../components/ui/Button'
import { ROUTES } from '../../constants/routes'
import { useArchivedCompanies } from '../../hooks/useArchivedCompanies'
import { useArchivedRoutines } from '../../hooks/useArchivedRoutines'
import { getErrorMessage, getErrorPresentation } from '../../utils/apiErrors'

type ArchivedTab = 'companies' | 'routines'

interface ArchivedEntitiesSettingsPageProps {
  onCompanyRestore: (companyId: string) => Promise<unknown>
  onRoutineRestore: (routineId: string) => Promise<unknown>
}

/**
 * Empresas e rotinas arquivadas pertencem ao mesmo histórico operacional.
 * As abas mantêm as duas listas no mesmo destino de Configurações, sem criar
 * outra camada de navegação lateral.
 */
function ArchivedEntitiesSettingsPage({
  onCompanyRestore,
  onRoutineRestore,
}: ArchivedEntitiesSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<ArchivedTab>('companies')
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const companiesQuery = useArchivedCompanies()
  const routinesQuery = useArchivedRoutines()
  const isCompaniesTab = activeTab === 'companies'
  const currentQuery = isCompaniesTab ? companiesQuery : routinesQuery
  const errorPresentation = currentQuery.error
    ? getErrorPresentation(
        currentQuery.error,
        isCompaniesTab
          ? 'Não foi possível carregar as empresas arquivadas.'
          : 'Não foi possível carregar as rotinas arquivadas.',
      )
    : null

  async function handleCompanyRestore(companyId: string, companyName: string) {
    if (
      !window.confirm(
        `Desarquivar ${companyName}? Os vínculos antigos de rotinas não serão reabertos automaticamente.`,
      )
    ) {
      return
    }

    setRestoringId(companyId)
    setActionError('')
    try {
      await onCompanyRestore(companyId)
      await companiesQuery.reload()
    } catch (caughtError) {
      setActionError(
        getErrorMessage(caughtError, 'Não foi possível desarquivar a empresa.'),
      )
    } finally {
      setRestoringId(null)
    }
  }

  async function handleRoutineRestore(routineId: string, routineName: string) {
    if (
      !window.confirm(
        `Desarquivar ${routineName}? Os vínculos com empresas encerrados no arquivamento não serão reabertos automaticamente.`,
      )
    ) {
      return
    }

    setRestoringId(routineId)
    setActionError('')
    try {
      await onRoutineRestore(routineId)
      await routinesQuery.reload()
    } catch (caughtError) {
      setActionError(
        getErrorMessage(caughtError, 'Não foi possível desarquivar a rotina.'),
      )
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <>
      <SettingsPageHeader
        breadcrumbs={[
          { label: 'Configurações', to: ROUTES.SETTINGS },
          { label: 'Arquivados' },
        ]}
        title="Arquivados"
        description="Consulte e restaure empresas e rotinas removidas da operação ativa. Os vínculos encerrados no arquivamento não são reabertos automaticamente."
      />

      <div className="space-y-5 pt-6">
        {actionError && (
          <p
            role="alert"
            className="rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)]"
          >
            {actionError}
          </p>
        )}

        <div
          role="tablist"
          aria-label="Recursos arquivados"
          className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-1"
        >
          <ArchivedTabButton
            active={isCompaniesTab}
            id="archived-companies-tab"
            panelId="archived-resources-panel"
            label={`Empresas (${companiesQuery.companies.length})`}
            onClick={() => setActiveTab('companies')}
          />
          <ArchivedTabButton
            active={!isCompaniesTab}
            id="archived-routines-tab"
            panelId="archived-resources-panel"
            label={`Rotinas (${routinesQuery.routines.length})`}
            onClick={() => setActiveTab('routines')}
          />
        </div>

        <section
          id="archived-resources-panel"
          role="tabpanel"
          aria-labelledby={
            isCompaniesTab ? 'archived-companies-tab' : 'archived-routines-tab'
          }
        >
          {isCompaniesTab ? (
            <ArchivedCompaniesList
              companies={companiesQuery.companies}
              isLoading={companiesQuery.isLoading}
              isRefreshing={companiesQuery.isRefreshing}
              errorPresentation={errorPresentation}
              isRestoring={restoringId !== null}
              restoringId={restoringId}
              onReload={() => void companiesQuery.reload()}
              onRestore={handleCompanyRestore}
            />
          ) : (
            <ArchivedRoutinesList
              routines={routinesQuery.routines}
              isLoading={routinesQuery.isLoading}
              isRefreshing={routinesQuery.isRefreshing}
              errorPresentation={errorPresentation}
              isRestoring={restoringId !== null}
              restoringId={restoringId}
              onReload={() => void routinesQuery.reload()}
              onRestore={handleRoutineRestore}
            />
          )}
        </section>
      </div>
    </>
  )
}

function ArchivedTabButton({
  active,
  id,
  panelId,
  label,
  onClick,
}: {
  active: boolean
  id: string
  panelId: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-controls={panelId}
      aria-selected={active}
      onClick={onClick}
      className={`min-h-9 whitespace-nowrap rounded-[calc(var(--radius-control)-0.15rem)] px-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${
        active
          ? 'bg-[var(--color-panel-bg)] text-[var(--color-text-strong)] shadow-sm'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]'
      }`}
    >
      {label}
    </button>
  )
}

function ArchivedCompaniesList({
  companies,
  isLoading,
  isRefreshing,
  errorPresentation,
  isRestoring,
  restoringId,
  onReload,
  onRestore,
}: {
  companies: ReturnType<typeof useArchivedCompanies>['companies']
  isLoading: boolean
  isRefreshing: boolean
  errorPresentation: ReturnType<typeof getErrorPresentation> | null
  isRestoring: boolean
  restoringId: string | null
  onReload: () => void
  onRestore: (companyId: string, companyName: string) => Promise<void>
}) {
  return (
    <SettingsContentSection
      title="Histórico de empresas"
      description={
        isRefreshing
          ? 'Atualizando lista...'
          : `${companies.length} ${
              companies.length === 1
                ? 'empresa arquivada'
                : 'empresas arquivadas'
            }.`
      }
      action={<ReloadButton disabled={isLoading} onClick={onReload} />}
    >
      {isLoading ? (
        <LoadingMessage>Carregando empresas arquivadas...</LoadingMessage>
      ) : errorPresentation ? (
        <QueryError presentation={errorPresentation} onRetry={onReload} />
      ) : companies.length === 0 ? (
        <EmptyState
          title="Nenhuma empresa arquivada"
          description="As empresas arquivadas aparecerão aqui para consulta e restauração."
        />
      ) : (
        <ul className="divide-y divide-[var(--color-divider)]">
          {companies.map((company) => (
            <li
              key={company.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[var(--color-text-strong)]">
                  {company.name}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">
                  {company.code ? `Código ${company.code} · ` : ''}
                  Arquivada em {formatArchivedAt(company.archivedAt)}
                </p>
              </div>
              <RestoreButton
                disabled={isRestoring}
                isRestoring={restoringId === company.id}
                onClick={() => void onRestore(company.id, company.name)}
              />
            </li>
          ))}
        </ul>
      )}
    </SettingsContentSection>
  )
}

function ArchivedRoutinesList({
  routines,
  isLoading,
  isRefreshing,
  errorPresentation,
  isRestoring,
  restoringId,
  onReload,
  onRestore,
}: {
  routines: ReturnType<typeof useArchivedRoutines>['routines']
  isLoading: boolean
  isRefreshing: boolean
  errorPresentation: ReturnType<typeof getErrorPresentation> | null
  isRestoring: boolean
  restoringId: string | null
  onReload: () => void
  onRestore: (routineId: string, routineName: string) => Promise<void>
}) {
  return (
    <SettingsContentSection
      title="Histórico de rotinas"
      description={
        isRefreshing
          ? 'Atualizando lista...'
          : `${routines.length} ${
              routines.length === 1 ? 'rotina arquivada' : 'rotinas arquivadas'
            }.`
      }
      action={<ReloadButton disabled={isLoading} onClick={onReload} />}
    >
      {isLoading ? (
        <LoadingMessage>Carregando rotinas arquivadas...</LoadingMessage>
      ) : errorPresentation ? (
        <QueryError presentation={errorPresentation} onRetry={onReload} />
      ) : routines.length === 0 ? (
        <EmptyState
          title="Nenhuma rotina arquivada"
          description="As rotinas arquivadas aparecerão aqui para consulta e restauração."
        />
      ) : (
        <ul className="divide-y divide-[var(--color-divider)]">
          {routines.map((routine) => (
            <li
              key={routine.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[var(--color-text-strong)]">
                  {routine.name}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">
                  {[routine.shotname, routine.departmentName]
                    .filter(Boolean)
                    .join(' · ')}
                  {routine.shotname || routine.departmentName ? ' · ' : ''}
                  Arquivada em {formatArchivedAt(routine.archivedAt)}
                </p>
              </div>
              <RestoreButton
                disabled={isRestoring}
                isRestoring={restoringId === routine.id}
                onClick={() => void onRestore(routine.id, routine.name)}
              />
            </li>
          ))}
        </ul>
      )}
    </SettingsContentSection>
  )
}

function ReloadButton({
  disabled,
  onClick,
}: {
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button tone="neutral" onClick={onClick} disabled={disabled}>
      Atualizar
    </Button>
  )
}

function RestoreButton({
  disabled,
  isRestoring,
  onClick,
}: {
  disabled: boolean
  isRestoring: boolean
  onClick: () => void
}) {
  return (
    <Button tone="neutral" disabled={disabled} onClick={onClick}>
      {isRestoring ? 'Desarquivando...' : 'Desarquivar'}
    </Button>
  )
}

function LoadingMessage({ children }: { children: string }) {
  return (
    <p className="text-sm font-semibold text-[var(--color-text-muted)]">
      {children}
    </p>
  )
}

function QueryError({
  presentation,
  onRetry,
}: {
  presentation: ReturnType<typeof getErrorPresentation>
  onRetry: () => void
}) {
  return (
    <div className="space-y-3">
      <p
        role="alert"
        className="text-sm font-semibold text-[var(--status-error-text)]"
      >
        {presentation.message}
      </p>
      {presentation.supportReference && (
        <p className="text-xs font-semibold text-[var(--status-error-text)]">
          {presentation.supportReference}
        </p>
      )}
      <Button tone="neutral" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

function formatArchivedAt(value: string | null): string {
  if (!value) return 'data não informada'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default ArchivedEntitiesSettingsPage
