import { useId, type ReactNode } from 'react'
import type {
  ProcessCatalogType,
  ProcessCreateInput,
  ProcessField,
  ProcessAlterationItem,
  ProcessReason,
  ProcessTaxRegime,
  ProcessPayer,
} from '../../types/processes'
import ProcessIcon from './ProcessIcon'
import {
  DIRECT_LOSS_TYPES,
  LOSS_TYPES,
  PROCESS_ALTERATIONS,
  PROCESS_PAYERS,
  PROCESS_REASONS,
  PROCESS_REGIMES,
  processHasCost,
  processHasField,
  processHasMeeting,
  processInactivityLoss,
  processInstallmentValue,
  processMonthlyTotal,
  processMoney,
  processPayrollTotal,
} from './processFormUtils'

type FieldProps = {
  value: ProcessCreateInput
  type: ProcessCatalogType
  onChange: (patch: Partial<ProcessCreateInput>) => void
  disabled?: boolean
  only?: ProcessField
}

export function ProcessSwitch({
  checked,
  title,
  children,
  onChange,
  disabled,
}: {
  checked: boolean
  title: string
  children: ReactNode
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`trab ${checked ? 'on' : ''}`}>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-label={title}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className="knob" />
      </button>
      <div className="trab-t">
        <b>{title}</b>
        <small>{children}</small>
      </div>
    </div>
  )
}

function MoneyField({
  label,
  value,
  onChange,
  disabled,
  required,
}: {
  label: string
  value: string | null | undefined
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}) {
  const id = useId()
  return (
    <div className="ctl">
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      <div className="row">
        <label className="mfield">
          <span>R$</span>
          <input
            id={id}
            className="input"
            inputMode="decimal"
            value={
              value && /^\d+\.\d{0,2}$/.test(value)
                ? value.replace('.', ',')
                : (value ?? '')
            }
            onChange={(event) => onChange(event.target.value)}
            placeholder="0,00"
            disabled={disabled}
            required={required}
          />
        </label>
      </div>
    </div>
  )
}

export function ProcessAlterationFields({
  value,
  onChange,
  disabled,
}: Pick<FieldProps, 'value' | 'onChange' | 'disabled'>) {
  const id = useId()
  return (
    <>
      <div className="field full">
        <label>
          O que será alterado{' '}
          <span className="req">obrigatório · selecione um ou mais</span>
        </label>
        <div
          className="chk-chips"
          role="group"
          aria-label="O que será alterado"
        >
          {Object.entries(PROCESS_ALTERATIONS).map(([key, name]) => (
            <button
              key={key}
              type="button"
              className="chk"
              aria-pressed={
                value.altItens?.includes(key as ProcessAlterationItem) ?? false
              }
              disabled={disabled}
              onClick={() =>
                onChange({
                  altItens: value.altItens?.includes(
                    key as ProcessAlterationItem,
                  )
                    ? value.altItens.filter((item) => item !== key)
                    : [...(value.altItens ?? []), key as ProcessAlterationItem],
                })
              }
            >
              <span className="box">
                <ProcessIcon name="tick" size={11} />
              </span>
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="field full">
        <label htmlFor={id}>
          Dados que serão alterados <span className="req">obrigatório</span>
        </label>
        <textarea
          className="input"
          id={id}
          rows={3}
          maxLength={3000}
          required
          value={value.altDesc ?? ''}
          onChange={(event) => onChange({ altDesc: event.target.value })}
          disabled={disabled}
          placeholder="Descreva as alterações: quem entra ou sai da sociedade, novo endereço, novo capital, atividades incluídas…"
        />
      </div>
    </>
  )
}

export default function ProcessFields({
  value,
  type,
  onChange,
  disabled,
  only,
}: FieldProps) {
  const id = useId()
  const show = (field: ProcessField) =>
    !only || only === field || (only === 'altdef' && field === 'custo')
  const total = processMonthlyTotal(value)
  const loss = processInactivityLoss(value)
  return (
    <>
      {show('regime') && processHasField(type, 'regime') && (
        <div className="field full">
          <label>Estrutura tributária</label>
          <div className="ctl-grid">
            <div className="ctl">
              <span className="lbl">Regime tributário</span>
              <div className="row">
                <span
                  className="seg"
                  role="group"
                  aria-label="Regime tributário"
                >
                  {Object.entries(PROCESS_REGIMES).map(([key, name]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      aria-pressed={value.regime === key}
                      onClick={() =>
                        onChange({
                          regime:
                            value.regime === key
                              ? null
                              : (key as ProcessTaxRegime),
                        })
                      }
                    >
                      {name}
                    </button>
                  ))}
                </span>
              </div>
            </div>
            <div className="ctl wide">
              <label className="lbl" htmlFor={`${id}-regime`}>
                Observações <span>(opcional)</span>
              </label>
              <textarea
                id={`${id}-regime`}
                className="input"
                rows={2}
                maxLength={3000}
                value={value.regimeObs ?? ''}
                onChange={(event) =>
                  onChange({ regimeObs: event.target.value })
                }
                disabled={disabled}
                placeholder="Atividades, anexos do Simples, particularidades contábeis"
              />
            </div>
          </div>
        </div>
      )}
      {show('custo') && processHasCost(type) && (
        <div className="field full">
          <label>
            Custo do processo
            {type.id === 'alteracao' && (
              <span className="req"> obrigatório</span>
            )}
          </label>
          <div className="ctl-grid">
            <MoneyField
              label="Valor do processo"
              value={value.custo}
              onChange={(custo) => onChange({ custo })}
              disabled={disabled}
              required={type.id === 'alteracao'}
            />
            <div className="ctl">
              <span className="lbl">Quem paga</span>
              <div className="row">
                <span className="seg" role="group" aria-label="Quem paga">
                  {Object.entries(PROCESS_PAYERS).map(([key, name]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      aria-pressed={value.pagador === key}
                      onClick={() => onChange({ pagador: key as ProcessPayer })}
                    >
                      {name}
                    </button>
                  ))}
                </span>
              </div>
            </div>
            <div className="ctl">
              <span className="lbl">Pagamento</span>
              <div className="row">
                <span
                  className="seg"
                  role="group"
                  aria-label="Forma de pagamento"
                >
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={value.parcelas === 1}
                    onClick={() => onChange({ parcelas: 1 })}
                  >
                    À vista
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={(value.parcelas ?? 0) >= 2}
                    onClick={() =>
                      onChange({
                        parcelas:
                          (value.parcelas ?? 0) >= 2 ? value.parcelas : 2,
                      })
                    }
                  >
                    Parcelado
                  </button>
                </span>
                {(value.parcelas ?? 0) >= 2 && (
                  <label className="pfield">
                    <input
                      className="input"
                      type="number"
                      aria-label="Número de parcelas"
                      min={2}
                      max={360}
                      step={1}
                      required
                      value={value.parcelas ?? ''}
                      onChange={(event) =>
                        onChange({
                          parcelas: event.target.value
                            ? Number(event.target.value)
                            : null,
                        })
                      }
                      disabled={disabled}
                    />
                    x
                  </label>
                )}
                {(value.parcelas ?? 0) >= 2 &&
                  processInstallmentValue(value.custo, value.parcelas) !=
                    null && (
                    <span className="per">
                      de{' '}
                      {processMoney(
                        processInstallmentValue(value.custo, value.parcelas),
                      )}
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
      {show('honorario') && processHasField(type, 'honorario') && (
        <div className="field full">
          <label>
            {type.id === 'inativa'
              ? 'Honorário durante a inatividade'
              : 'Novo honorário mensal'}
          </label>
          {type.id === 'inativa' && (
            <div className="ctl-grid">
              <MoneyField
                label="Honorário atual (antes da inatividade)"
                value={value.honAnterior}
                onChange={(honAnterior) => onChange({ honAnterior })}
                disabled={disabled}
              />
            </div>
          )}
          <div className="ctl-grid">
            <MoneyField
              label={value.trab ? 'Honorário contábil' : 'Honorário mensal'}
              value={value.honorario}
              onChange={(honorario) => onChange({ honorario })}
              disabled={disabled}
            />
            <div className="ctl">
              <label className="lbl" htmlFor={`${id}-billing`}>
                {type.id === 'inativa'
                  ? 'Data da nova cobrança'
                  : 'Cobrança do 1º honorário'}
              </label>
              <div className="row">
                <input
                  className="input"
                  id={`${id}-billing`}
                  type="date"
                  value={value.honCobranca ?? ''}
                  onChange={(event) =>
                    onChange({ honCobranca: event.target.value || null })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          {type.id !== 'inativa' && (
            <>
              <ProcessSwitch
                checked={!!value.trab}
                title="Honorário trabalhista"
                disabled={disabled}
                onChange={(trab) => onChange({ trab })}
              >
                {value.trab
                  ? 'Cobrado por funcionário, somado ao honorário mensal'
                  : 'Ative se a empresa tiver folha de pagamento'}
              </ProcessSwitch>
              {value.trab && (
                <>
                  <div className="trab-f">
                    <label className="ctl">
                      <span className="lbl">Funcionários</span>
                      <input
                        className="input num"
                        type="number"
                        min={1}
                        max={100000}
                        step={1}
                        value={value.trabQtd ?? ''}
                        onChange={(event) =>
                          onChange({
                            trabQtd: event.target.value
                              ? Number(event.target.value)
                              : null,
                          })
                        }
                        disabled={disabled}
                        placeholder="0"
                      />
                    </label>
                    <span className="op">×</span>
                    <MoneyField
                      label="Valor por funcionário"
                      value={value.trabValor}
                      onChange={(trabValor) => onChange({ trabValor })}
                      disabled={disabled}
                    />
                    <span className="op">=</span>
                    <div className="ctl">
                      <span className="lbl">Trabalhista</span>
                      <div className="tsum">
                        {processMoney(processPayrollTotal(value))}
                      </div>
                    </div>
                  </div>
                  <div className="htotal">
                    <span>Total mensal</span>
                    <b>{processMoney(total)}</b>
                    <small>Contábil e trabalhista</small>
                  </div>
                </>
              )}
            </>
          )}
          {type.id === 'inativa' && loss != null && (
            <div className="hloss">
              <span>Perda de honorário mensal</span>
              <b>− {processMoney(loss)}</b>
              <small>
                de {processMoney(value.honAnterior)} para {processMoney(total)}{' '}
                por mês
              </small>
            </div>
          )}
        </div>
      )}
      {!only && DIRECT_LOSS_TYPES.includes(type.id) && (
        <div className="field full">
          <label>
            Honorário perdido <span className="req">obrigatório</span>
          </label>
          <div className="ctl-grid">
            <MoneyField
              label="Honorário mensal que deixa de ser cobrado"
              value={value.honPerdido}
              onChange={(honPerdido) => onChange({ honPerdido })}
              disabled={disabled}
              required
            />
          </div>
        </div>
      )}
      {!only && LOSS_TYPES.includes(type.id) && (
        <div className="field full">
          <label>
            Motivo <span>(opcional)</span>
          </label>
          <div className="chk-chips" role="group" aria-label="Motivo">
            {Object.entries(PROCESS_REASONS).map(([key, name]) => (
              <button
                className="chk"
                key={key}
                type="button"
                aria-pressed={value.motivo === key}
                onClick={() =>
                  onChange({
                    motivo:
                      value.motivo === key ? null : (key as ProcessReason),
                  })
                }
                disabled={disabled}
              >
                <span className="box">
                  <ProcessIcon name="tick" size={11} />
                </span>
                {name}
              </button>
            ))}
          </div>
          <textarea
            className="input"
            aria-label="Detalhes do motivo"
            rows={2}
            maxLength={1500}
            value={value.motivoObs ?? ''}
            onChange={(event) => onChange({ motivoObs: event.target.value })}
            disabled={disabled}
            placeholder="Detalhes do motivo (opcional)"
          />
        </div>
      )}
      {!only && type.id === 'saida' && (
        <div className="field full">
          <label htmlFor={`${id}-contact`}>Contato do cliente</label>
          <input
            className="input"
            id={`${id}-contact`}
            value={value.contato ?? ''}
            onChange={(event) => onChange({ contato: event.target.value })}
            maxLength={500}
            disabled={disabled}
            placeholder="Nome e telefone de quem acompanha a saída"
          />
          <ProcessSwitch
            checked={!!value.novoContador}
            title="Já temos os dados do novo contador"
            onChange={(novoContador) => onChange({ novoContador })}
            disabled={disabled}
          >
            {value.novoContador
              ? 'A Regularidade entra em contato direto com a nova contabilidade'
              : 'A Regularidade vai solicitar os dados do novo contador ao cliente'}
          </ProcessSwitch>
          {value.novoContador && (
            <div className="trab-f">
              <label className="ctl">
                <span className="lbl">Contador ou escritório</span>
                <input
                  className="input"
                  value={value.contadorNome ?? ''}
                  onChange={(event) =>
                    onChange({ contadorNome: event.target.value })
                  }
                  maxLength={200}
                  required
                  disabled={disabled}
                  placeholder="Nome da nova contabilidade"
                />
              </label>
              <label className="ctl">
                <span className="lbl">Contato</span>
                <input
                  className="input"
                  value={value.contadorContato ?? ''}
                  onChange={(event) =>
                    onChange({ contadorContato: event.target.value })
                  }
                  maxLength={500}
                  required
                  disabled={disabled}
                  placeholder="E-mail ou telefone"
                />
              </label>
            </div>
          )}
        </div>
      )}
      {!only && type.id === 'reativacao' && (
        <div className="field full">
          <label>Junta Comercial</label>
          <ProcessSwitch
            checked={value.reatJunta !== false}
            title="Reativar na Junta Comercial"
            onChange={(reatJunta) => onChange({ reatJunta })}
            disabled={disabled}
          >
            {value.reatJunta !== false
              ? 'Abre a etapa de reativação com a Leggacy'
              : 'Sem reativação na Junta: a etapa da Leggacy não será aberta'}
          </ProcessSwitch>
        </div>
      )}
      {!only && processHasMeeting(type) && (
        <div className="field full">
          <label>Reuniões com o cliente</label>
          {processHasMeeting(type, 'alinhamento') && (
            <ProcessSwitch
              checked={value.reunAlinh !== false}
              title="Reunião de alinhamento"
              onChange={(reunAlinh) => onChange({ reunAlinh })}
              disabled={disabled}
            >
              Abre a tarefa de agendar a reunião com o cliente
            </ProcessSwitch>
          )}
          {processHasMeeting(type, 'acompanhamento') && (
            <ProcessSwitch
              checked={value.reunAcomp !== false}
              title="Reunião de acompanhamento no 4º mês"
              onChange={(reunAcomp) => onChange({ reunAcomp })}
              disabled={disabled}
            >
              Abre a etapa da reunião 4 meses depois
            </ProcessSwitch>
          )}
        </div>
      )}
    </>
  )
}
