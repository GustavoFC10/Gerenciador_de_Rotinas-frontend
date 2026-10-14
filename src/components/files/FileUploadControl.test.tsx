/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FileUploadControl from './FileUploadControl'
import { fileService } from '../../services/fileService'
import type { ApiResponse } from '../../services/httpClient'
import type { PrivateFile, UploadIntent } from '../../types/files'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const intent = {
  intentId: 'intent-1',
  fileId: 'file-1',
  expiresAt: '',
  upload: { url: 'https://storage.example.com', fields: {} },
} satisfies UploadIntent
const file = { fileId: 'file-1', state: 'available' } as PrivateFile
function response<T>(data: T): ApiResponse<T> {
  return {
    data,
    status: 200,
    etag: '"1"',
    requestId: null,
    headers: new Headers(),
  }
}
let root: Root
let host: HTMLDivElement
let onChanged: ReturnType<typeof vi.fn<() => Promise<void>>>
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  onChanged = vi.fn<() => Promise<void>>().mockResolvedValue()
  vi.spyOn(fileService, 'createIntent').mockResolvedValue(response(intent))
  vi.spyOn(fileService, 'upload').mockResolvedValue()
  vi.spyOn(fileService, 'confirm').mockResolvedValue(response(file))
  vi.spyOn(fileService, 'waitUntilAvailable').mockResolvedValue(file)
  vi.spyOn(fileService, 'link').mockResolvedValue(
    response({ fileId: 'file-1' }),
  )
  vi.spyOn(fileService, 'cancel').mockResolvedValue(response(undefined))
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})
async function render() {
  await act(async () =>
    root.render(
      <FileUploadControl
        destination={{
          purpose: 'member_avatar',
          target: { memberId: 'member-1' },
        }}
        onChanged={onChanged}
      />,
    ),
  )
}
async function selectFile() {
  const input = host.querySelector('input')!
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File(['image'], 'foto.png', { type: 'image/png' })],
  })
  await act(async () =>
    input.dispatchEvent(new Event('change', { bubbles: true })),
  )
}
async function click(text: string) {
  const button = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === text,
  )!
  await act(async () => button.click())
}
describe('FileUploadControl', () => {
  it('executa intenção, bytes, confirmação, processamento e vínculo nesta ordem', async () => {
    await render()
    await selectFile()
    const calls = [
      fileService.createIntent,
      fileService.upload,
      fileService.confirm,
      fileService.waitUntilAvailable,
      fileService.link,
    ].map((fn) => vi.mocked(fn).mock.invocationCallOrder[0]!)
    expect(calls).toEqual([...calls].sort((a, b) => a - b))
    expect(onChanged).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('Arquivo salvo.')
    expect(host.querySelector('input')!.disabled).toBe(false)
  })
  it('retoma vínculo com o mesmo fileId e a mesma chave sem reenviar bytes', async () => {
    vi.mocked(fileService.link).mockRejectedValueOnce(
      new Error('Conflito de versão'),
    )
    await render()
    await selectFile()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Conflito',
    )
    expect(host.querySelector('input')!.disabled).toBe(true)
    const firstArgs = vi.mocked(fileService.link).mock.calls[0]!
    await click('Retomar')
    expect(fileService.createIntent).toHaveBeenCalledOnce()
    expect(fileService.upload).toHaveBeenCalledOnce()
    expect(fileService.confirm).toHaveBeenCalledOnce()
    expect(vi.mocked(fileService.link).mock.calls[1]!.slice(0, 3)).toEqual(
      firstArgs.slice(0, 3),
    )
    expect(host.textContent).toContain('Arquivo salvo.')
  })
  it('falha do S3 cancela a intenção sem confirmar nem vincular', async () => {
    vi.mocked(fileService.upload).mockRejectedValue(
      new Error('Falha do armazenamento'),
    )
    await render()
    await selectFile()
    expect(fileService.cancel).toHaveBeenCalledWith('intent-1')
    expect(fileService.confirm).not.toHaveBeenCalled()
    expect(fileService.link).not.toHaveBeenCalled()
    expect(host.querySelector('input')!.disabled).toBe(false)
  })
  it('rejeição não vincula e permite cancelar para escolher outro arquivo', async () => {
    vi.mocked(fileService.waitUntilAvailable).mockRejectedValue(
      new Error('Arquivo rejeitado'),
    )
    await render()
    await selectFile()
    expect(fileService.link).not.toHaveBeenCalled()
    await click('Cancelar envio')
    expect(fileService.cancel).toHaveBeenCalledWith('intent-1')
    expect(host.querySelector('input')!.disabled).toBe(false)
  })
  it('interrompe o processamento ao desmontar e cancela o arquivo sem vínculo', async () => {
    let signal: AbortSignal | undefined
    vi.mocked(fileService.waitUntilAvailable).mockImplementation(
      (_fileId, currentSignal) => {
        signal = currentSignal
        return new Promise(() => undefined)
      },
    )
    await render()
    await selectFile()
    await act(async () => root.render(null))
    expect(signal?.aborted).toBe(true)
    expect(fileService.cancel).toHaveBeenCalledWith('intent-1')
    expect(fileService.link).not.toHaveBeenCalled()
  })

  it('cancelamento durante envio não confirma nem vincula após o armazenamento responder', async () => {
    let finishUpload: (() => void) | undefined
    vi.mocked(fileService.upload).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishUpload = resolve
        }),
    )
    await render()
    await selectFile()
    expect(host.textContent).toContain('Enviando arquivo')
    await click('Cancelar envio')
    await act(async () => finishUpload?.())
    expect(fileService.confirm).not.toHaveBeenCalled()
    expect(fileService.link).not.toHaveBeenCalled()
    expect(host.querySelector('input')!.disabled).toBe(false)
    expect(host.textContent).toContain('Envio encerrado')
  })

  it('falha de atualização após vínculo não repete a escrita ao retomar', async () => {
    onChanged.mockRejectedValueOnce(new Error('Falha ao atualizar destino'))
    await render()
    await selectFile()
    expect(host.textContent).toContain('Falha ao atualizar destino')
    await click('Retomar')
    expect(fileService.link).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('Arquivo salvo')
  })
})
