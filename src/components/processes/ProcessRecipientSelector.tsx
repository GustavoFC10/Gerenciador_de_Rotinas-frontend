import { useEffect, useId, useRef, useState } from 'react'
import { useProcessAlertRecipientOptions } from '../../hooks/useProcessCommunications'
import type { OrganizationQueryScope } from '../../query/queryKeys'
import { isApiError } from '../../services/httpClient'
import type {
  ProcessAlertRecipientOption,
  ProcessSector,
} from '../../types/processes'
import { PROCESS_SECTORS } from '../../utils/processPresentation'
import ProcessIcon from './ProcessIcon'
import ProcessQueryError from './ProcessQueryError'

export interface ProcessRecipientSelection {
  sectors: ProcessSector[]
  memberIds: string[]
}

interface Props extends ProcessRecipientSelection {
  scope: OrganizationQueryScope
  disabled?: boolean
  onChange: (selection: ProcessRecipientSelection) => void
  onForbidden?: (error: unknown) => void
}

const allSectors = Object.keys(PROCESS_SECTORS) as ProcessSector[]

export default function ProcessRecipientSelector(props: Props) {
  return (
    <ScopedRecipientSelector
      key={`${props.scope.organizationId}:${props.scope.membershipId}`}
      {...props}
    />
  )
}

function ScopedRecipientSelector({
  scope,
  sectors,
  memberIds,
  disabled = false,
  onChange,
  onForbidden,
}: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [knownMembers, setKnownMembers] = useState<
    Record<string, ProcessAlertRecipientOption>
  >({})
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const allRef = useRef<HTMLInputElement>(null)
  const options = useProcessAlertRecipientOptions(
    scope,
    { q: search || undefined, page, pageSize: 50 },
    open && !disabled,
  )
  const everyone = allSectors.every((sector) => sectors.includes(sector))
  const totalSelections = sectors.length + memberIds.length
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const visibleSectors = allSectors.filter((sector) =>
    PROCESS_SECTORS[sector]
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearch),
  )

  useEffect(() => {
    if (allRef.current)
      allRef.current.indeterminate = !everyone && sectors.length > 0
  }, [everyone, sectors.length, open])
  useEffect(() => {
    if (isApiError(options.error) && options.error.status === 403)
      onForbidden?.(options.error)
  }, [options.error, onForbidden])
  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])
  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    function outside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }
  function memberName(memberId: string) {
    return (
      knownMembers[memberId]?.name ??
      options.data?.results.find((member) => member.memberId === memberId)
        ?.name ??
      `Membro ${memberId.slice(0, 8)}`
    )
  }
  const summary = everyone
    ? 'Todos com acesso a Processos'
    : totalSelections
      ? [
          sectors.length
            ? `${sectors.length} ${sectors.length === 1 ? 'departamento' : 'departamentos'}`
            : '',
          memberIds.length
            ? `${memberIds.length} ${memberIds.length === 1 ? 'pessoa' : 'pessoas'}`
            : '',
        ]
          .filter(Boolean)
          .join(' e ')
      : 'Selecionar pessoas ou departamentos'

  return (
    <div
      className="process-recipient-selector"
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node)
        )
          setOpen(false)
      }}
    >
      <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
        Destinatários
      </label>
      <p id={`${id}-help`}>
        Marque pessoas cadastradas, departamentos ou todos no mesmo campo.
      </p>
      <div className="process-recipient-control">
        <button
          id={`${id}-trigger`}
          ref={triggerRef}
          type="button"
          className="process-recipient-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-describedby={`${id}-help`}
          disabled={disabled}
          onClick={() => setOpen((old) => !old)}
        >
          <span>{summary}</span>
          <span>
            Selecionar
            <ProcessIcon name="chev" size={16} />
          </span>
        </button>
        {!!totalSelections && (
          <ul
            className="process-recipient-chips"
            aria-label="Destinatários selecionados"
          >
            {everyone ? (
              <li>
                <span>Todos com acesso a Processos</span>
                <button
                  type="button"
                  aria-label="Remover todos os departamentos"
                  disabled={disabled}
                  onClick={() => onChange({ sectors: [], memberIds })}
                >
                  <ProcessIcon name="x" size={12} />
                </button>
              </li>
            ) : (
              sectors.map((sector) => (
                <li key={sector}>
                  <span>{PROCESS_SECTORS[sector]}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Remover departamento ${PROCESS_SECTORS[sector]}`}
                    onClick={() =>
                      onChange({
                        sectors: sectors.filter((item) => item !== sector),
                        memberIds,
                      })
                    }
                  >
                    <ProcessIcon name="x" size={12} />
                  </button>
                </li>
              ))
            )}
            {memberIds.map((memberId) => (
              <li key={memberId}>
                <span>{memberName(memberId)}</span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remover pessoa ${memberName(memberId)}`}
                  onClick={() =>
                    onChange({
                      sectors,
                      memberIds: memberIds.filter((item) => item !== memberId),
                    })
                  }
                >
                  <ProcessIcon name="x" size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {open && (
        <div
          id={`${id}-options`}
          className="process-recipient-popover"
          role="dialog"
          aria-labelledby={`${id}-label`}
        >
          <label className="sr-only" htmlFor={`${id}-search`}>
            Buscar pessoa ou departamento
          </label>
          <input
            id={`${id}-search`}
            ref={searchRef}
            type="search"
            value={search}
            maxLength={200}
            autoComplete="off"
            placeholder="Buscar pessoa ou departamento"
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <div className="process-recipient-options">
            <label className="process-recipient-option process-recipient-everyone">
              <input
                ref={allRef}
                type="checkbox"
                checked={everyone}
                onChange={() =>
                  onChange({
                    sectors: everyone ? [] : [...allSectors],
                    memberIds,
                  })
                }
              />
              <span>
                <strong>Todos com acesso a Processos</strong>
                <small>
                  Inclui as pessoas de todos os departamentos, em todas as
                  páginas.
                </small>
              </span>
            </label>
            {visibleSectors.length > 0 && (
              <div role="group" aria-label="Departamentos">
                <p className="process-recipient-group-title">Departamentos</p>
                {visibleSectors.map((sector) => (
                  <label key={sector} className="process-recipient-option">
                    <input
                      type="checkbox"
                      checked={sectors.includes(sector)}
                      onChange={() =>
                        onChange({
                          sectors: sectors.includes(sector)
                            ? sectors.filter((item) => item !== sector)
                            : allSectors.filter(
                                (item) =>
                                  item === sector || sectors.includes(item),
                              ),
                          memberIds,
                        })
                      }
                    />
                    <span>
                      <strong>{PROCESS_SECTORS[sector]}</strong>
                      <small>Todo o departamento</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div role="group" aria-label="Pessoas cadastradas">
              <p className="process-recipient-group-title">
                Pessoas cadastradas
              </p>
              {options.error ? (
                <ProcessQueryError
                  title="Não foi possível consultar pessoas"
                  error={options.error}
                  retry={() => void options.refetch()}
                />
              ) : options.isPending ? (
                <p role="status" className="process-recipient-empty">
                  Carregando pessoas…
                </p>
              ) : (
                <>
                  {!options.data?.results.length && (
                    <p className="process-recipient-empty">
                      Nenhuma pessoa encontrada. Ajuste a busca.
                    </p>
                  )}
                  {options.data?.results.map((member) => (
                    <label
                      key={member.memberId}
                      className="process-recipient-option"
                    >
                      <input
                        type="checkbox"
                        checked={memberIds.includes(member.memberId)}
                        onChange={() => {
                          setKnownMembers((old) => ({
                            ...old,
                            [member.memberId]: member,
                          }))
                          onChange({
                            sectors,
                            memberIds: memberIds.includes(member.memberId)
                              ? memberIds.filter(
                                  (item) => item !== member.memberId,
                                )
                              : [...memberIds, member.memberId],
                          })
                        }}
                      />
                      <span>
                        <strong>{member.name}</strong>
                        <small>
                          {member.email} ·{' '}
                          {member.sectors
                            .map((sector) => PROCESS_SECTORS[sector])
                            .join(', ')}
                        </small>
                      </span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>
          {!options.error && options.data && (
            <nav
              className="process-recipient-pagination"
              aria-label="Paginação de pessoas"
            >
              <button
                type="button"
                className="btn sm"
                aria-label="Página anterior de pessoas"
                disabled={!options.data.previous || options.isFetching}
                onClick={() => setPage((old) => old - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page} · {options.data.count} pessoas
              </span>
              <button
                type="button"
                className="btn sm"
                aria-label="Próxima página de pessoas"
                disabled={!options.data.next || options.isFetching}
                onClick={() => setPage((old) => old + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
          <div className="process-recipient-footer">
            <span>A lista final será conferida ao preparar o texto.</span>
            <button type="button" className="btn sm primary" onClick={close}>
              Concluir seleção
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
