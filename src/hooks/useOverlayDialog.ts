import { useEffect, useRef, type RefObject } from 'react'

interface OverlayOptions {
  active?: boolean
  lockRoot?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  returnFocusRef?: RefObject<HTMLElement | null>
}

interface OverlayEntry {
  element: HTMLElement
  lockRoot: boolean
  close: () => void
  focusTarget: () => HTMLElement | null | undefined
  returnRef?: RefObject<HTMLElement | null>
  returnTarget: HTMLElement | null
}

interface OverlayStack {
  entries: OverlayEntry[]
  root: HTMLElement | null
  rootInert: boolean
  overflow: string
  covered: Map<HTMLElement, boolean>
  handleKeyDown: (event: KeyboardEvent) => void
}

const stacks = new WeakMap<Document, OverlayStack>()
const focusableSelector = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',')
const modalSelector =
  '[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]'

function canFocus(
  element: HTMLElement | null | undefined,
): element is HTMLElement {
  return Boolean(
    element?.isConnected &&
    !element.matches(':disabled') &&
    !element.closest('[inert],[hidden]'),
  )
}

function focusInitial({ element, focusTarget }: OverlayEntry) {
  const target =
    focusTarget() ??
    element.querySelector<HTMLElement>('[data-overlay-initial-focus]') ??
    element.querySelector<HTMLElement>('[data-overlay-close]')
  if (canFocus(target) && element.contains(target)) target.focus()
  else element.focus()
}

function handleOverlayKeyDown(
  entry: OverlayEntry | undefined,
  event: KeyboardEvent,
) {
  if (!entry || event.defaultPrevented || !canFocus(entry.element)) return

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    entry.close()
  } else if (event.key === 'Tab') {
    const { element } = entry
    const items = [
      ...element.querySelectorAll<HTMLElement>(focusableSelector),
    ].filter(
      (item) =>
        item.tabIndex >= 0 &&
        canFocus(item) &&
        item.getClientRects().length > 0,
    )
    const first = items[0] ?? element
    const last = items.at(-1) ?? element
    const focused = element.ownerDocument.activeElement
    if (
      !items.includes(focused as HTMLElement) ||
      (event.shiftKey && focused === first) ||
      (!event.shiftKey && focused === last)
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
      ;(event.shiftKey ? last : first).focus()
    }
  }
}

function syncOverlayStack(owner: Document, stack: OverlayStack) {
  const active = stack.entries.at(-1)
  if (stack.root)
    stack.root.inert = stack.rootInert || Boolean(active?.lockRoot)
  owner.body.style.overflow = active ? 'hidden' : stack.overflow

  const covered = new Set(
    active
      ? [...owner.querySelectorAll<HTMLElement>(modalSelector)].filter(
          (dialog) =>
            dialog !== active.element &&
            !dialog.contains(active.element) &&
            !active.element.contains(dialog),
        )
      : [],
  )
  for (const [element, previous] of stack.covered) {
    if (!covered.has(element)) {
      element.inert = previous
      stack.covered.delete(element)
    }
  }
  for (const element of covered) {
    if (!stack.covered.has(element)) stack.covered.set(element, element.inert)
    element.inert = true
  }
}

/** Only the top modal handles keyboard input, even when a lower layer unmounts first. */
export function useOverlayDialog(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  {
    active = true,
    lockRoot = true,
    initialFocusRef,
    returnFocusRef,
  }: OverlayOptions = {},
) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const element = ref.current
    if (!active || !element) return

    const owner = element.ownerDocument
    let stack = stacks.get(owner)
    if (!stack) {
      const root = owner.getElementById('root')
      const entries: OverlayEntry[] = []
      const handleKeyDown = (event: KeyboardEvent) =>
        handleOverlayKeyDown(entries.at(-1), event)
      stack = {
        entries,
        root,
        rootInert: root?.inert ?? false,
        overflow: owner.body.style.overflow,
        covered: new Map(),
        handleKeyDown,
      }
      stacks.set(owner, stack)
      owner.addEventListener('keydown', handleKeyDown, true)
    }

    const entry: OverlayEntry = {
      element,
      lockRoot,
      close: () => closeRef.current(),
      focusTarget: () => initialFocusRef?.current,
      returnRef: returnFocusRef,
      returnTarget:
        owner.activeElement instanceof HTMLElement ? owner.activeElement : null,
    }
    stack.entries.push(entry)
    syncOverlayStack(owner, stack)
    focusInitial(entry)

    return () => {
      const index = stack.entries.indexOf(entry)
      const wasTop = index === stack.entries.length - 1
      stack.entries.splice(index, 1)
      const child = stack.entries[index]
      if (child && element.contains(child.returnTarget)) {
        child.returnTarget = entry.returnRef?.current ?? entry.returnTarget
      }

      syncOverlayStack(owner, stack)
      if (stack.entries.length === 0) {
        owner.removeEventListener('keydown', stack.handleKeyDown, true)
        stacks.delete(owner)
      }
      if (!wasTop) return

      const previous = stack.entries.at(-1)
      const target = [entry.returnRef?.current, entry.returnTarget].find(
        (item) =>
          canFocus(item) && (!previous || previous.element.contains(item)),
      )
      if (target) target.focus()
      else if (previous) focusInitial(previous)
    }
  }, [active, lockRoot, initialFocusRef, ref, returnFocusRef])
}
