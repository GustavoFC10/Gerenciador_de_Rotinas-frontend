import { useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
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
  process?: ProcessResource
  initialType?: ProcessTypeId
  onSubmit: (input: ProcessCreateInput) => Promise<void>
  onClose: () => void
}

export default function ProcessForm({
  catalog,
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
  const [unconfirmedInput, setUnconfirmedInput] =
    useState<ProcessCreateInput | null>(null)
  const locked = submitting || !!unconfirmedInput
  const close = () => {
    if (!locked) onClose()
  }
  useOverlayDialog(dialogRef, close)
  const type = catalog.types.find((type) => type.id === typeId)
  const update = (patch: Partial<ProcessCreateInput>) =>
    setValue((previous) => ({ ...previous, ...patch }))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submittingRef.current) return
    setError('')
    try {
      if (!type) throw new Error('Escolha o tipo de processo.')
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
                        document.getElementById(`${id}-empresa`)?.focus()
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
          <div className="field">
            <label htmlFor={`${id}-empresa`}>
              Empresa ou cliente <span className="req">obrigatório</span>
            </label>
            <input
              className="input"
              id={`${id}-empresa`}
              value={value.empresa}
              onChange={(event) =>
                update({
                  empresa: event.target.value,
                  ...(process?.companyId ? {} : { companyId: null }),
                })
              }
              required
              maxLength={200}
              autoComplete="off"
              placeholder="Razão social ou nome do cliente"
              disabled={locked}
            />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor={`${id}-cnpj`}>
                CNPJ <span>(opcional)</span>
              </label>
              <input
                className="input"
                id={`${id}-cnpj`}
                value={value.cnpj ?? ''}
                onChange={(event) =>
                  update({
                    cnpj: event.target.value
                      .replace(/[^\d./-]/g, '')
                      .slice(0, 18),
                  })
                }
                inputMode="numeric"
                maxLength={18}
                placeholder="00.000.000/0000-00"
                disabled={locked}
              />
            </div>
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
