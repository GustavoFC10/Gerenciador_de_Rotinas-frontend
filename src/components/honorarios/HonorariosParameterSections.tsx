import { useId, type ReactNode } from 'react'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import Select from '../ui/Select'
import { Panel } from './HonorariosShared'
import type {
  HonorariosBand,
  HonorariosParams,
  HonorariosPlanLevel,
  HonorariosRegime,
} from '../../types/honorarios'
import { money } from '../../utils/honorariosPresentation'
import {
  HONORARIOS_PARAMETER_TABS,
  type HonorariosParameterSection,
} from './honorariosParameterTabs'

interface Props {
  section: HonorariosParameterSection
  params: HonorariosParams
  onChange: (params: HonorariosParams) => void
  disabled: boolean
}

const regimes: { id: HonorariosRegime; name: string }[] = [
  { id: 'mei', name: 'MEI' },
  { id: 'simples', name: 'Simples Nacional' },
  { id: 'presumido', name: 'Lucro Presumido' },
  { id: 'real', name: 'Lucro Real' },
]
const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
const tableClass = 'w-full min-w-[440px] text-left text-sm'
const cellClass = 'px-3 py-3 align-middle'
const headingClass = `${cellClass} text-xs font-bold text-[var(--color-text-muted)]`
const rowClass = 'border-t border-[var(--color-panel-border)]'
const fieldGrid = 'grid gap-4 sm:grid-cols-2'

function ParameterCard({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Panel title={title} actions={actions}>
      <p className="mb-5 text-sm leading-6 text-[var(--color-text-muted)]">
        {description}
      </p>
      <div className="space-y-4">{children}</div>
    </Panel>
  )
}

function NumberField({
  label,
  value,
  onChange,
  currency = false,
  percentage = false,
  ariaLabel,
  min = 0,
  max,
  step = 1,
  readOnly = false,
}: {
  label?: string
  value: number
  onChange: (value: number) => void
  currency?: boolean
  percentage?: boolean
  ariaLabel?: string
  min?: number
  max?: number
  step?: number
  readOnly?: boolean
}) {
  const text = label
    ? `${label}${currency ? ' (R$)' : percentage ? ' (%)' : ''}`
    : undefined
  return (
    <TextField
      label={text}
      aria-label={ariaLabel ?? text}
      value={value}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={currency || percentage ? 0.01 : step}
      required
      readOnly={readOnly}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}

function Toggle({
  children,
  checked,
  onChange,
  ariaLabel,
}: {
  children: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel?: string
}) {
  return (
    <label className="flex min-h-9 items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={ariaLabel}
        className="size-4 accent-[var(--color-brand)]"
      />
      {children}
    </label>
  )
}

function Choices<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => (
          <label key={String(option.value)} className="flex-1 cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name={id}
              value={String(option.value)}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span
              className={`flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border px-3 py-2 text-center text-sm font-bold transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-control-focus)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${value === option.value ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]' : 'border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-muted)]'}`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function nextId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export default function HonorariosParameterSections({
  section,
  params,
  onChange,
  disabled,
}: Props) {
  function set<K extends keyof HonorariosParams>(
    key: K,
    value: HonorariosParams[K],
  ) {
    onChange({ ...params, [key]: value })
  }
  function updatePlan(id: string, patch: Partial<HonorariosPlanLevel>) {
    set('planos', {
      ...params.planos,
      niveis: params.planos.niveis.map((plan) =>
        plan.id === id ? { ...plan, ...patch } : plan,
      ),
    })
  }
  const recommendedGroup = useId()
  let content: ReactNode

  if (section === 'base') {
    content = (
      <>
        <ParameterCard
          title="Valor base por segmento e regime"
          description="Ponto de partida do honorário. Cada regime tem seu valor porque o grau de exigência das obrigações acessórias muda. Deixe 0 onde o regime não se aplica."
          actions={
            <Button
              size="sm"
              disabled={params.segmentos.length >= 100}
              onClick={() =>
                set('segmentos', [
                  ...params.segmentos,
                  {
                    id: nextId('seg'),
                    nome: 'Novo segmento',
                    base: { mei: 0, simples: 0, presumido: 0, real: 0 },
                  },
                ])
              }
            >
              + Segmento
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className={`${tableClass} min-w-[820px]`}>
              <thead>
                <tr>
                  <th scope="col" className={headingClass}>
                    Segmento
                  </th>
                  {regimes.map((regime) => (
                    <th scope="col" key={regime.id} className={headingClass}>
                      {regime.name}
                    </th>
                  ))}
                  <th scope="col" className={headingClass}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {params.segmentos.map((segment, index) => (
                  <tr key={segment.id} className={rowClass}>
                    <td className={`${cellClass} min-w-64`}>
                      <TextField
                        aria-label={`Nome do segmento ${index + 1}`}
                        value={segment.nome}
                        required
                        onChange={(event) =>
                          set(
                            'segmentos',
                            params.segmentos.map((item) =>
                              item.id === segment.id
                                ? { ...item, nome: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    {regimes.map((regime) => (
                      <td key={regime.id} className={`${cellClass} min-w-36`}>
                        <NumberField
                          ariaLabel={`${segment.nome} ${regime.name}`}
                          value={segment.base[regime.id]}
                          currency
                          onChange={(value) =>
                            set(
                              'segmentos',
                              params.segmentos.map((item) =>
                                item.id === segment.id
                                  ? {
                                      ...item,
                                      base: {
                                        ...item.base,
                                        [regime.id]: value,
                                      },
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                    ))}
                    <td className={cellClass}>
                      <Button
                        size="sm"
                        tone="ghost"
                        disabled={params.segmentos.length < 2}
                        aria-label={`Remover segmento ${segment.nome}`}
                        onClick={() =>
                          set(
                            'segmentos',
                            params.segmentos.filter(
                              (item) => item.id !== segment.id,
                            ),
                          )
                        }
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ParameterCard>
        <ParameterCard
          title="Empresa inativa (sem movimento)"
          description="Valor mensal fixo para orçar empresas paradas: só obrigações acessórias sem movimento e acompanhamento de pendências. Não soma faturamento, funcionários, XML ou notas."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {regimes.map((regime) => (
              <NumberField
                key={regime.id}
                label={regime.name}
                ariaLabel={`Inativa ${regime.name}`}
                value={params.inativa[regime.id]}
                currency
                onChange={(value) =>
                  set('inativa', { ...params.inativa, [regime.id]: value })
                }
              />
            ))}
          </div>
        </ParameterCard>
      </>
    )
  } else if (section === 'adicionais') {
    content = (
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ParameterCard
          title="Funcionários"
          description="Folha, eSocial e FGTS Digital por funcionário."
        >
          <div className={fieldGrid}>
            <NumberField
              label="Incluídos na base"
              ariaLabel="Funcionários incluídos na base"
              value={params.funcionarios.incluidos}
              onChange={(value) =>
                set('funcionarios', {
                  ...params.funcionarios,
                  incluidos: value,
                })
              }
            />
            <NumberField
              label="Por funcionário adicional"
              value={params.funcionarios.valor}
              currency
              onChange={(value) =>
                set('funcionarios', { ...params.funcionarios, valor: value })
              }
            />
          </div>
        </ParameterCard>
        <ParameterCard
          title="Sócios com pró-labore"
          description={`Cálculo e guias do pró-labore.${!params.socios.ativo ? ' Desativado: sócios não alteram o honorário.' : ''}`}
          actions={
            <Toggle
              checked={params.socios.ativo}
              ariaLabel="Cobrar por sócio com pró-labore"
              onChange={(value) =>
                set('socios', { ...params.socios, ativo: value })
              }
            >
              {params.socios.ativo ? 'Cobrando' : 'Sem cobrança'}
            </Toggle>
          }
        >
          <div className={fieldGrid}>
            <NumberField
              label="Incluídos na base"
              ariaLabel="Sócios incluídos na base"
              value={params.socios.incluidos}
              onChange={(value) =>
                set('socios', { ...params.socios, incluidos: value })
              }
            />
            <NumberField
              label="Por sócio adicional"
              value={params.socios.valor}
              currency
              onChange={(value) =>
                set('socios', { ...params.socios, valor: value })
              }
            />
          </div>
        </ParameterCard>
        <ParameterCard
          title="Blocos de XML"
          description={`XMLs de entrada e saída importados por mês.${!params.xml.ativo ? ' Desativado: a quantidade de XML não altera o honorário.' : ''}`}
          actions={
            <Toggle
              checked={params.xml.ativo}
              ariaLabel="Cobrar por quantidade de XML"
              onChange={(value) => set('xml', { ...params.xml, ativo: value })}
            >
              {params.xml.ativo ? 'Cobrando' : 'Sem cobrança'}
            </Toggle>
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Franquia"
              value={params.xml.franquia}
              step={10}
              onChange={(value) =>
                set('xml', { ...params.xml, franquia: value })
              }
            />
            <NumberField
              label="Tamanho do bloco"
              value={params.xml.bloco}
              min={1}
              step={1}
              onChange={(value) => set('xml', { ...params.xml, bloco: value })}
            />
            <NumberField
              label="Valor por bloco"
              value={params.xml.valorBloco}
              currency
              onChange={(value) =>
                set('xml', { ...params.xml, valorBloco: value })
              }
            />
          </div>
        </ParameterCard>
        <ParameterCard
          title="Emissão de notas fiscais"
          description="Quando o escritório emite as notas do cliente."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Valor fixo"
              value={params.nf.fixo}
              currency
              onChange={(value) => set('nf', { ...params.nf, fixo: value })}
            />
            <NumberField
              label="Notas incluídas"
              value={params.nf.franquia}
              onChange={(value) => set('nf', { ...params.nf, franquia: value })}
            />
            <NumberField
              label="Por nota adicional"
              value={params.nf.porNota}
              currency
              onChange={(value) => set('nf', { ...params.nf, porNota: value })}
            />
          </div>
        </ParameterCard>
        <ParameterCard
          title="Filiais"
          description="Cada estabelecimento adicional. Você pode cobrar um valor fixo ou um percentual do honorário da matriz."
        >
          <Choices
            label="Formato do valor da filial"
            value={params.filial.modo}
            options={[
              { value: 'fixo', label: 'Valor fixo' },
              { value: 'pct', label: '% da matriz' },
            ]}
            onChange={(value) =>
              set('filial', { ...params.filial, modo: value })
            }
          />
          {params.filial.modo === 'pct' ? (
            <>
              <NumberField
                label="Percentual por filial"
                percentage
                value={params.filial.pct}
                onChange={(value) =>
                  set('filial', { ...params.filial, pct: value })
                }
              />
              <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                Filial ativa: percentual do honorário da matriz. Filial inativa:
                o mesmo percentual sobre o valor de empresa inativa do regime.
                Exemplo no Simples: {money(params.inativa.simples)} ×{' '}
                {params.filial.pct}% ={' '}
                {money((params.inativa.simples * params.filial.pct) / 100)}.
              </p>
            </>
          ) : (
            <div className={fieldGrid}>
              <NumberField
                label="Por filial ativa"
                value={params.filial.valor}
                currency
                onChange={(value) =>
                  set('filial', { ...params.filial, valor: value })
                }
              />
              <NumberField
                label="Por filial inativa"
                value={params.filial.valorInativa}
                currency
                onChange={(value) =>
                  set('filial', { ...params.filial, valorInativa: value })
                }
              />
            </div>
          )}
        </ParameterCard>
      </div>
    )
  } else if (section === 'complexidade') {
    content = (
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ParameterCard
          title="Fator de complexidade por regime"
          description="Multiplica os adicionais por volume (funcionários, sócios, XML, notas e filiais). Use acima de 1 onde cada documento dá mais trabalho."
        >
          <div className={fieldGrid}>
            {regimes.map((regime) => (
              <NumberField
                key={regime.id}
                label={`${regime.name} (×)`}
                ariaLabel={`Fator ${regime.name}`}
                value={params.fatorRegime[regime.id]}
                step={0.05}
                onChange={(value) =>
                  set('fatorRegime', {
                    ...params.fatorRegime,
                    [regime.id]: value,
                  })
                }
              />
            ))}
          </div>
        </ParameterCard>
        <ParameterCard
          title="Horas × mão de obra"
          description="Custo real da equipe por hora (salários, encargos e estrutura divididos pelas horas produtivas) e a margem que você quer sobre ele."
        >
          <div className={fieldGrid}>
            <NumberField
              label="Custo por hora"
              currency
              value={params.horas.custoHora}
              onChange={(value) =>
                set('horas', { ...params.horas, custoHora: value })
              }
            />
            <NumberField
              label="Margem desejada"
              percentage
              max={90}
              value={params.horas.margem}
              onChange={(value) =>
                set('horas', { ...params.horas, margem: value })
              }
            />
          </div>
          <Select
            label="Como usar as horas no preço"
            value={params.horas.metodo}
            onChange={(event) =>
              set('horas', {
                ...params.horas,
                metodo: event.target
                  .value as HonorariosParams['horas']['metodo'],
              })
            }
          >
            <option value="maior">Vale o maior: tabela ou horas</option>
            <option value="horas">Vale sempre o cálculo por horas</option>
          </Select>
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">
            Exemplo: 10 h × {money(params.horas.custoHora)} ={' '}
            {money(10 * params.horas.custoHora)} de custo →{' '}
            {money(
              (10 * params.horas.custoHora) /
                (1 - Math.min(90, params.horas.margem) / 100),
            )}{' '}
            com {params.horas.margem}% de margem.
          </p>
        </ParameterCard>
      </div>
    )
  } else if (section === 'faixas') {
    content = (
      <ParameterCard
        title="Faixas de faturamento mensal"
        description="Acréscimo sobre o valor base conforme o faturamento médio, respeitando o limite de cada regime."
      >
        <div className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] p-4">
          <h3 className="text-sm font-bold">MEI</h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Sem faixas de faturamento. O honorário do MEI não varia com o
            faturamento — vale só o valor base do segmento.
          </p>
        </div>
        <div className="grid gap-5 2xl:grid-cols-3">
          {(
            [
              [
                'faixasSimples',
                'Simples Nacional',
                'Só pode faturar até R$ 400.000 por mês. Configure as faixas dentro desse teto.',
              ],
              [
                'faixasPresumido',
                'Lucro Presumido',
                'Faixas próprias do Lucro Presumido. A última vale para tudo acima do limite anterior.',
              ],
              [
                'faixasReal',
                'Lucro Real',
                'Faixas próprias do Lucro Real. A última vale para tudo acima do limite anterior.',
              ],
            ] as const
          ).map(([key, name, description]) => (
            <BandEditor
              key={key}
              name={name}
              description={description}
              bands={params[key]}
              simples={key === 'faixasSimples'}
              onChange={(value) => set(key, value)}
            />
          ))}
        </div>
      </ParameterCard>
    )
  } else if (section === 'servicos') {
    content = (
      <ParameterCard
        title="Serviços adicionais"
        description="Itens opcionais que entram no cálculo, nos planos e na proposta."
        actions={
          <Button
            size="sm"
            disabled={params.servicos.length >= 100}
            onClick={() =>
              set('servicos', [
                ...params.servicos,
                { id: nextId('sv'), nome: 'Novo serviço', valor: 0 },
              ])
            }
          >
            + Serviço
          </Button>
        }
      >
        {params.servicos.length ? (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={headingClass} scope="col">
                    Serviço
                  </th>
                  <th className={headingClass} scope="col">
                    Valor mensal
                  </th>
                  <th className={headingClass} scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {params.servicos.map((service, index) => (
                  <tr className={rowClass} key={service.id}>
                    <td className={cellClass}>
                      <TextField
                        required
                        aria-label={`Nome do serviço ${index + 1}`}
                        value={service.nome}
                        onChange={(event) =>
                          set(
                            'servicos',
                            params.servicos.map((item) =>
                              item.id === service.id
                                ? { ...item, nome: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className={`${cellClass} w-48`}>
                      <NumberField
                        ariaLabel={`${service.nome} valor mensal`}
                        value={service.valor}
                        currency
                        onChange={(value) =>
                          set(
                            'servicos',
                            params.servicos.map((item) =>
                              item.id === service.id
                                ? { ...item, valor: value }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className={cellClass}>
                      <Button
                        size="sm"
                        tone="ghost"
                        aria-label={`Remover serviço ${service.nome}`}
                        onClick={() =>
                          onChange({
                            ...params,
                            servicos: params.servicos.filter(
                              (item) => item.id !== service.id,
                            ),
                            planos: {
                              ...params.planos,
                              niveis: params.planos.niveis.map((plan) => ({
                                ...plan,
                                servicos: plan.servicos.filter(
                                  (id) => id !== service.id,
                                ),
                              })),
                            },
                          })
                        }
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Nenhum serviço adicional.
          </p>
        )}
      </ParameterCard>
    )
  } else if (section === 'anomalias') {
    content = (
      <ParameterCard
        title="Taxas de exceção"
        description="Percentual extra para clientes que entregam documentos fora do prazo, desorganizados ou que geram retrabalho. Marque no cadastro do cliente ou no cálculo."
        actions={
          <Button
            size="sm"
            disabled={params.anomalias.length >= 100}
            onClick={() =>
              set('anomalias', [
                ...params.anomalias,
                { id: nextId('an'), nome: 'Nova exceção', pct: 10 },
              ])
            }
          >
            + Exceção
          </Button>
        }
      >
        {params.anomalias.length ? (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={headingClass} scope="col">
                    Situação
                  </th>
                  <th className={headingClass} scope="col">
                    Acréscimo
                  </th>
                  <th className={headingClass} scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {params.anomalias.map((anomaly, index) => (
                  <tr className={rowClass} key={anomaly.id}>
                    <td className={cellClass}>
                      <TextField
                        required
                        aria-label={`Situação ${index + 1}`}
                        value={anomaly.nome}
                        onChange={(event) =>
                          set(
                            'anomalias',
                            params.anomalias.map((item) =>
                              item.id === anomaly.id
                                ? { ...item, nome: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className={`${cellClass} w-44`}>
                      <NumberField
                        percentage
                        ariaLabel={`${anomaly.nome} acréscimo (%)`}
                        value={anomaly.pct}
                        onChange={(value) =>
                          set(
                            'anomalias',
                            params.anomalias.map((item) =>
                              item.id === anomaly.id
                                ? { ...item, pct: value }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className={cellClass}>
                      <Button
                        size="sm"
                        tone="ghost"
                        aria-label={`Remover exceção ${anomaly.nome}`}
                        onClick={() =>
                          set(
                            'anomalias',
                            params.anomalias.filter(
                              (item) => item.id !== anomaly.id,
                            ),
                          )
                        }
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Nenhuma taxa de exceção cadastrada.
          </p>
        )}
      </ParameterCard>
    )
  } else if (section === 'planos') {
    content = (
      <ParameterCard
        title="Planos de venda"
        description="Monte até três níveis com o que você quer ofertar em cada um. O orçamento gera os preços para o mesmo cliente e a proposta apresenta lado a lado."
        actions={
          <Toggle
            checked={params.planos.ativo}
            onChange={(value) =>
              set('planos', { ...params.planos, ativo: value })
            }
          >
            Ofertar em planos
          </Toggle>
        }
      >
        <div className="grid items-start gap-4 xl:grid-cols-3">
          {params.planos.niveis.map((plan, index) => (
            <section
              key={plan.id}
              aria-label={`Nível ${index + 1}`}
              className={`space-y-4 rounded-[var(--radius-control)] border p-4 ${plan.destaque ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)]'}`}
            >
              <Toggle
                checked={plan.ativo}
                onChange={(value) => updatePlan(plan.id, { ativo: value })}
              >
                Nível {index + 1} ativo
              </Toggle>
              <TextField
                label="Nome do plano"
                aria-label={`Nome do plano ${index + 1}`}
                required
                value={plan.nome}
                onChange={(event) =>
                  updatePlan(plan.id, { nome: event.target.value })
                }
              />
              <TextField
                label="Descrição curta"
                aria-label={`Descrição do plano ${index + 1}`}
                value={plan.descricao}
                onChange={(event) =>
                  updatePlan(plan.id, { descricao: event.target.value })
                }
              />
              <Toggle
                checked={plan.emiteNF}
                onChange={(value) => updatePlan(plan.id, { emiteNF: value })}
              >
                Inclui emissão de notas fiscais
              </Toggle>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">
                  Serviços incluídos
                </legend>
                <div className="space-y-2">
                  {params.servicos.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={plan.servicos.includes(service.id)}
                        onChange={(event) =>
                          updatePlan(plan.id, {
                            servicos: event.target.checked
                              ? [...plan.servicos, service.id]
                              : plan.servicos.filter((id) => id !== service.id),
                          })
                        }
                        className="mt-1 accent-[var(--color-brand)]"
                      />
                      {service.nome}
                    </label>
                  ))}
                  {!params.servicos.length && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Cadastre serviços na aba Serviços para incluí-los nos
                      planos.
                    </p>
                  )}
                </div>
              </fieldset>
              <NumberField
                label="Ajuste sobre o preço calculado"
                ariaLabel={`Ajuste do plano ${index + 1} (%)`}
                percentage
                min={-100}
                value={plan.ajuste}
                onChange={(value) => updatePlan(plan.id, { ajuste: value })}
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Use negativo para desconto de pacote.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name={recommendedGroup}
                  checked={plan.destaque}
                  onChange={() =>
                    set('planos', {
                      ...params.planos,
                      niveis: params.planos.niveis.map((item) => ({
                        ...item,
                        destaque: item.id === plan.id,
                      })),
                    })
                  }
                  className="mt-1 accent-[var(--color-brand)]"
                />
                Destacar como recomendado
              </label>
            </section>
          ))}
        </div>
        <p className="text-xs leading-5 text-[var(--color-text-muted)]">
          Os planos partem do perfil do cliente (regime, faturamento,
          funcionários, XMLs) e trocam só notas e serviços. Desative níveis para
          ofertar apenas dois.
        </p>
      </ParameterCard>
    )
  } else if (section === 'cobranca') {
    const indices = params.indices
    content = (
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ParameterCard
          title="Parcelas por ano"
          description="Define o total anual, os valores do painel e o texto padrão da proposta. Em cada orçamento você ainda pode trocar."
        >
          <Choices
            label="Parcelas por ano"
            value={params.decimoTerceiro}
            options={[
              { value: false, label: '12 parcelas' },
              { value: true, label: '13 parcelas' },
            ]}
            onChange={(value) => set('decimoTerceiro', value)}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            {params.decimoTerceiro
              ? '12 mensais + 13ª em dezembro, referente ao encerramento anual.'
              : '12 mensais, sem 13ª parcela.'}
          </p>
        </ParameterCard>
        <ParameterCard
          title="Dia de vencimento"
          description="Dia do mês em que o honorário vence. Aparece nas condições da proposta."
        >
          <Choices
            label="Dia de vencimento"
            value={params.vencimento}
            options={[
              { value: 10, label: 'Dia 10' },
              { value: 20, label: 'Dia 20' },
              ...(![10, 20].includes(params.vencimento)
                ? [
                    {
                      value: params.vencimento,
                      label: `Dia ${params.vencimento}`,
                    },
                  ]
                : []),
            ]}
            onChange={(value) => set('vencimento', value)}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            Vencimento todo dia {params.vencimento} de cada mês. Orçamentos já
            salvos mantêm o dia de quando foram feitos.
          </p>
        </ParameterCard>
        <div className="xl:col-span-2">
          <ParameterCard
            title="Limite do reajuste"
            description="O reajuste anual nunca passa do valor da tabela, ou seja, do que um contrato novo pagaria no mesmo perfil. Clientes antigos que já chegaram nesse valor ficam com o reajuste travado."
            actions={
              <Toggle
                checked={params.reajusteTeto}
                ariaLabel="Limitar reajuste ao valor da tabela"
                onChange={(value) => set('reajusteTeto', value)}
              >
                {params.reajusteTeto ? 'Ligado' : 'Desligado'}
              </Toggle>
            }
          >
            <p className="text-xs text-[var(--color-text-muted)]">
              O teto não reduz contratos que já estejam acima da tabela.
            </p>
          </ParameterCard>
        </div>
        <ParameterCard
          title="Quando reajustar"
          description="Data usada nos alertas do painel e descrita na proposta."
        >
          <Choices
            label="Periodicidade"
            value={indices.periodicidade}
            options={[
              { value: 'aniversario', label: 'A cada 12 meses' },
              { value: 'janeiro', label: 'Em janeiro de cada ano' },
            ]}
            onChange={(value) =>
              set('indices', { ...indices, periodicidade: value })
            }
          />
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">
            {indices.periodicidade === 'janeiro'
              ? 'Todos os contratos reajustam em janeiro. O aviso aparece a partir de dezembro.'
              : 'Cada contrato reajusta no aniversário da data de início ou do último reajuste.'}
          </p>
          {indices.periodicidade === 'janeiro' && (
            <>
              <Select
                label="Contratos novos não reajustam no primeiro janeiro se começaram a partir de"
                value={indices.carencia}
                onChange={(event) =>
                  set('indices', {
                    ...indices,
                    carencia: Number(event.target.value),
                  })
                }
              >
                <option value="0">Sempre reajustar no primeiro janeiro</option>
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </Select>
              <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                {indices.carencia
                  ? `Contratos iniciados a partir de ${months[indices.carencia - 1].toLowerCase()} pulam o primeiro janeiro. Iniciados antes disso, reajustam no janeiro seguinte.`
                  : 'Todo contrato reajusta no primeiro janeiro, mesmo que tenha começado em dezembro.'}
              </p>
            </>
          )}
        </ParameterCard>
        <div className="xl:col-span-2">
          <ParameterCard
            title="Percentual do reajuste anual"
            description="Escolha um índice de inflação ou um percentual fixo definido por você."
          >
            <Choices
              label="Base do reajuste"
              value={indices.usar}
              options={[
                { value: 'ipca', label: 'IPCA' },
                { value: 'igpm', label: 'IGP-M' },
                { value: 'fixo', label: 'Percentual fixo' },
              ]}
              onChange={(value) => set('indices', { ...indices, usar: value })}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                label="IPCA 12 meses"
                percentage
                value={indices.ipca.pct}
                onChange={(value) =>
                  set('indices', {
                    ...indices,
                    ipca: { ...indices.ipca, pct: value },
                  })
                }
              />
              <NumberField
                label="IGP-M 12 meses"
                percentage
                value={indices.igpm.pct}
                onChange={(value) =>
                  set('indices', {
                    ...indices,
                    igpm: { ...indices.igpm, pct: value },
                  })
                }
              />
              <NumberField
                label="Percentual fixo"
                percentage
                value={indices.fixo.pct}
                onChange={(value) =>
                  set('indices', {
                    ...indices,
                    fixo: { ...indices.fixo, pct: value },
                  })
                }
              />
            </div>
            <TextField
              label="Referência dos índices"
              placeholder="acumulado 12 meses até set/2026"
              value={indices.referencia}
              onChange={(event) =>
                set('indices', { ...indices, referencia: event.target.value })
              }
            />
            <div className="rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] p-3 text-sm">
              <p className="text-xs text-[var(--color-text-muted)]">
                Texto na proposta
              </p>
              <p className="mt-1 font-semibold">
                Reajuste{' '}
                {indices.periodicidade === 'janeiro'
                  ? 'em janeiro de cada ano'
                  : 'a cada 12 meses, no aniversário do contrato'}
                , pelo índice {indices[indices.usar].nome}.
              </p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Os índices são informados manualmente. Atualize os percentuais e a
              referência do período.
            </p>
          </ParameterCard>
        </div>
        <ParameterCard
          title="Descontos e reajustes"
          description="Limites usados no orçamento e no plano de reajuste do painel."
        >
          <div className={fieldGrid}>
            <NumberField
              label="Desconto máximo"
              percentage
              max={100}
              value={params.descontoMax}
              onChange={(value) => set('descontoMax', value)}
            />
            <NumberField
              label="Aumento máximo por cliente"
              percentage
              value={params.reajusteMax}
              onChange={(value) => set('reajusteMax', value)}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Desconto acima do limite gera aviso e continua permitido.
          </p>
        </ParameterCard>
      </div>
    )
  } else {
    content = (
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ParameterCard
          title="Arredondamento"
          description="O valor final sobe para o próximo múltiplo."
        >
          <NumberField
            label="Arredondar para múltiplos de"
            currency
            value={params.arredondamento}
            onChange={(value) => set('arredondamento', value)}
          />
        </ParameterCard>
        <ParameterCard
          title="Tolerância da comparação"
          description="Diferença aceita para considerar o cliente alinhado."
        >
          <NumberField
            label="Tolerância"
            percentage
            max={100}
            value={params.tolerancia}
            onChange={(value) => set('tolerancia', value)}
          />
        </ParameterCard>
      </div>
    )
  }

  return (
    <fieldset
      disabled={disabled}
      className="honorarios-parameter-sections min-w-0 space-y-5"
    >
      <legend className="sr-only">
        {HONORARIOS_PARAMETER_TABS.find((tab) => tab.id === section)?.label}
      </legend>
      {content}
    </fieldset>
  )
}

function BandEditor({
  name,
  description,
  bands,
  simples,
  onChange,
}: {
  name: string
  description: string
  bands: HonorariosBand[]
  simples: boolean
  onChange: (bands: HonorariosBand[]) => void
}) {
  function update(index: number, patch: Partial<HonorariosBand>) {
    onChange(
      bands.map((band, i) => (i === index ? { ...band, ...patch } : band)),
    )
  }
  function add() {
    if (bands.length >= 100) return
    if (simples) {
      const end = bands.at(-1)?.ate ?? 400000
      const previous = bands.at(-2)?.ate ?? 0
      const next = Math.round((previous + (end - previous) / 2) * 100) / 100
      if (next <= previous || next >= end) return
      onChange([
        ...bands.slice(0, -1),
        { ate: next, pct: bands.at(-1)?.pct ?? 0 },
        { ate: end, pct: bands.at(-1)?.pct ?? 0 },
      ])
    } else {
      const last = bands.at(-1) ?? { ate: null, pct: 0 }
      const previous = bands.at(-2)?.ate ?? 0
      onChange([
        ...bands.slice(0, -1),
        { ate: previous ? previous * 2 : 30000, pct: last.pct },
        { ...last, ate: null },
      ])
    }
  }
  return (
    <section className="min-w-0 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">{name}</h3>
          <p className="mt-2 text-sm leading-5 text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
        <Button
          size="sm"
          disabled={
            bands.length >= 100 ||
            (simples &&
              (bands.at(-1)?.ate ?? 400000) - (bands.at(-2)?.ate ?? 0) <= 0.01)
          }
          aria-label={`Adicionar faixa ${name}`}
          onClick={add}
        >
          + Faixa
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={headingClass} scope="col">
                Faturamento até
              </th>
              <th className={headingClass} scope="col">
                Acréscimo
              </th>
              <th className={headingClass} scope="col">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band, index) => (
              <tr key={index} className={rowClass}>
                <td className={cellClass}>
                  {band.ate === null ? (
                    <span className="text-[var(--color-text-muted)]">
                      Acima da faixa anterior
                    </span>
                  ) : (
                    <NumberField
                      currency
                      ariaLabel={`${name} limite da faixa ${index + 1}`}
                      min={(bands[index - 1]?.ate ?? 0) + 0.01}
                      max={simples ? 400000 : undefined}
                      readOnly={simples && index === bands.length - 1}
                      value={band.ate}
                      onChange={(value) => update(index, { ate: value })}
                    />
                  )}
                </td>
                <td className={cellClass}>
                  <NumberField
                    percentage
                    ariaLabel={`${name} acréscimo da faixa ${index + 1} (%)`}
                    value={band.pct}
                    onChange={(value) => update(index, { pct: value })}
                  />
                </td>
                <td className={cellClass}>
                  {index < bands.length - 1 && (
                    <Button
                      size="sm"
                      tone="ghost"
                      aria-label={`Remover faixa ${index + 1} ${name}`}
                      onClick={() =>
                        onChange(bands.filter((_, i) => i !== index))
                      }
                    >
                      Remover
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
