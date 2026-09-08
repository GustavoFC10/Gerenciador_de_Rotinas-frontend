import { useState } from 'react'

import EmptyState from '../../components/common/EmptyState'
import {
  SettingsContentSection,
  SettingsPageHeader,
} from '../../components/settings/SettingsPageChrome'
import Button from '../../components/ui/Button'
import { ROUTES } from '../../constants/routes'
import { useArchivedCompanies } from '../../hooks/useArchivedCompanies'

interface ArchivedCompaniesSettingsPageProps {
  onCompanyRestore: (companyId: string) => Promise<unknown>
}

function ArchivedCompaniesSettingsPage({
  onCompanyRestore,
}: ArchivedCompaniesSettingsPageProps) {
  const { companies, error, isLoading, isRefreshing, reload } =
    useArchivedCompanies()
  const [restoringCompanyId, setRestoringCompanyId] = useState<string | null>(
    null,
  )
  const [actionError, setActionError] = useState('')

  async function handleRestore(companyId: string, companyName: string) {
    if (
      !window.confirm(
        `Desarquivar ${companyName}? Os vínculos antigos de rotinas não serão reabertos automaticamente.`,
      )
    ) {
      return
    }

    setRestoringCompanyId(companyId)
    setActionError('')

    try {
      await onCompanyRestore(companyId)
      await reload()
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível desarquivar a empresa.',
      )
    } finally {
      setRestoringCompanyId(null)
    }
  }

  return (
    <>
      <SettingsPageHeader
        breadcrumbs={[
          { label: 'Configurações', to: ROUTES.SETTINGS },
          { label: 'Empresas arquivadas' },
        ]}
        title="Empresas arquivadas"
        description="Empresas arquivadas não aparecem nas operações ativas. Ao desarquivar, será preciso configurar novamente os vínculos de rotina necessários."
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
          action={
            <Button
              tone="neutral"
              onClick={() => void reload()}
              disabled={isLoading}
            >
              Atualizar
            </Button>
          }
        >
          {isLoading ? (
            <p className="text-sm font-semibold text-[var(--color-text-muted)]">
              Carregando empresas arquivadas...
            </p>
          ) : error ? (
            <div className="space-y-3">
              <p
                role="alert"
                className="text-sm font-semibold text-[var(--status-error-text)]"
              >
                Não foi possível carregar as empresas arquivadas.
              </p>
              <Button tone="neutral" onClick={() => void reload()}>
                Tentar novamente
              </Button>
            </div>
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
                  <Button
                    tone="neutral"
                    disabled={restoringCompanyId !== null}
                    onClick={() => void handleRestore(company.id, company.name)}
                  >
                    {restoringCompanyId === company.id
                      ? 'Desarquivando...'
                      : 'Desarquivar'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SettingsContentSection>
      </div>
    </>
  )
}

function formatArchivedAt(value: string | null): string {
  if (!value) return 'data não informada'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default ArchivedCompaniesSettingsPage
