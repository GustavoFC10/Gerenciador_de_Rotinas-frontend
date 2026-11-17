import { useEffect, useRef, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import Select from '../ui/Select'
import './directory.css'

export const DIRECTORY_PAGE_SIZE = 20

export function useDirectoryQuery(defaultStatus = 'all') {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const status = params.get('situacao') ?? defaultStatus
  const requestedPage = Number(params.get('pagina') ?? 1)
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  function change(patch: Record<string, string>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }
  return {
    query,
    status,
    page,
    change,
    search: params.toString() ? `?${params}` : '',
  }
}

export function DirectoryHeading({
  title,
  count,
  action,
}: {
  title: string
  count?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="app-page-title">{title}</h1>
        {count && <p className="app-description mt-1">{count}</p>}
      </div>
      {action}
    </header>
  )
}

export function DirectoryToolbar({
  searchLabel,
  placeholder,
  query,
  onQuery,
  status,
  statuses,
  onStatus,
  count,
}: {
  searchLabel: string
  placeholder: string
  query: string
  onQuery: (value: string) => void
  status: string
  statuses: Array<{ value: string; label: string }>
  onStatus: (value: string) => void
  count?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.key !== '/' ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        document.querySelector('[role="dialog"][aria-modal="true"]')
      )
        return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [])
  return (
    <div className="directory-toolbar">
      <TextField
        ref={inputRef}
        type="search"
        label={searchLabel}
        placeholder={placeholder}
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      <Select
        label="Situação"
        value={status}
        onChange={(event) => onStatus(event.target.value)}
      >
        {statuses.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <span className="app-caption directory-count" aria-live="polite">
        {count === undefined ? 'Carregando…' : `${count} resultados`}
      </span>
    </div>
  )
}

export function DirectoryPanel({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <section className="directory-panel" aria-label={label}>
      {children}
    </section>
  )
}

export function DirectoryPager({
  page,
  count,
  onPage,
  busy = false,
}: {
  page: number
  count: number
  onPage: (page: number) => void
  busy?: boolean
}) {
  const lastPage = Math.max(1, Math.ceil(count / DIRECTORY_PAGE_SIZE))
  return (
    <footer className="directory-pager">
      <span className="app-caption">
        {count
          ? `${(page - 1) * DIRECTORY_PAGE_SIZE + 1}–${Math.min(page * DIRECTORY_PAGE_SIZE, count)} de ${count}`
          : '0 resultados'}
      </span>
      <div className="flex items-center gap-2">
        <Button disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </Button>
        <span className="app-caption" aria-live="polite">
          {page} de {lastPage}
        </span>
        <Button
          disabled={busy || page >= lastPage}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </footer>
  )
}

export function DirectoryEmpty({
  filtered,
  onClear,
  noun,
}: {
  filtered: boolean
  onClear: () => void
  noun: string
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="app-section-title">
        {filtered ? 'Nenhum resultado encontrado' : `Nenhum ${noun} cadastrado`}
      </p>
      {filtered && (
        <Button className="mt-4" onClick={onClear}>
          Limpar busca e filtros
        </Button>
      )}
    </div>
  )
}

export function RecordDatum({
  label,
  children,
  wide = false,
}: {
  label: string
  children?: ReactNode
  wide?: boolean
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="app-caption mb-1">{label}</dt>
      <dd className="m-0 break-words text-sm text-[var(--color-text-main)]">
        {children || 'Não informado'}
      </dd>
    </div>
  )
}

export function DirectoryStatus({ status }: { status: string }) {
  const label =
    (
      {
        active: 'Ativa',
        archived: 'Arquivada',
        pending: 'Convite pendente',
        inactive: 'Inativa',
        suspended: 'Suspensa',
      } as Record<string, string>
    )[status] ?? status
  return (
    <span className={`directory-status directory-status--${status}`}>
      {label}
    </span>
  )
}
