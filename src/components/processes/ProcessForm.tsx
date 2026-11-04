import { useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { OrganizationQueryScope } from '../../query/queryKeys'
import { useProcessCompanyOptions } from '../../hooks/useProcessQueries'
import { useOverlayDialog } from '../../hooks/useOverlayDialog'
import { isApiError } from '../../services/httpClient'
import type {
  ProcessCatalog,
  ProcessCreateInput,
  ProcessResource,
  ProcessTypeId,
} from '../../types/processes'
import ProcessFields, { ProcessAlterationFields } from './ProcessFields'
import ProcessIcon from './ProcessIcon'
import {
  normalizeProcessInput,
  processInputFromResource,
  PROCESS_START_LABELS,
} from './processFormUtils'

export interface ProcessFormProps {
  catalog: ProcessCatalog
  scope: OrganizationQueryScope
  process?: ProcessResource
  initialType?: ProcessTypeId
  onSubmit: (input: ProcessCreateInput) => Promise<void>
  onClose: () => void
}

export default function ProcessForm({
  catalog,
  scope,
  process,
  initialType,
  onSubmit,
  onClose,
}: ProcessFormProps) {
  const id = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [typeId, setTypeId] = useState<ProcessTypeId | ''>(
    process?.tipo ?? initialType ?? '',
  )
  const [value, setValue] = useState<ProcessCreateInput>(() =>
    process
      ? processInputFromResource(process)
      : {
          tipo: initialType ?? 'abertura',
          empresa: '',
          reunAlinh: true,
          reunAcomp: true,
          reatJunta: true,
        },
  )
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [error, setError] = useState('')
  const [companySearch, setCompanySearch] = useState('')
  const [companyPage, setCompanyPage] = useState(1)
  const [unconfirmedInput, setUnconfirmedInput] =
    useState<ProcessCreateInput | null>(null)
  const locked = submitting || !!unconfirmedInput
  const close = () => {
    if (!locked) onClose()
  }
  useOverlayDialog(dialogRef, close)
  const type = catalog.types.find((type) => type.id === typeId)
  const companyOptions = useProcessCompanyOptions(
    scope,
    {
      search: companySearch || undefined,
      page: companyPage,
      pageSize: 20,
    },
    !process && !locked,
  )
  const update = (patch: Partial<ProcessCreateInput>) =>
    setValue((previous) => ({ ...previous, ...patch }))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submittingRef.current) return
    setError('')
    try {
      if (!type) throw new Error('Escolha o tipo de processo.')
      if (!process && !value.companyId)
        throw new Error(
          'Selecione uma empresa cadastrada para abrir o processo.',
        )
      const input = unconfirmedInput ?? normalizeProcessInput(value, type)
      submittingRef.current = true
      setSubmitting(true)
      try {
        await onSubmit(input)
        setUnconfirmedInput(null)
      } catch (error) {
        if (!process && (!isApiError(error) || error.status >= 500))
          setUnconfirmedInput(input)
        else setUnconfirmedInput(null)
        throw error
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o processo. Tente novamente.',
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }
  return createPortal(
    <div className="processes-module">
      <div className="overlay" onMouseDown={close} />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-busy={submitting}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="modal-h">
          <div>
            <div className="kicker">
              {process ? 'Editar processo' : 'Novo processo'}
            </div>
            <h2 id={`${id}-title`}>
              {process ? process.empresa : 'Qual processo vamos abrir?'}
            </h2>
          </div>
          <button
            type="button"
            className="x"
            aria-label="Fechar"
            data-overlay-close
            disabled={locked}
            onClick={close}
          >
            <ProcessIcon name="x" size={20} />
          </button>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          {!process && (
            <div className="field">
              <label>Tipo de processo</label>
              <div
                className="opts"
                role="radiogroup"
                aria-label="Tipo de processo"
              >
                {catalog.types.map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    className="opt"
                    role="radio"
                    aria-checked={type.id === typeId}
                    tabIndex={
                      typeId
                        ? type.id === typeId
                          ? 0
                          : -1
                        : type.id === catalog.types[0]?.id
                          ? 0
                          : -1
                    }
                    disabled={locked}
                    onKeyDown={(event) => {
                      if (
                        ![
                          'ArrowRight',
                          'ArrowDown',
                          'ArrowLeft',
                          'ArrowUp',
                          'Home',
                          'End',
                        ].includes(event.key)
                      )
                        return
                      event.preventDefault()
                      const index = catalog.types.findIndex(
                        (item) => item.id === type.id,
                      )
                      const nextIndex =
                        event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? catalog.types.length - 1
                            : (index +
                                (event.key === 'ArrowRight' ||
                                event.key === 'ArrowDown'
                                  ? 1
                                  : -1) +
                                catalog.types.length) %
                              catalog.types.length
                      const next = catalog.types[nextIndex]
                      if (!next) return
                      setTypeId(next.id)
                      update({ tipo: next.id })
                      const options =
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          '[role="radio"]',
                        )
                      options?.[nextIndex]?.focus()
                    }}
                    onClick={(event) => {
                      setTypeId(type.id)
                      update({ tipo: type.id })
                      setError('')
                      if (event.detail > 0)
                        document.getElementById(`${id}-empresa-search`)?.focus()
                    }}
                  >
                    <span className="ico-sq">
                      <ProcessIcon name={type.icon} />
                    </span>
                    <span>
                      <b>{type.nome}</b>
                      <small>
                        {type.etapas.length} etapas · {type.desc}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {process ? (
            <div className="field">
              <label htmlFor={`${id}-empresa`}>Empresa</label>
              <input
                className="input"
                id={`${id}-empresa`}
                value={value.empresa}
                readOnly
                aria-readonly="true"
              />
            </div>
          ) : (
            <div className="field">
              <label htmlFor={`${id}-empresa-search`}>
                Empresa cadastrada <span className="req">obrigatório</span>
              </label>
              <input
                className="input"
                id={`${id}-empresa-search`}
                type="search"
                value={value.companyId ? value.empresa : companySearch}
                onChange={(event) => {
                  setCompanySearch(event.target.value)
                  setCompanyPage(1)
                  update({ companyId: null, empresa: '', cnpj: '' })
                }}
                required={!value.companyId}
                maxLength={200}
                autoComplete="off"
                placeholder="Buscar por nome, código ou CNPJ"
                disabled={locked}
                aria-describedby={`${id}-company-help`}
              />
              <p id={`${id}-company-help`} className="help">
                Se a empresa não aparecer, cadastre-a antes no módulo Empresas.
              </p>
              {value.companyId ? (
                <div className="company-selected">
                  <span>
                    <strong>{value.empresa}</strong>
                    <small>{value.cnpj || 'CNPJ não informado'}</small>
                  </span>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={locked}
                    onClick={() => {
                      update({ companyId: null, empresa: '', cnpj: '' })
                      setCompanySearch('')
                      setCompanyPage(1)
                      document.getElementById(`${id}-empresa-search`)?.focus()
                    }}
                  >
                    Trocar empresa
                  </button>
                </div>
              ) : (
                <div className="company-options" aria-live="polite">
                  {companyOptions.isPending ? (
                    <p role="status">Buscando empresas…</p>
                  ) : companyOptions.error ? (
                    <div role="alert">
                      <p>
                        Não foi possível carregar as empresas.{' '}
                        {companyOptions.error.message}
                      </p>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => void companyOptions.refetch()}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : companyOptions.data?.results.length ? (
                    <ul aria-label="Opções de empresas">
                      {companyOptions.data.results.map((company) => (
                        <li key={company.id}>
                          <button
                            type="button"
                            className="company-option"
                            disabled={locked}
                            onClick={() => {
                              update({
                                companyId: company.id,
                                empresa: company.name,
                                cnpj: company.cnpj,
                              })
                              setCompanySearch('')
                            }}
                          >
                            <strong>{company.name}</strong>
                            <span>
                              {company.code ? `${company.code} · ` : ''}
                              {company.cnpj || 'CNPJ não informado'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      {companySearch
                        ? 'Nenhuma empresa ativa encontrada. Cadastre-a no módulo Empresas.'
                        : 'Nenhuma empresa ativa disponível.'}
                    </p>
                  )}
                  {companyOptions.data && (
                    <nav
                      className="company-options-pagination"
                      aria-label="Paginação de empresas"
                    >
                      <button
                        type="button"
                        className="btn sm"
                        disabled={
                          !companyOptions.data.previous ||
                          companyOptions.isFetching
                        }
                        onClick={() => setCompanyPage((page) => page - 1)}
                      >
                        Anterior
                      </button>
                      <span>
                        Página {companyPage} · {companyOptions.data.count}{' '}
                        empresas
                      </span>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={
                          !companyOptions.data.next || companyOptions.isFetching
                        }
                        onClick={() => setCompanyPage((page) => page + 1)}
                      >
                        Próxima
                      </button>
                    </nav>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid2">
            {!process && <div />}
            <div className="field">
              <label htmlFor={`${id}-date`}>
                {PROCESS_START_LABELS[typeId] ?? 'Prazo'}{' '}
                <span>(opcional)</span>
              </label>
              <input
                className="input"
                id={`${id}-date`}
                type="date"
                value={
                  (PROCESS_START_LABELS[typeId]
                    ? value.inicioInat
                    : value.prazo) ?? ''
                }
                onChange={(event) =>
                  update(
                    PROCESS_START_LABELS[typeId]
                      ? { inicioInat: event.target.value || null }
                      : { prazo: event.target.value || null },
                  )
                }
                disabled={locked}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`${id}-protocol`}>
              Protocolo externo <span>(opcional)</span>
            </label>
            <input
              className="input"
              id={`${id}-protocol`}
              maxLength={160}
              value={value.protocolo ?? ''}
              onChange={(event) => update({ protocolo: event.target.value })}
              placeholder="Protocolo de registro ou referência"
              disabled={locked}
            />
          </div>
          {type?.id === 'alteracao' && (
            <ProcessAlterationFields
              value={value}
              onChange={update}
              disabled={locked}
            />
          )}
          {type && (
            <div className="nvals">
              <h3>
                {type.id === 'alteracao'
                  ? 'Custo da alteração'
                  : 'Definições da Diretoria'}
              </h3>
              <p>
                {type.id === 'alteracao'
                  ? 'Valor, quem paga e forma de pagamento. Com isso, a etapa de definições já nasce concluída.'
                  : process
                    ? 'As definições completas concluem suas tarefas automaticamente.'
                    : 'Opcional agora. Se preencher tudo, a tarefa correspondente já entra como concluída.'}
              </p>
              <ProcessFields
                value={value}
                type={type}
                onChange={update}
                disabled={locked}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor={`${id}-obs`}>
              Observações <span>(opcional)</span>
            </label>
            <textarea
              className="input"
              id={`${id}-obs`}
              rows={2}
              maxLength={5000}
              value={value.obs ?? ''}
              onChange={(event) => update({ obs: event.target.value })}
              placeholder="Particularidades do processo"
              disabled={locked}
            />
          </div>
          {!process && (
            <div className="note">
              Ao abrir, os envolvidos com acesso a Processos serão notificados
              por e-mail.
            </div>
          )}
          {error && (
            <div className="err-msg" id={`${id}-error`} role="alert">
              {error}
            </div>
          )}
          {unconfirmedInput && (
            <div className="note" role="status">
              Não conseguimos confirmar a abertura. Repita a tentativa para
              recuperar o mesmo processo, sem duplicar os e-mails. Os dados
              serão mantidos até a confirmação.
            </div>
          )}
          <div className="m-foot">
            <button
              className="btn"
              type="button"
              disabled={locked}
              onClick={close}
            >
              Cancelar
            </button>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting
                ? 'Salvando…'
                : unconfirmedInput
                  ? 'Confirmar abertura'
                  : process
                    ? 'Salvar alterações'
                    : 'Abrir processo'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
