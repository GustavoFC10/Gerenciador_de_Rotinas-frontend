import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Button from '../ui/Button'
import Select from '../ui/Select'
import TextField from '../ui/TextField'
import Textarea from '../ui/Textarea'
import { honorariosService } from '../../services/honorariosService'
import { isApiError } from '../../services/httpClient'
import type { HonorariosConfiguration } from '../../types/honorarios'
import { getErrorPresentation } from '../../utils/apiErrors'
import { History, Notice, Panel } from './HonorariosShared'

interface Props {
  configuration: HonorariosConfiguration
  canEdit: boolean
  canManage: boolean
  scopeKey: readonly unknown[]
  onDenied?: (error: unknown) => void
  onConfigurationSaved?: (configuration: HonorariosConfiguration) => void
}

const names: Record<string, string> = {
  segmentos: 'Segmentos e valores base',
  base: 'Honorário base por regime',
  id: 'Identificador',
  nome: 'Nome',
  mei: 'MEI',
  simples: 'Simples Nacional',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  faixasSimples: 'Faixas do Simples Nacional',
  faixasPresumido: 'Faixas do Lucro Presumido',
  faixasReal: 'Faixas do Lucro Real',
  ate: 'Faturamento até (vazio = sem limite)',
  pct: 'Percentual (%)',
  fatorRegime: 'Fator dos adicionais por regime',
  inativa: 'Honorário para empresas inativas',
  funcionarios: 'Funcionários',
  socios: 'Sócios',
  incluidos: 'Quantidade incluída',
  valor: 'Valor (R$)',
  ativo: 'Ativo',
  xml: 'Documentos XML',
  bloco: 'Tamanho do bloco',
  franquia: 'Franquia incluída',
  valorBloco: 'Valor por bloco (R$)',
  nf: 'Emissão de notas fiscais',
  fixo: 'Valor fixo (R$)',
  porNota: 'Valor por nota excedente (R$)',
  filial: 'Filiais',
  modo: 'Forma de cobrança',
  valorInativa: 'Filial inativa (R$)',
  horas: 'Custo por horas',
  custoHora: 'Custo da hora (R$)',
  margem: 'Margem (%)',
  metodo: 'Método de cálculo',
  servicos: 'Serviços adicionais',
  anomalias: 'Exceções operacionais',
  arredondamento: 'Arredondar para cima (R$)',
  decimoTerceiro: 'Cobrar 13º honorário',
  descontoMax: 'Desconto de alerta (%)',
  tolerancia: 'Tolerância de alinhamento (%)',
  reajusteMax: 'Aumento máximo no plano (%)',
  reajusteTeto: 'Limitar reajuste à tabela',
  vencimento: 'Dia do vencimento',
  indices: 'Índices e periodicidade',
  carencia: 'Carência de janeiro: mês inicial (0 = desligada)',
  ipca: 'IPCA',
  igpm: 'IGP-M',
  usar: 'Índice utilizado',
  periodicidade: 'Periodicidade',
  referencia: 'Referência do índice',
  planos: 'Planos comerciais',
  niveis: 'Níveis dos planos',
  ajuste: 'Ajuste do plano (%)',
  descricao: 'Descrição',
  destaque: 'Destacar plano',
  emiteNF: 'Inclui emissão de notas',
}

const options: Record<string, { value: string; label: string }[]> = {
  modo: [
    { value: 'fixo', label: 'Valor fixo' },
    { value: 'pct', label: 'Percentual' },
  ],
  metodo: [
    { value: 'maior', label: 'Maior entre tabela e horas' },
    { value: 'horas', label: 'Valor por horas' },
  ],
  usar: [
    { value: 'ipca', label: 'IPCA' },
    { value: 'igpm', label: 'IGP-M' },
    { value: 'fixo', label: 'Percentual fixo' },
  ],
  periodicidade: [
    { value: 'aniversario', label: 'A cada 12 meses' },
    { value: 'janeiro', label: 'Em janeiro de cada ano' },
  ],
}

function ParameterEditor({
  name,
  value,
  onChange,
  disabled,
  services,
  serviceSelection = false,
}: {
  name: string
  value: unknown
  onChange: (value: unknown) => void
  disabled: boolean
  services: { id: string; nome: string }[]
  serviceSelection?: boolean
}) {
  const label =
    name === 'fixo' && value && typeof value === 'object'
      ? 'Percentual fixo'
      : (names[name] ?? name)
  if (Array.isArray(value)) {
    const items = value
    if (serviceSelection)
      return (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">{label}</legend>
          {services.map((service) => (
            <label className="flex items-center gap-2 text-sm" key={service.id}>
              <input
                type="checkbox"
                checked={value.includes(service.id)}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...value, service.id]
                      : value.filter((id) => id !== service.id),
                  )
                }
              />
              {service.nome}
            </label>
          ))}
        </fieldset>
      )
    const example = value[0]
    function addItem() {
      if (example && typeof example === 'object') {
        const copy: Record<string, unknown> = structuredClone(example)
        if ('id' in copy) copy.id = `novo_${crypto.randomUUID().slice(0, 8)}`
        if ('nome' in copy) copy.nome = 'Novo item'
        onChange([...items, copy])
      } else {
        const templates: Record<string, unknown> = {
          segmentos: {
            id: 'novo',
            nome: 'Novo segmento',
            base: { mei: 0, simples: 0, presumido: 0, real: 0 },
          },
          servicos: { id: 'novo', nome: 'Novo serviço', valor: 0 },
          anomalias: { id: 'nova', nome: 'Nova exceção', pct: 0 },
          niveis: {
            id: 'novo',
            nome: 'Novo plano',
            descricao: '',
            ativo: true,
            destaque: false,
            emiteNF: false,
            servicos: [],
            ajuste: 0,
          },
        }
        onChange([...items, templates[name] ?? { ate: null, pct: 0 }])
      }
    }
    return (
      <fieldset className="space-y-3">
        <legend className="mb-3 text-base font-bold">{label}</legend>
        {value.map((item, index) => (
          <div
            key={index}
            className="space-y-3 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-4"
          >
            <ParameterEditor
              name={String(index + 1)}
              value={item}
              disabled={disabled}
              services={services}
              onChange={(next) =>
                onChange(
                  value.map((current, i) => (i === index ? next : current)),
                )
              }
            />
            {!disabled && (
              <Button
                size="sm"
                tone="ghost"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Remover item {index + 1}
              </Button>
            )}
          </div>
        ))}
        {!disabled && (
          <Button size="sm" onClick={addItem}>
            Adicionar item
          </Button>
        )}
      </fieldset>
    )
  }
  if (value && typeof value === 'object')
    return (
      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-bold">{label}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(value).map(([key, nested]) => (
            <div
              key={key}
              className={
                nested && typeof nested === 'object' ? 'sm:col-span-2' : ''
              }
            >
              <ParameterEditor
                name={key}
                value={nested}
                disabled={disabled}
                services={services}
                serviceSelection={key === 'servicos' && 'emiteNF' in value}
                onChange={(next) => onChange({ ...value, [key]: next })}
              />
            </div>
          ))}
        </div>
      </fieldset>
    )
  if (typeof value === 'boolean')
    return (
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={disabled}
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>
    )
  if (options[name] && typeof value === 'string')
    return (
      <Select
        label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {!options[name].some((option) => option.value === value) && (
          <option value={value}>{value}</option>
        )}
        {options[name].map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    )
  if (typeof value === 'number' || value === null)
    return (
      <TextField
        label={label}
        type="number"
        min={0}
        step="any"
        value={value === null ? '' : (value as number)}
        disabled={disabled}
        max={name === 'margem' ? 90 : undefined}
        onChange={(event) =>
          onChange(
            event.target.value === '' && name === 'ate'
              ? null
              : Number(event.target.value),
          )
        }
      />
    )
  return (
    <TextField
      label={label}
      value={String(value ?? '')}
      disabled={disabled}
      maxLength={name === 'id' ? 100 : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export default function HonorariosSettings(props: Props) {
  return <SettingsDraft {...props} />
}

function SettingsDraft({
  configuration,
  canManage,
  scopeKey,
  onDenied,
  onConfigurationSaved,
}: Props) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(() => structuredClone(configuration))
  const [baseline, setBaseline] = useState(() => structuredClone(configuration))
  const [section, setSection] = useState('escritorio')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rejectedConflict, setConflict] = useState(false)
  const [history, setHistory] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const changed =
    JSON.stringify([draft.params, draft.office]) !==
    JSON.stringify([baseline.params, baseline.office])
  const externalConflict = configuration.version !== baseline.version
  const conflict = rejectedConflict || externalConflict
  useEffect(() => {
    if (
      !changed &&
      !rejectedConflict &&
      configuration.version !== baseline.version
    ) {
      setDraft(structuredClone(configuration))
      setBaseline(structuredClone(configuration))
    }
  }, [configuration, baseline.version, changed, rejectedConflict])
  function officeChange(key: string, value: unknown) {
    setDraft((current) => ({
      ...current,
      office: { ...current.office, [key]: value },
    }))
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!canManage || saving || conflict) return
    setSaving(true)
    setError('')
    setNotice('')
    const abort = new AbortController()
    request.current = abort
    try {
      const saved = await honorariosService.saveConfiguration(
        {
          version: draft.version,
          params: draft.params,
          office: draft.office,
        },
        abort.signal,
      )
      if (abort.signal.aborted) return
      const result = { ...saved, permissions: configuration.permissions }
      setDraft(structuredClone(result))
      setBaseline(structuredClone(result))
      onConfigurationSaved?.(result)
      await queryClient.invalidateQueries({ queryKey: scopeKey })
      setNotice(
        'Parâmetros salvos. A carteira passa a usar a nova tabela; as propostas anteriores mantêm os valores registrados.',
      )
    } catch (caught) {
      if (abort.signal.aborted) return
      onDenied?.(caught)
      setError(getErrorPresentation(caught).message)
      if (isApiError(caught) && caught.status === 409) setConflict(true)
    } finally {
      if (!abort.signal.aborted) setSaving(false)
    }
  }
  async function reload() {
    setSaving(true)
    setError('')
    try {
      const result = await honorariosService.configuration()
      setDraft(structuredClone(result))
      setBaseline(structuredClone(result))
      onConfigurationSaved?.(result)
      setConflict(false)
      setNotice(
        'Configuração atual carregada. Confira os dados antes de editar.',
      )
    } catch (caught) {
      onDenied?.(caught)
      setError(getErrorPresentation(caught).message)
    } finally {
      setSaving(false)
    }
  }
  async function logo(file?: File) {
    if (!file) return
    setError('')
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Selecione um logo PNG ou JPEG.')
      return
    }
    if (file.size > 149000) {
      setError(
        'O logo deve ter até 149 KB para caber no limite de armazenamento.',
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result)
      if (data.length > 200000)
        setError('O logo ultrapassa o limite de tamanho.')
      else officeChange('logo', data)
    }
    reader.onerror = () => setError('Não foi possível ler o logo.')
    reader.readAsDataURL(file)
  }
  const categories = [
    { id: 'escritorio', label: 'Escritório' },
    { id: 'tabela', label: 'Tabela e adicionais' },
    { id: 'cobranca', label: 'Cobrança e reajuste' },
    { id: 'planos', label: 'Planos' },
  ]
  const billing = [
    'arredondamento',
    'decimoTerceiro',
    'descontoMax',
    'tolerancia',
    'reajusteMax',
    'reajusteTeto',
    'vencimento',
    'indices',
  ]
  const office = draft.office
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Parâmetros de honorários</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Tabela versão {draft.version}. Alterações ficam em rascunho até
            salvar.
          </p>
        </div>
        <Button onClick={() => setHistory(!history)}>
          {history ? 'Fechar histórico' : 'Histórico da configuração'}
        </Button>
      </div>
      {!canManage && (
        <Notice>
          Seu acesso permite consultar os parâmetros. A edição está disponível à
          administração de Honorários.
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}
      {conflict && (
        <Notice tone="error">
          A configuração foi alterada por outra pessoa. Recarregue a versão
          atual antes de salvar novamente. Seu rascunho foi preservado;
          recarregar substitui suas alterações pela versão atual.{' '}
          <Button onClick={() => void reload()} disabled={saving}>
            Recarregar configuração
          </Button>
        </Notice>
      )}
      {history && (
        <Panel title="Histórico da configuração">
          <History
            scopeKey={[...scopeKey, 'configuration-history']}
            onDenied={onDenied}
            load={(page, signal) =>
              honorariosService.configurationHistory(
                { page, pageSize: 20 },
                signal,
              )
            }
          />
        </Panel>
      )}
      <nav aria-label="Seções dos parâmetros" className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            tone={section === category.id ? 'selected' : 'neutral'}
            onClick={() => setSection(category.id)}
          >
            {category.label}
          </Button>
        ))}
      </nav>
      <form onSubmit={(event) => void save(event)} className="space-y-5">
        <fieldset
          disabled={!canManage || saving || conflict}
          className="space-y-5"
        >
          {section === 'escritorio' ? (
            <>
              <Panel title="Identidade e contato">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ['nome', 'Nome do escritório'],
                      ['crc', 'CRC'],
                      ['cidade', 'Cidade'],
                      ['telefone', 'Telefone'],
                      ['email', 'E-mail'],
                      ['site', 'Site'],
                    ] as const
                  ).map(([key, label]) => (
                    <TextField
                      key={key}
                      label={label}
                      value={String(office[key] ?? '')}
                      type={key === 'email' ? 'email' : 'text'}
                      onChange={(event) =>
                        officeChange(key, event.target.value)
                      }
                    />
                  ))}
                  <TextField
                    label="Validade padrão das propostas (dias)"
                    type="number"
                    min={1}
                    max={365}
                    value={office.validadeDias}
                    onChange={(event) =>
                      officeChange('validadeDias', Number(event.target.value))
                    }
                  />
                </div>
              </Panel>
              <Panel title="Logo das propostas">
                <div className="flex flex-wrap items-center gap-4">
                  {office.logo && (
                    <img
                      src={office.logo}
                      alt="Logo do escritório"
                      className="max-h-24 max-w-52 rounded bg-white p-2"
                    />
                  )}
                  <TextField
                    label="Selecionar PNG ou JPEG (até 149 KB)"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => void logo(event.target.files?.[0])}
                  />
                  {office.logo && canManage && (
                    <Button onClick={() => officeChange('logo', '')}>
                      Remover logo
                    </Button>
                  )}
                </div>
              </Panel>
              <Panel title="Condições comerciais">
                <div className="grid gap-4">
                  <Textarea
                    label="Condições da proposta"
                    rows={5}
                    value={office.condicoes ?? ''}
                    onChange={(event) =>
                      officeChange('condicoes', event.target.value)
                    }
                  />
                  <Textarea
                    label="Escopo e serviços adicionais"
                    rows={4}
                    value={office.escopoExtra ?? ''}
                    onChange={(event) =>
                      officeChange('escopoExtra', event.target.value)
                    }
                  />
                </div>
              </Panel>
              <Panel title="Unidades do escritório">
                <div className="space-y-4">
                  {office.units.map((unit, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] p-4 sm:grid-cols-2"
                    >
                      {(
                        [
                          ['name', 'Unidade'],
                          ['address', 'Endereço'],
                          ['phone', 'Telefone'],
                        ] as const
                      ).map(([key, label]) => (
                        <TextField
                          key={key}
                          label={label}
                          value={unit[key]}
                          onChange={(event) =>
                            officeChange(
                              'units',
                              office.units.map((current, i) =>
                                i === index
                                  ? { ...current, [key]: event.target.value }
                                  : current,
                              ),
                            )
                          }
                        />
                      ))}
                      {canManage && (
                        <div className="self-end">
                          <Button
                            size="sm"
                            onClick={() =>
                              officeChange(
                                'units',
                                office.units.filter((_, i) => i !== index),
                              )
                            }
                          >
                            Remover unidade
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {canManage && (
                    <Button
                      onClick={() =>
                        officeChange('units', [
                          ...office.units,
                          { name: '', address: '', phone: '' },
                        ])
                      }
                    >
                      Adicionar unidade
                    </Button>
                  )}
                </div>
              </Panel>
            </>
          ) : (
            <>
              {section === 'cobranca' && (
                <Notice>
                  Índices são informados manualmente. No modo janeiro, contratos
                  iniciados a partir do mês de carência pulam o primeiro
                  janeiro. O teto da tabela não reduz contratos que já estejam
                  acima dela.
                </Notice>
              )}
              {Object.entries(draft.params)
                .filter(([key]) =>
                  section === 'planos'
                    ? key === 'planos'
                    : section === 'cobranca'
                      ? billing.includes(key)
                      : key !== 'planos' && !billing.includes(key),
                )
                .map(([key, value]) => (
                  <Panel key={key}>
                    <ParameterEditor
                      name={key}
                      value={value}
                      services={draft.params.servicos}
                      disabled={!canManage || saving || conflict}
                      onChange={(next) =>
                        setDraft((current) => ({
                          ...current,
                          params: { ...current.params, [key]: next },
                        }))
                      }
                    />
                  </Panel>
                ))}
            </>
          )}
        </fieldset>
        {canManage && (
          <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4 shadow-lg">
            <p className="text-sm text-[var(--color-text-muted)]">
              {changed
                ? 'Há alterações não salvas.'
                : 'Nenhuma alteração pendente.'}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={saving || !changed}
                onClick={() => {
                  setDraft(structuredClone(configuration))
                  setBaseline(structuredClone(configuration))
                  setError('')
                  setNotice('')
                }}
              >
                Descartar rascunho
              </Button>
              <Button
                type="submit"
                tone="primary"
                disabled={saving || !changed || conflict}
              >
                {saving ? 'Salvando…' : 'Salvar parâmetros'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
