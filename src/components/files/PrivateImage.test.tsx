/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PrivateImage from './PrivateImage'
import { fileService } from '../../services/fileService'
import {
  AuthContext,
  type AuthContextValue,
} from '../../contexts/authContextDefinition'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let host: HTMLDivElement
const auth = {
  activeMembership: { id: 'member-1', organization: { id: 'org-1' } },
} as AuthContextValue
beforeEach(() => {
  vi.useFakeTimers()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
async function render(fileId = 'file-1', currentAuth = auth) {
  await act(async () =>
    root.render(
      <AuthContext.Provider value={currentAuth}>
        <PrivateImage
          reference={{ fileId, version: 1, variants: ['64', '256'] }}
          label="Maria Silva"
        />
      </AuthContext.Provider>,
    ),
  )
}
describe('PrivateImage', () => {
  it('solicita variante e renova antes da expiração sem armazenar a URL de forma durável', async () => {
    const download = vi
      .spyOn(fileService, 'download')
      .mockResolvedValueOnce({
        url: 'https://storage.example.com/first',
        expiresIn: 60,
      })
      .mockResolvedValue({
        url: 'https://storage.example.com/renewed',
        expiresIn: 60,
      })
    await render()
    expect(download).toHaveBeenCalledWith(
      'file-1',
      '64',
      expect.any(AbortSignal),
    )
    expect(host.querySelector('img')?.getAttribute('src')).toContain('/first')
    await act(async () => vi.advanceTimersByTimeAsync(48_000))
    expect(host.querySelector('img')?.getAttribute('src')).toContain('/renewed')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
  it('mantém iniciais se a emissão falhar ou se a imagem não carregar', async () => {
    const download = vi
      .spyOn(fileService, 'download')
      .mockRejectedValueOnce(new Error('Forbidden'))
      .mockResolvedValue({
        url: 'https://storage.example.com/photo',
        expiresIn: 60,
      })
    await render()
    expect(host.textContent).toBe('MS')
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(download).toHaveBeenCalledTimes(2)
    await act(async () =>
      host.querySelector('img')!.dispatchEvent(new Event('error')),
    )
    expect(host.textContent).toBe('MS')
  })
  it('remove a URL anterior ao trocar de associação e aborta consultas antigas', async () => {
    const download = vi
      .spyOn(fileService, 'download')
      .mockResolvedValueOnce({
        url: 'https://storage.example.com/private',
        expiresIn: 60,
      })
      .mockImplementation(() => new Promise(() => undefined))
    await render()
    const signal = download.mock.calls[0]![2]!
    await render('file-2', {
      activeMembership: { id: 'member-2', organization: { id: 'org-2' } },
    } as AuthContextValue)
    expect(signal.aborted).toBe(true)
    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).toBe('MS')
  })
})
