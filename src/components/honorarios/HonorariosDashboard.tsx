import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import Card from '../ui/Card'
import TextField from '../ui/TextField'
import Button from '../ui/Button'
import Dialog from '../ui/Dialog'
import { Notice, Panel } from './HonorariosShared'
import { honorariosService } from '../../services/honorariosService'
import type { HonorariosConfiguration } from '../../types/honorarios'
import { money, regimeNames } from '../../utils/honorariosPresentation'
import { getErrorPresentation } from '../../utils/apiErrors'
import { buttonTone, focusRing } from '../../constants/designTokens'

const actionClass = `inline-flex min-h-8 items-center justify-center rounded-[var(--radius-control)] px-3 text-xs font-semibold transition ${focusRing}`
const alignmentLabels = {
  abaixo: 'Podem aumentar',
  alinhado: 'Alinhados',
  acima: 'Acima',
} as const
const regimeOrder = ['simples', 'presumido', 'real', 'mei'] as const

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
  const [simulationOpen, setSimulationOpen] = useState(false)
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
        <div aria-hidden="true" className="hon-dashboard-kpis mt-5">
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
  const annualPotential =
    Number(clients.potential) * (configuration.params.decimoTerceiro ? 13 : 12)
  // The chart shows the full gap to the parameter, not the capped simulation gain.
  const opportunities = clients.adjustmentPlan.entries
    .map((entry) => ({
      ...entry,
      potential: Math.max(
        0,
        Number(entry.parameterFee) - Number(entry.currentFee),
      ),
    }))
    .filter((entry) => entry.potential > 0)
    .sort(
      (a, b) =>
        b.potential - a.potential ||
        a.companyName.localeCompare(b.companyName, 'pt-BR') ||
        a.clientId.localeCompare(b.clientId),
    )
    .slice(0, 8)
  const maximumOpportunity = Math.max(
    1,
    ...opportunities.map((entry) => entry.potential),
  )
  const regimeMaximum = Math.max(
    1,
    ...Object.values(clients.byRegime ?? {}).flatMap((entry) => [
      Number(entry.current),
      Number(entry.byParameters),
    ]),
  )

  return (
    <div className="honorarios-dashboard space-y-5">
      {showIntro && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
            Painel da carteira
          </h2>
          <Link
            to="/honorarios/orcamentos"
            className={`${actionClass} ${buttonTone.neutral}`}
          >
            {canEdit ? 'Orçamentos' : 'Consultar orçamentos'}
          </Link>
        </div>
      )}
      {isEmpty && (
        <Panel title="Comece a organizar seus honorários">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">
              {canEdit
                ? 'Vincule as empresas da carteira para acompanhar os honorários e as oportunidades de reajuste.'
                : 'Seu acesso permite consultar a carteira e simular valores. Os cadastros são feitos por quem possui permissão de operação.'}
            </p>
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
        className="hon-dashboard-kpis"
      >
        {[
          [
            'Total de clientes',
            String(clients.count),
            clients.count
              ? 'Ticket médio ' + money(Number(clients.current) / clients.count)
              : 'Nenhum perfil financeiro ativo',
          ],
          [
            'Faturamento mensal',
            money(clients.current),
            'Pelos parâmetros: ' + money(clients.suggested),
          ],
          [
            'Potencial de aumento',
            money(clients.potential),
            money(annualPotential) + ' por ano',
          ],
          [
            'Reajustes pendentes',
            String(clients.adjustmentsDue),
            'Vencidos ou em até 30 dias',
          ],
        ].map(([label, value, caption]) => (
          <Card key={label} variant="metric" className="hon-dashboard-kpi">
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{caption}</small>
          </Card>
        ))}
      </section>
      <div className="hon-dashboard-grid">
        <Card className="hon-dashboard-panel">
          <header>
            <h2>Oportunidade de aumento de receita</h2>
            <Link
              to="/honorarios/clientes"
              className={`${actionClass} ${buttonTone.neutral}`}
            >
              Ver todos
            </Link>
          </header>
          <div className="hon-dashboard-body">
            <div className="hon-dashboard-revenue">
              <strong>+{money(clients.potential)}/mês</strong>
              <span>
                {clients.byAlignment.abaixo} clientes podem se aproximar dos
                parâmetros
              </span>
            </div>
            {opportunities.length ? (
              <div className="hon-dashboard-opportunities">
                {opportunities.map((entry) => (
                  <Link
                    key={entry.clientId}
                    to={`/honorarios/clientes?cliente=${encodeURIComponent(entry.clientId)}`}
                    title={`${entry.companyName}: atual ${money(entry.currentFee)} · pelos parâmetros ${money(entry.parameterFee)}`}
                    className={focusRing}
                  >
                    <span className="hon-dashboard-company">
                      {entry.companyName}
                    </span>
                    <span className="hon-dashboard-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${(entry.potential / maximumOpportunity) * 100}%`,
                        }}
                      />
                    </span>
                    <strong>
                      +{money(entry.potential)}
                      <small>/mês</small>
                    </strong>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="hon-dashboard-unavailable">
                {clients.byAlignment.abaixo === 0
                  ? 'Nenhum aumento sugerido para a carteira atual.'
                  : 'Detalhamento das oportunidades indisponível no momento.'}
              </p>
            )}
            <div className="hon-dashboard-secondary-action">
              <Button size="sm" onClick={() => setSimulationOpen(true)}>
                Simular aumentos
              </Button>
            </div>
          </div>
        </Card>
        <Card className="hon-dashboard-panel">
          <header>
            <h2>Situação da carteira</h2>
          </header>
          <div className="hon-dashboard-body">
            <div
              className="hon-dashboard-alignment"
              role="img"
              aria-label={Object.entries(alignmentLabels)
                .map(
                  ([key, label]) =>
                    `${label}: ${clients.byAlignment[key as keyof typeof alignmentLabels]}`,
                )
                .join(', ')}
            >
              {Object.keys(alignmentLabels).map((key) => {
                const count =
                  clients.byAlignment[key as keyof typeof alignmentLabels]
                return count > 0 ? (
                  <span
                    key={key}
                    data-fee-alignment={key}
                    style={{ flex: count }}
                  />
                ) : null
              })}
            </div>
            <div className="hon-dashboard-legend">
              {Object.entries(alignmentLabels).map(([key, label]) => (
                <span key={key} data-fee-alignment={key}>
                  <i aria-hidden="true" />
                  {label}{' '}
                  <b>
                    {clients.byAlignment[key as keyof typeof alignmentLabels]}
                  </b>
                </span>
              ))}
            </div>
            <div className="hon-dashboard-part">
              <h3>Orçamentos</h3>
              <dl className="hon-dashboard-summary">
                <div>
                  <dt>Em aberto</dt>
                  <dd>
                    <Link to="/honorarios/orcamentos" className={focusRing}>
                      {quotes.openCount} · {money(quotes.openValue)}/mês
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Aceitos no ano</dt>
                  <dd>
                    <Link
                      to="/honorarios/orcamentos?status=aceito"
                      title={`Orçamentos aceitos em ${year}: ${money(quotes.acceptedValue)}/mês`}
                      className={focusRing}
                    >
                      {quotes.byStatus.aceito}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Taxa de aceite</dt>
                  <dd>
                    {quotes.acceptanceRate === null
                      ? '—'
                      : Math.round(quotes.acceptanceRate * 100) + '%'}
                  </dd>
                </div>
              </dl>
              {quotes.count === 0 && (
                <p className="hon-dashboard-unavailable">
                  Nenhuma proposta registrada neste ano.
                </p>
              )}
              {quotes.expiringCount > 0 && (
                <p className="hon-dashboard-unavailable">
                  {quotes.expiringCount} proposta(s) vence(m) nos próximos três
                  dias.
                </p>
              )}
            </div>
            <div className="hon-dashboard-part">
              <h3>Atual × parâmetro por regime</h3>
              <div className="hon-dashboard-regime-key">
                <span>Cobrado hoje</span>
                <span>Valor pelos parâmetros</span>
              </div>
              {clients.byRegime ? (
                <div className="hon-dashboard-regimes">
                  {regimeOrder.map((regime) => {
                    const entry = clients.byRegime![regime] ?? {
                      count: 0,
                      current: '0.00',
                      byParameters: '0.00',
                    }
                    return (
                      <div
                        key={regime}
                        className="hon-dashboard-regime"
                        role="img"
                        aria-label={`${regimeNames[regime]}: cobrado hoje ${money(entry.current)}, pelos parâmetros ${money(entry.byParameters)}`}
                        title={`${money(entry.current)} / ${money(entry.byParameters)}`}
                      >
                        <span>{regimeNames[regime]}</span>
                        <div>
                          <span
                            style={{
                              width: `${(Number(entry.byParameters) / regimeMaximum) * 100}%`,
                            }}
                          />
                          <b
                            style={{
                              width: `${(Number(entry.current) / regimeMaximum) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="hon-dashboard-unavailable">
                  Comparativo por regime indisponível no momento.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
      <Dialog
        open={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        title="Simular plano de aumentos"
        size="lg"
      >
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
                        {entry.companyName}
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
      </Dialog>
    </div>
  )
}
