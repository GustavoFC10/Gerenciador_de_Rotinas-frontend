import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import Card from '../ui/Card'
import TextField from '../ui/TextField'
import Button from '../ui/Button'
import { Notice, Panel } from './HonorariosShared'
import { honorariosService } from '../../services/honorariosService'
import type { HonorariosConfiguration } from '../../types/honorarios'
import { money, quoteStatusNames } from '../../utils/honorariosPresentation'
import { getErrorPresentation } from '../../utils/apiErrors'
import { buttonTone, focusRing } from '../../constants/designTokens'

const actionClass = `inline-flex min-h-9 items-center justify-center rounded-[var(--radius-control)] px-3 text-sm font-bold transition ${focusRing}`

export default function HonorariosDashboard({
  configuration,
  scopeKey,
  onDenied,
  showIntro = true,
}: {
  configuration: HonorariosConfiguration
  scopeKey: readonly unknown[]
  onDenied: (error: unknown) => void
  showIntro?: boolean
}) {
  const [limit, setLimit] = useState(String(configuration.params.reajusteMax))
  const [appliedLimit, setAppliedLimit] = useState(
    configuration.params.reajusteMax,
  )
  const query = useQuery({
    queryKey: [...scopeKey, 'dashboard', appliedLimit],
    queryFn: ({ signal }) => honorariosService.dashboard(appliedLimit, signal),
    retry: false,
    placeholderData: (previous) => previous,
  })
  useEffect(() => {
    if (query.error) onDenied(query.error)
  }, [query.error, onDenied])
  if (query.isPending)
    return (
      <Panel title="Visão geral dos honorários">
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          Carregando indicadores…
        </p>
        <div
          aria-hidden="true"
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)]"
            />
          ))}
        </div>
      </Panel>
    )
  if (query.error)
    return (
      <Panel title="Não foi possível carregar o painel">
        <div className="space-y-4">
          <Notice tone="error">
            {getErrorPresentation(query.error).message}
          </Notice>
          <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
        </div>
      </Panel>
    )
  const { clients, quotes, year } = query.data
  const canEdit = configuration.permissions.edit === true
  const isEmpty =
    clients.count === 0 && quotes.count === 0 && quotes.openCount === 0
  return (
    <div className="honorarios-dashboard space-y-5">
      {showIntro && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
              Visão geral
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Acompanhe sua carteira, as negociações e as oportunidades de
              reajuste.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/honorarios/clientes"
              className={`${actionClass} ${buttonTone.neutral}`}
            >
              Carteira de clientes
            </Link>
            <Link
              to="/honorarios/novo"
              className={`${actionClass} ${buttonTone.primary}`}
            >
              {canEdit ? 'Novo orçamento' : 'Abrir calculadora'}
            </Link>
          </div>
        </div>
      )}
      {isEmpty && (
        <Panel title="Comece a organizar seus honorários">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-2xl space-y-2">
              <p className="text-sm text-[var(--color-text-muted)]">
                Adicione empresas à carteira e crie propostas para acompanhar os
                resultados aqui. Os indicadores abaixo mostram os dados
                registrados na organização.
              </p>
              {!canEdit && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Seu acesso permite consultar a carteira e simular valores. Os
                  cadastros são feitos por quem possui permissão de operação.
                </p>
              )}
            </div>
            {canEdit && (
              <Link
                to="/honorarios/clientes?novo=true"
                className={`${actionClass} ${buttonTone.neutral}`}
              >
                Cadastrar primeiro cliente
              </Link>
            )}
          </div>
        </Panel>
      )}
      <section
        aria-label="Indicadores de honorários"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          [
            'Receita mensal atual',
            money(clients.current),
            `${clients.count} clientes na carteira`,
          ],
          [
            'Potencial de crescimento',
            money(clients.potential),
            'Comparação com a tabela atual',
          ],
          [
            'Negociações abertas',
            money(quotes.openValue),
            `${quotes.openCount} propostas em negociação`,
          ],
          [
            'Taxa de aceite',
            quotes.acceptanceRate === null
              ? '—'
              : `${Math.round(Number(quotes.acceptanceRate) * 100)}%`,
            `Propostas decididas em ${year}`,
          ],
        ].map(([label, value, caption]) => (
          <Card key={label} variant="metric" className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {label}
            </p>
            <p className="my-3 text-2xl font-black tabular-nums tracking-tight text-[var(--color-text-strong)]">
              {value}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{caption}</p>
          </Card>
        ))}
      </section>
      {(clients.adjustmentsDue > 0 || quotes.expiringCount > 0) && (
        <Notice>
          {clients.adjustmentsDue} cliente(s) com reajuste próximo ou vencido.{' '}
          {quotes.expiringCount} proposta(s) aberta(s) vencem nos próximos três
          dias.{' '}
          <Link
            to="/honorarios/clientes"
            className="font-semibold text-[var(--color-brand)] underline"
          >
            Ver carteira
          </Link>
        </Notice>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Alinhamento da carteira">
          <div className="space-y-4">
            {clients.count === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Nenhum perfil financeiro cadastrado. Vincule empresas existentes
                para comparar os honorários com a tabela.
              </p>
            )}
            {(
              [
                ['abaixo', 'Abaixo da tabela'],
                ['alinhado', 'Alinhados'],
                ['acima', 'Acima da tabela'],
              ] as const
            ).map(([id, label]) => (
              <div key={id}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{label}</span>
                  <strong>{clients.byAlignment[id]}</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-panel-soft-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-brand)]"
                    style={{
                      width: `${clients.count ? (clients.byAlignment[id] / clients.count) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-2 text-sm text-[var(--color-text-muted)]">
              Receita sugerida pela tabela:{' '}
              <strong>{money(clients.suggested)}</strong>
            </p>
            <Link
              className="inline-block text-sm font-bold text-[var(--color-brand)]"
              to="/honorarios/clientes"
            >
              Consultar carteira →
            </Link>
          </div>
        </Panel>
        <Panel title={`Propostas de ${year}`}>
          {quotes.count === 0 && (
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Nenhuma proposta registrada neste ano. Crie um orçamento para
              acompanhar a negociação.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(quoteStatusNames).map(([status, label]) => (
              <Link
                key={status}
                to={`/honorarios/orcamentos?status=${status}`}
                className="rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] p-4"
              >
                <span className="block text-xs text-[var(--color-text-muted)]">
                  {label}
                </span>
                <strong className="mt-1 block text-xl">
                  {quotes.byStatus[status as keyof typeof quoteStatusNames]}
                </strong>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            Valor mensal aceito: <strong>{money(quotes.acceptedValue)}</strong>
          </p>
        </Panel>
      </div>
      <Panel title="Simular plano de aumentos">
        <form
          className="mb-5 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setAppliedLimit(Number(limit))
          }}
        >
          <TextField
            label="Aumento máximo por cliente (%)"
            type="number"
            min="0"
            max="10000"
            step="0.01"
            required
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <Button type="submit" tone="primary" disabled={query.isFetching}>
            {query.isFetching ? 'Simulando…' : 'Simular'}
          </Button>
          <p className="text-xs text-[var(--color-text-muted)]">
            Esta simulação não altera os contratos.
          </p>
          {query.isFetching && (
            <p role="status" className="text-xs text-[var(--color-text-muted)]">
              Atualizando simulação…
            </p>
          )}
        </form>
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            ['Clientes abaixo da tabela', clients.adjustmentPlan.count],
            ['Ganho mensal', money(clients.adjustmentPlan.monthlyGain)],
            ['Ganho anual', money(clients.adjustmentPlan.annualGain)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] p-4"
            >
              <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
              <strong className="mt-1 block text-lg">{value}</strong>
            </div>
          ))}
        </div>
        {clients.adjustmentPlan.entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-[var(--color-text-muted)]">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Atual</th>
                  <th className="p-3">Proposto</th>
                  <th className="p-3">Ganho mensal</th>
                  <th className="p-3">Tabela atingida</th>
                </tr>
              </thead>
              <tbody>
                {clients.adjustmentPlan.entries.map((entry) => (
                  <tr
                    key={entry.clientId}
                    className="border-t border-[var(--color-panel-border)]"
                  >
                    <td className="p-3">
                      <Link
                        className="font-semibold text-[var(--color-brand)]"
                        to={`/honorarios/clientes?cliente=${encodeURIComponent(entry.clientId)}`}
                      >
                        Abrir perfil
                      </Link>
                    </td>
                    <td className="p-3">{money(entry.current)}</td>
                    <td className="p-3">{money(entry.proposed)}</td>
                    <td className="p-3">{money(entry.gain)}</td>
                    <td className="p-3">
                      {entry.full ? 'Sim' : 'Aumento gradual'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Nenhum aumento sugerido para a carteira atual.
          </p>
        )}
      </Panel>
    </div>
  )
}
