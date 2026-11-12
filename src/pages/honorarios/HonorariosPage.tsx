import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router'
import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout'
import Button from '../../components/ui/Button'
import { Notice } from '../../components/honorarios/HonorariosShared'
import HonorariosClients from '../../components/honorarios/HonorariosClients'
import HonorariosSettings from '../../components/honorarios/HonorariosSettings'
import HonorariosDashboard from '../../components/honorarios/HonorariosDashboard'
import {
  HonorariosQuoteForm,
  HonorariosQuoteDetail,
  HonorariosQuotes,
} from '../../components/honorarios/HonorariosQuotes'
import { useAuth } from '../../hooks/useAuth'
import { honorariosService } from '../../services/honorariosService'
import { isApiError } from '../../services/httpClient'
import { queryKeys } from '../../query/queryKeys'
import { getErrorPresentation } from '../../utils/apiErrors'
import { focusRing } from '../../constants/designTokens'

export default function HonorariosPage() {
  const { activeMembership } = useAuth()
  if (!activeMembership) return null
  return (
    <HonorariosWorkspace
      key={`${activeMembership.organization.id}:${activeMembership.id}`}
    />
  )
}

function HonorariosWorkspace() {
  const { activeMembership, refreshSession } = useAuth()
  const queryClient = useQueryClient()
  const scopeKey = useMemo(
    () => [
      ...queryKeys.scope({
        organizationId: activeMembership!.organization.id,
        membershipId: activeMembership!.id,
      }),
      'honorarios',
    ],
    [activeMembership],
  )
  const [denied, setDenied] = useState(false)
  const onDenied = useCallback(
    (error: unknown) => {
      if (!isApiError(error) || ![401, 403].includes(error.status)) return
      setDenied(true)
      void queryClient.cancelQueries({ queryKey: scopeKey })
      queryClient.removeQueries({ queryKey: scopeKey })
      void refreshSession().catch(() => undefined)
    },
    [queryClient, scopeKey, refreshSession],
  )
  const configuration = useQuery({
    queryKey: [...scopeKey, 'configuration'],
    queryFn: ({ signal }) => honorariosService.configuration(signal),
    retry: false,
    enabled: !denied,
    refetchOnWindowFocus: true,
  })
  useEffect(() => {
    if (configuration.error) onDenied(configuration.error)
  }, [configuration.error, onDenied])
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (
          event.type === 'updated' &&
          scopeKey.every(
            (part, index) => event.query.queryKey[index] === part,
          ) &&
          event.query.state.error
        )
          onDenied(event.query.state.error)
      }),
    [queryClient, onDenied, scopeKey],
  )
  useEffect(
    () => () => {
      void queryClient.cancelQueries({ queryKey: scopeKey })
    },
    [queryClient, scopeKey],
  )
  const config = configuration.data
  const canEdit = config?.permissions.edit === true
  const canManage = config?.permissions.manage === true
  const props = config
    ? { configuration: config, canEdit, canManage, scopeKey, onDenied }
    : null
  return (
    <ModuleWorkspaceLayout>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/hub"
            className={`text-xs font-semibold text-[var(--color-text-muted)] ${focusRing}`}
          >
            Áreas de trabalho / Honorários
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-text-strong)]">
            Honorários
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Precificação, propostas e gestão da carteira.
          </p>
        </div>
        {props && (
          <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-brand)]">
            {canManage ? 'Administração' : canEdit ? 'Operação' : 'Consulta'}
          </span>
        )}
      </div>
      {denied || (config && config.permissions.read !== true) ? (
        <Notice tone="error">
          Seu acesso a Honorários foi revogado.{' '}
          <Link className="underline" to="/hub">
            Voltar às áreas de trabalho
          </Link>
        </Notice>
      ) : (
        <>
          <nav
            aria-label="Navegação de Honorários"
            className="mb-7 flex gap-1 overflow-x-auto border-b border-[var(--color-panel-border)] pb-3"
          >
            {[
              ['', 'Painel'],
              ['novo', 'Novo orçamento'],
              ['orcamentos', 'Orçamentos'],
              ['clientes', 'Clientes'],
              ['parametros', 'Parâmetros'],
            ].map(([path, label]) => (
              <NavLink
                key={path}
                end={path === ''}
                to={`/honorarios${path ? `/${path}` : ''}`}
                className={({ isActive }) =>
                  `shrink-0 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-bold ${focusRing} ${isActive ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-panel-soft-bg)]'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          {configuration.isPending && (
            <p
              role="status"
              className="py-12 text-center text-sm text-[var(--color-text-muted)]"
            >
              Carregando Honorários…
            </p>
          )}
          {configuration.error && (
            <div className="space-y-3">
              <Notice tone="error">
                {getErrorPresentation(configuration.error).message}
              </Notice>
              <Button onClick={() => void configuration.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}
          {props && !configuration.error && (
            <Routes>
              <Route index element={<HonorariosDashboard {...props} />} />
              <Route path="novo" element={<HonorariosQuoteForm {...props} />} />
              <Route
                path="orcamentos"
                element={<HonorariosQuotes {...props} />}
              />
              <Route
                path="orcamentos/:quoteId"
                element={<HonorariosQuoteDetail {...props} />}
              />
              <Route
                path="orcamentos/:quoteId/revisar"
                element={<HonorariosQuoteForm {...props} />}
              />
              <Route
                path="clientes"
                element={<HonorariosClients {...props} />}
              />
              <Route
                path="parametros"
                element={
                  <HonorariosSettings
                    {...props}
                    onConfigurationSaved={(next) => {
                      queryClient.setQueryData(
                        [...scopeKey, 'configuration'],
                        next,
                      )
                      void queryClient.invalidateQueries({ queryKey: scopeKey })
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/honorarios" replace />} />
            </Routes>
          )}
        </>
      )}
    </ModuleWorkspaceLayout>
  )
}
