import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import HonorariosLayout from '../../layouts/HonorariosLayout'
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
  const location = useLocation()
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
  const route = location.pathname
    .slice('/honorarios'.length)
    .replace(/^\/+|\/+$/g, '')
  const titles: Record<string, [string, string]> = {
    '': [
      'Painel de honorários',
      'Acompanhe sua carteira, as negociações e as oportunidades de crescimento.',
    ],
    novo: [
      'Novo orçamento',
      'Calcule o honorário e prepare uma proposta para seu cliente.',
    ],
    orcamentos: ['Orçamentos', 'Acompanhe propostas, revisões e negociações.'],
    clientes: [
      'Clientes',
      'Gerencie os honorários e os reajustes da sua carteira.',
    ],
    parametros: [
      'Parâmetros',
      'Consulte e configure as regras de precificação do escritório.',
    ],
  }
  const [title, description] =
    titles[route] ??
    (route.endsWith('/revisar')
      ? [
          'Revisar proposta',
          'Crie uma nova revisão preservando o documento anterior.',
        ]
      : [
          'Proposta comercial',
          'Consulte o documento salvo e acompanhe a negociação.',
        ])
  return (
    <HonorariosLayout
      title={title}
      description={description}
      roleLabel={
        canManage ? 'Administração' : canEdit ? 'Operação' : 'Consulta'
      }
      canEdit={!denied && canEdit}
      isRefreshing={configuration.isFetching}
      onRefresh={() =>
        void queryClient.invalidateQueries({ queryKey: scopeKey })
      }
    >
      {denied || (config && config.permissions.read !== true) ? (
        <Notice tone="error">
          Seu acesso a Honorários foi revogado.{' '}
          <Link className="underline" to="/hub">
            Voltar às áreas de trabalho
          </Link>
        </Notice>
      ) : (
        <>
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
              <Route
                index
                element={<HonorariosDashboard {...props} showIntro={false} />}
              />
              <Route
                path="novo"
                element={<HonorariosQuoteForm {...props} showIntro={false} />}
              />
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
    </HonorariosLayout>
  )
}
