import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { getClientCopyOptions } from '../../utils/clientClipboard'
import type { Client } from '../../types/domain'

interface CompanyContextMenuProps {
  client: Client
  x: number
  y: number
  onClose: (restoreFocus: boolean) => void
  onCopied: (message: string, isError?: boolean) => void
}

function CompanyContextMenu({
  client,
  x,
  y,
  onClose,
  onCopied,
}: CompanyContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ x, y })
  const options = getClientCopyOptions(client)

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const bounds = menu.getBoundingClientRect()
    const margin = 8
    const nextX = Math.max(
      margin,
      Math.min(x, window.innerWidth - bounds.width - margin),
    )
    const nextY = Math.max(
      margin,
      Math.min(y, window.innerHeight - bounds.height - margin),
    )

    setPosition({ x: nextX, y: nextY })
  }, [x, y])

  useEffect(() => {
    const menu = menuRef.current
    const firstItem =
      menu?.querySelector<HTMLButtonElement>('[role="menuitem"]')
    const focusFrame = window.requestAnimationFrame(() => firstItem?.focus())

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        onClose(false)
      }
    }

    function closeWithoutRestoringFocus() {
      onClose(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('blur', closeWithoutRestoringFocus)
    window.addEventListener('resize', closeWithoutRestoringFocus)
    window.addEventListener('scroll', closeWithoutRestoringFocus, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('blur', closeWithoutRestoringFocus)
      window.removeEventListener('resize', closeWithoutRestoringFocus)
      window.removeEventListener('scroll', closeWithoutRestoringFocus, true)
    }
  }, [onClose])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ),
    ]
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    )

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose(true)
      return
    }

    if (event.key === 'Tab') {
      onClose(false)
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

    event.preventDefault()

    if (event.key === 'Home') {
      items[0]?.focus()
      return
    }

    if (event.key === 'End') {
      items.at(-1)?.focus()
      return
    }

    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + direction + items.length) % items.length
    items[nextIndex]?.focus()
  }

  async function handleCopy(label: string, value: string) {
    try {
      await copyToClipboard(value)
      onCopied(`${label.replace(/^Copiar /, '')} copiado.`)
    } catch {
      onCopied('Não foi possível copiar os dados.', true)
    } finally {
      onClose(true)
    }
  }

  return createPortal(
    <div
      ref={menuRef}
      id="company-context-menu"
      role="menu"
      aria-label={`Ações da empresa ${client.name}`}
      onKeyDown={handleKeyDown}
      className="fixed z-[100] w-64 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1.5 text-[var(--color-text-main)] shadow-[var(--shadow-floating)]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="pt-1">
        {options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            role="menuitem"
            onClick={() => handleCopy(option.label, option.value)}
            className={`flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-left text-sm font-semibold text-[var(--color-text-main)] outline-none hover:bg-[var(--color-control-hover-bg)] focus:bg-[var(--color-control-hover-bg)] ${
              index === 0
                ? 'mb-1 text-[var(--color-brand)]'
                : 'text-[var(--color-text-main)]'
            }`}
          >
            <CopyIcon />
            {option.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Alguns navegadores expõem a API, mas bloqueiam seu uso fora de HTTPS.
    }
  }

  const temporaryField = document.createElement('textarea')
  temporaryField.value = value
  temporaryField.setAttribute('readonly', '')
  temporaryField.style.position = 'fixed'
  temporaryField.style.opacity = '0'
  document.body.appendChild(temporaryField)
  temporaryField.select()

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Clipboard copy failed')
    }
  } finally {
    temporaryField.remove()
  }
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  )
}

export default CompanyContextMenu
