/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FileUploadControl from './FileUploadControl'
import { fileService } from '../../services/fileService'
import type { ApiResponse } from '../../services/httpClient'
import type { FileTarget, PrivateFile, UploadIntent } from '../../types/files'

const notify = vi.hoisted(() => vi.fn())
const queue = vi.hoisted(() => ({
  available: false,
  jobs: [] as Array<{ destination: FileTarget; state: string }>,
  enqueue: vi.fn(),
  openPanel: vi.fn(),
}))
vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({ notify }),
}))
vi.mock('../../hooks/useFileUploads', () => ({
  useFileUploads: () => ({ ...queue, isAvailable: queue.available }),
}))

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
  notify.mockClear()
  queue.available = false
  queue.jobs = []
  queue.enqueue.mockClear()
  queue.openPanel.mockClear()
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
  it('mantém o seletor nativo oculto e o abre somente pela ação de upload', async () => {
    await render()
    const input = host.querySelector('input')!
    const open = vi.spyOn(input, 'click').mockImplementation(() => undefined)
    expect(input.hidden).toBe(true)
    expect(host.textContent).toBe('Selecionar imagem')
    expect(fileService.createIntent).not.toHaveBeenCalled()
    await click('Selecionar imagem')
    expect(open).toHaveBeenCalledOnce()
    expect(fileService.createIntent).not.toHaveBeenCalled()
  })
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
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Arquivo salvo', tone: 'success' }),
    )
    expect(host.textContent).not.toContain('Arquivo salvo')
    expect(host.querySelector('input')!.disabled).toBe(false)
  })
  it('retoma vínculo com o mesmo fileId e a mesma chave sem reenviar bytes', async () => {
    vi.mocked(fileService.link).mockRejectedValueOnce(
      new Error('Conflito de versão'),
    )
    await render()
    await selectFile()
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Conflito de versão', tone: 'error' }),
    )
    expect(host.querySelector('[role="alert"]')).toBeNull()
    expect(host.querySelector('input')!.disabled).toBe(true)
    const firstArgs = vi.mocked(fileService.link).mock.calls[0]!
    await click('Retomar')
    expect(fileService.createIntent).toHaveBeenCalledOnce()
    expect(fileService.upload).toHaveBeenCalledOnce()
    expect(fileService.confirm).toHaveBeenCalledOnce()
    expect(vi.mocked(fileService.link).mock.calls[1]!.slice(0, 3)).toEqual(
      firstArgs.slice(0, 3),
    )
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Arquivo salvo', tone: 'success' }),
    )
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
    expect(host.textContent).toBe('Selecionar imagem')
  })

  it('falha de atualização após vínculo não repete a escrita ao retomar', async () => {
    onChanged.mockRejectedValueOnce(new Error('Falha ao atualizar destino'))
    await render()
    await selectFile()
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Falha ao atualizar destino',
        tone: 'error',
      }),
    )
    await click('Retomar')
    expect(fileService.link).toHaveBeenCalledOnce()
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Arquivo salvo', tone: 'success' }),
    )
  })

  it('não oferece confirmação de bytes interrompidos se o cancelamento na API falhar', async () => {
    let finishUpload: (() => void) | undefined
    vi.mocked(fileService.upload).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishUpload = resolve
        }),
    )
    vi.mocked(fileService.cancel).mockRejectedValue(
      new Error('API indisponível'),
    )
    await render()
    await selectFile()
    await click('Cancelar envio')
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Selecione o arquivo novamente'),
        tone: 'error',
      }),
    )
    expect(host.textContent).not.toContain('Retomar')
    expect(host.querySelector('input')!.disabled).toBe(false)
    await act(async () => finishUpload?.())
    expect(fileService.confirm).not.toHaveBeenCalled()
    expect(fileService.link).not.toHaveBeenCalled()
  })

  it('usa progresso real durante os bytes e remove a porcentagem na verificação', async () => {
    let finishUpload: (() => void) | undefined
    vi.mocked(fileService.upload).mockImplementation(
      (_intent, _file, _signal, onProgress) => {
        onProgress?.(68)
        return new Promise<void>((resolve) => {
          finishUpload = resolve
        })
      },
    )
    vi.mocked(fileService.waitUntilAvailable).mockImplementation(
      () => new Promise(() => undefined),
    )
    await render()
    await selectFile()
    expect(
      host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'),
    ).toBe('68')
    await act(async () => finishUpload?.())
    expect(host.textContent).toContain('Verificando')
    expect(
      host.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow'),
    ).toBe(false)
    expect(fileService.link).not.toHaveBeenCalled()
  })

  it('usa a fila global em produção sem iniciar upload local ou mostrar feedback longo', async () => {
    queue.available = true
    await render()
    await selectFile()
    expect(queue.enqueue).toHaveBeenCalledWith(
      [expect.any(File)],
      { purpose: 'member_avatar', target: { memberId: 'member-1' } },
      'Selecionar imagem',
    )
    expect(fileService.createIntent).not.toHaveBeenCalled()
    queue.jobs = [
      {
        destination: {
          purpose: 'member_avatar',
          target: { memberId: 'member-1' },
        },
        state: 'uploading',
      },
    ]
    await render()
    expect(host.querySelector('input')!.disabled).toBe(true)
    expect(host.textContent).toBe('Selecionar imagemEnvios')
    await click('Envios')
    expect(queue.openPanel).toHaveBeenCalledOnce()
    await act(async () => root.render(null))
    expect(fileService.cancel).not.toHaveBeenCalled()
  })
})
