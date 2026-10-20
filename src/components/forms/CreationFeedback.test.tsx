/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import { CreationErrorSummary } from './CreationFeedback'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('CreationErrorSummary focus', () => {
  it('focuses on invalid submit but preserves the field focus while errors are corrected', async () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const render = (messages: string[], attempt: number) =>
      root.render(
        <form>
          <CreationErrorSummary messages={messages} focusKey={attempt} />
          <input />
        </form>,
      )
    try {
      await act(async () => render([], 0))
      await act(async () => render(['Informe o nome', 'Informe o e-mail'], 1))
      await act(async () => vi.advanceTimersByTime(20))
      expect(document.activeElement).toBe(host.querySelector('[role="alert"]'))
      const input = host.querySelector('input')!
      input.focus()
      await act(async () => render(['Informe o e-mail'], 1))
      await act(async () => vi.advanceTimersByTime(20))
      expect(document.activeElement).toBe(input)
      await act(async () => render(['Informe o e-mail'], 2))
      await act(async () => vi.advanceTimersByTime(20))
      expect(document.activeElement).toBe(host.querySelector('[role="alert"]'))
    } finally {
      await act(async () => root.unmount())
      host.remove()
      vi.useRealTimers()
    }
  })
})
