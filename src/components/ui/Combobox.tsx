import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { normalizeSearch } from '../../utils/normalizeSearch'

export interface ComboboxOption {
  /** Values must be unique and non-empty. Labels are presentation only. */
  value: string
  label: string
  description?: string
  keywords?: readonly string[]
  disabled?: boolean
}

export interface ComboboxProps {
  options: readonly ComboboxOption[]
  value: string | null
  onValueChange: (value: string | null) => void
  onSearchChange?: (query: string) => void
  label?: ReactNode
  id?: string
  name?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  hint?: ReactNode
  error?: ReactNode
  emptyMessage?: ReactNode
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

interface PopupPosition {
  left: number
  top: number
  width: number
  maxHeight: number
}

const canChoose = (option: ComboboxOption) =>
  !option.disabled && option.value !== ''

function matchingOptions(
  options: readonly ComboboxOption[],
  query: string | null,
) {
  const normalized = normalizeSearch(query ?? '').trim()
  if (!normalized) return options
  return options.filter((option) =>
    normalizeSearch(
      [option.label, option.description, ...(option.keywords ?? [])].join(' '),
    ).includes(normalized),
  )
}

/**
 * A single searchable selection field. Only a confirmed option is submitted;
 * search text is temporary and is restored to the current selection on dismissal.
 * See Fluent 2 Combobox and the WAI-ARIA APG combobox/listbox pattern.
 */
function Combobox({
  options,
  value,
  onValueChange,
  label,
  onSearchChange,
  id,
  name,
  placeholder = 'Selecione uma opção',
  disabled = false,
  required = false,
  hint,
  error,
  emptyMessage = 'Nenhum resultado encontrado.',
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': externalDescription,
}: ComboboxProps) {
  const generatedId = useId()
  const inputId = id ?? `combobox-${generatedId}`
  const listId = `${inputId}-options`
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const fieldRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const [activeValue, setActiveValue] = useState<string | null>(null)
  const [position, setPosition] = useState<PopupPosition | null>(null)

  const selected = options.find((option) => option.value === value)
  const hasSelection = !!selected && canChoose(selected)
  const visibleOptions = useMemo(
    () => matchingOptions(options, query),
    [options, query],
  )
  const enabledOptions = visibleOptions.filter(canChoose)
  const optionId = (option: ComboboxOption) =>
    `${listId}-${options.indexOf(option)}`
  const activeOption = visibleOptions.find(
    (option) => option.value === activeValue && canChoose(option),
  )
  const describedBy =
    [externalDescription, hint ? hintId : '', error ? errorId : '']
      .filter(Boolean)
      .join(' ') || undefined

  const dismiss = useCallback(() => {
    setIsOpen(false)
    setQuery(null)
    setActiveValue(null)
    setPosition(null)
  }, [])

  useLayoutEffect(() => {
    const message = error
      ? typeof error === 'string'
        ? error
        : 'Revise este campo.'
      : required && !hasSelection
        ? 'Selecione uma opção da lista.'
        : ''
    inputRef.current?.setCustomValidity(disabled ? '' : message)
  }, [disabled, error, hasSelection, required])

  useEffect(() => {
    dismiss()
  }, [disabled, value, dismiss])

  useLayoutEffect(() => {
    if (!isOpen || disabled) return
    function updatePosition() {
      const field = fieldRef.current
      const popup = popupRef.current
      if (!field || !popup) return
      const bounds = field.querySelector('input')!.getBoundingClientRect()
      const margin = 8
      const gap = 4
      const width = Math.max(
        0,
        Math.min(Math.max(bounds.width, 240), window.innerWidth - margin * 2),
      )
      const below = Math.max(
        0,
        window.innerHeight - bounds.bottom - margin - gap,
      )
      const above = Math.max(0, bounds.top - margin - gap)
      const preferredHeight = Math.min(popup.scrollHeight || 320, 320)
      const showBelow =
        below >= Math.min(preferredHeight, 160) || below >= above
      const maxHeight = Math.min(320, showBelow ? below : above)
      const height = Math.min(preferredHeight, maxHeight)
      const next = {
        left: Math.max(
          margin,
          Math.min(bounds.left, window.innerWidth - margin - width),
        ),
        top: Math.max(
          margin,
          showBelow ? bounds.bottom + gap : bounds.top - gap - height,
        ),
        width,
        maxHeight,
      }
      setPosition((current) =>
        current &&
        current.left === next.left &&
        current.top === next.top &&
        current.width === next.width &&
        current.maxHeight === next.maxHeight
          ? current
          : next,
      )
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updatePosition)
    if (fieldRef.current) observer?.observe(fieldRef.current)
    if (popupRef.current) observer?.observe(popupRef.current)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      observer?.disconnect()
    }
  }, [disabled, isOpen, visibleOptions])

  useEffect(() => {
    if (!isOpen) return
    function outside(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (
        !fieldRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      )
        dismiss()
    }
    // The application's overlay hook listens at document capture. Intercept
    // Escape at window capture so it closes this popup before its parent dialog.
    function escape(event: globalThis.KeyboardEvent) {
      const target = event.target
      if (
        event.key !== 'Escape' ||
        !(target instanceof Node) ||
        (!fieldRef.current?.contains(target) &&
          !popupRef.current?.contains(target))
      )
        return
      event.preventDefault()
      event.stopImmediatePropagation()
      dismiss()
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape, true)
    }
  }, [dismiss, isOpen])

  useEffect(() => {
    if (!isOpen || !activeOption) return
    document.getElementById(optionId(activeOption))?.scrollIntoView?.({
      block: 'nearest',
    })
  })

  function choose(option: ComboboxOption) {
    if (disabled || !canChoose(option)) return
    onValueChange(option.value)
    dismiss()
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      const current = enabledOptions.findIndex(
        (option) => option.value === activeValue,
      )
      const next =
        current < 0
          ? event.key === 'ArrowDown'
            ? 0
            : enabledOptions.length - 1
          : (current +
              (event.key === 'ArrowDown' ? 1 : -1) +
              enabledOptions.length) %
            enabledOptions.length
      setActiveValue(enabledOptions[next]?.value ?? null)
    } else if (event.key === 'Enter' && isOpen) {
      event.preventDefault()
      if (activeOption) choose(activeOption)
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      event.stopPropagation()
      dismiss()
    } else if (event.key === 'Tab') {
      dismiss()
    }
  }

  const portalTarget =
    typeof document === 'undefined'
      ? null
      : (fieldRef.current?.closest('dialog, [role="dialog"]') ?? document.body)
  const popupStyle: CSSProperties = position
    ? { ...position, maxHeight: position.maxHeight }
    : { left: 0, top: 0, visibility: 'hidden', maxHeight: 320 }

  return (
    <div ref={fieldRef} className={`min-w-0 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-[var(--color-text-main)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-label={ariaLabel ?? (label ? undefined : 'Selecionar opção')}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={isOpen ? listId : undefined}
          aria-expanded={isOpen && !disabled}
          aria-activedescendant={
            isOpen && activeOption ? optionId(activeOption) : undefined
          }
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query ?? selected?.label ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="h-10 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] py-2 pr-20 pl-3 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)] aria-invalid:border-[var(--status-error-border)] disabled:cursor-not-allowed disabled:opacity-60"
          onFocus={() => {
            if (disabled) return
            setIsOpen(true)
            setActiveValue(hasSelection ? value : null)
          }}
          onClick={() => !disabled && setIsOpen(true)}
          onBlur={dismiss}
          onChange={(event) => {
            const next = event.target.value
            onSearchChange?.(next)
            setQuery(next)
            setIsOpen(true)
            setActiveValue(
              matchingOptions(options, next).find(canChoose)?.value ?? null,
            )
          }}
          onKeyDown={handleKeyDown}
        />
        {name && (
          <input
            type="hidden"
            name={name}
            value={hasSelection ? selected.value : ''}
            disabled={disabled}
          />
        )}
        {hasSelection && !disabled && (
          <button
            type="button"
            aria-label="Limpar seleção"
            className="absolute top-1/2 right-9 grid size-7 -translate-y-1/2 place-items-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              onValueChange(null)
              dismiss()
              inputRef.current?.focus()
            }}
          >
            <svg
              viewBox="0 0 20 20"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="m6 6 8 8m0-8-8 8" />
            </svg>
          </button>
        )}
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
        </svg>
      </div>
      {hint && (
        <p
          id={hintId}
          className="mt-1.5 text-xs text-[var(--color-text-muted)]"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-xs text-[var(--status-error-text)]"
        >
          {error}
        </p>
      )}
      {isOpen &&
        !disabled &&
        portalTarget &&
        createPortal(
          <div
            ref={popupRef}
            className="fixed z-[180] flex flex-col overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-main)] shadow-[var(--shadow-floating)]"
            style={popupStyle}
            data-combobox-popup
          >
            <ul
              id={listId}
              role="listbox"
              aria-label={
                ariaLabel ?? (typeof label === 'string' ? label : 'Opções')
              }
              className="m-0 min-h-0 list-none overflow-y-auto p-1"
            >
              {visibleOptions.map((option) => (
                <li
                  id={optionId(option)}
                  key={option.value}
                  role="option"
                  aria-selected={selected?.value === option.value}
                  aria-disabled={!canChoose(option) || undefined}
                  className={`flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm ${
                    !canChoose(option)
                      ? 'cursor-not-allowed opacity-50'
                      : activeOption?.value === option.value
                        ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                        : 'hover:bg-[var(--color-panel-soft-bg)]'
                  }`}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerMove={() => {
                    if (canChoose(option)) setActiveValue(option.value)
                  }}
                  onClick={() => choose(option)}
                >
                  <span className="min-w-0 flex-1 break-words">
                    <span className="block font-medium">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {selected?.value === option.value && (
                    <svg
                      viewBox="0 0 20 20"
                      className="size-4 shrink-0 text-[var(--color-brand)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="m4 10 4 4 8-8" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
            <p
              role="status"
              aria-live="polite"
              className="m-0 shrink-0 border-t border-[var(--color-divider)] px-4 py-2 text-xs text-[var(--color-text-muted)]"
            >
              {visibleOptions.length === 0
                ? emptyMessage
                : `${visibleOptions.length} ${visibleOptions.length === 1 ? 'opção disponível' : 'opções disponíveis'}`}
            </p>
          </div>,
          portalTarget,
        )}
    </div>
  )
}

export default Combobox
