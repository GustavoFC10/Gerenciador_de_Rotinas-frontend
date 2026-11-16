import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import Textarea from '../ui/Textarea'
import { honorariosService } from '../../services/honorariosService'
import { isApiError } from '../../services/httpClient'
import type {
  HonorariosConfiguration,
  HonorariosParams,
} from '../../types/honorarios'
import { getErrorPresentation } from '../../utils/apiErrors'
import { History, Notice, Panel } from './HonorariosShared'
import HonorariosParameterSections from './HonorariosParameterSections'
import {
  HONORARIOS_PARAMETER_TABS,
  type HonorariosParameterSection,
} from './honorariosParameterTabs'
import defaultParams from '../../../docs/honorarios_base/config-params.json'

interface Props {
  configuration: HonorariosConfiguration
  canEdit: boolean
  canManage: boolean
  scopeKey: readonly unknown[]
  onDenied?: (error: unknown) => void
  onConfigurationSaved?: (configuration: HonorariosConfiguration) => void
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
  const [section, setSection] = useState<
    HonorariosParameterSection | 'escritorio'
  >('base')
  const [restoring, setRestoring] = useState(false)
  const tabsId = useId()
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
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = HONORARIOS_PARAMETER_TABS.length
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % count
        : event.key === 'ArrowLeft'
          ? (index - 1 + count) % count
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : null
    if (target === null) return
    event.preventDefault()
    setSection(HONORARIOS_PARAMETER_TABS[target].id)
    document
      .getElementById(`${tabsId}-${HONORARIOS_PARAMETER_TABS[target].id}`)
      ?.focus()
  }
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
        <div className="flex flex-wrap gap-2">
          <Button
            id={`${tabsId}-escritorio`}
            tone={section === 'escritorio' ? 'selected' : 'neutral'}
            onClick={() => setSection('escritorio')}
          >
            Dados do escritório
          </Button>
          <Button onClick={() => setHistory(!history)}>
            {history ? 'Fechar histórico' : 'Histórico da configuração'}
          </Button>
          {canManage && (
            <Button
              disabled={saving || conflict}
              onClick={() => setRestoring(true)}
            >
              Restaurar padrão
            </Button>
          )}
        </div>
      </div>
      {!canManage && (
        <Notice>
          Seu acesso permite consultar os parâmetros. A edição está disponível à
          administração de Honorários.
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}
      {restoring && canManage && (
        <Panel title="Restaurar parâmetros padrão?">
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            Valores base, adicionais, faixas, serviços, exceções, planos,
            índices e regras voltarão ao padrão. Nada será gravado até você
            selecionar Salvar parâmetros. Os dados do escritório serão
            preservados.
          </p>
          <div className="flex gap-2">
            <Button
              tone="primary"
              disabled={saving || conflict}
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  params: structuredClone(defaultParams) as HonorariosParams,
                }))
                setRestoring(false)
                setNotice(
                  'Parâmetros padrão carregados no rascunho. Confira os valores e selecione Salvar parâmetros para gravar.',
                )
              }}
            >
              Restaurar no rascunho
            </Button>
            <Button onClick={() => setRestoring(false)}>Cancelar</Button>
          </div>
        </Panel>
      )}
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
      <div
        role="tablist"
        aria-label="Seções dos parâmetros"
        className="flex gap-1 overflow-x-auto border-b border-[var(--color-panel-border)] pb-3"
      >
        {HONORARIOS_PARAMETER_TABS.map((category, index) => (
          <Button
            key={category.id}
            role="tab"
            id={`${tabsId}-${category.id}`}
            aria-controls={`${tabsId}-panel`}
            aria-selected={section === category.id}
            tabIndex={
              section === category.id ||
              (section === 'escritorio' && index === 0)
                ? 0
                : -1
            }
            onKeyDown={(event) => tabKey(event, index)}
            className="shrink-0"
            tone={section === category.id ? 'selected' : 'neutral'}
            onClick={() => setSection(category.id)}
          >
            {category.label}
          </Button>
        ))}
      </div>
      <form onSubmit={(event) => void save(event)} className="space-y-5">
        <section
          id={`${tabsId}-panel`}
          className="min-w-0"
          role={section === 'escritorio' ? 'region' : 'tabpanel'}
          aria-labelledby={`${tabsId}-${section}`}
        >
          <fieldset
            disabled={!canManage || saving || conflict}
            className="min-w-0 space-y-5"
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
              <HonorariosParameterSections
                section={section}
                params={draft.params}
                onChange={(params) =>
                  setDraft((current) => ({ ...current, params }))
                }
                disabled={!canManage || saving || conflict}
              />
            )}
          </fieldset>
        </section>
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
