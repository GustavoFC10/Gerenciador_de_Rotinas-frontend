import { afterEach, describe, expect, it, vi } from 'vitest'

import { FileUploadQueue } from './fileUploadQueue'
import { FileProcessingError, fileService } from './fileService'
import { ApiError, type ApiResponse } from './httpClient'
import type { FileTarget, PrivateFile, UploadIntent } from '../types/files'

const destination: FileTarget = {
  purpose: 'task_attachment',
  target: { referenceMonth: '2026-10', occurrenceKey: 'occurrence-1' },
}
const otherDestination: FileTarget = {
  purpose: 'task_attachment',
  target: { competenceId: 'competence-1', taskId: 'task-2' },
}
function response<T>(data: T): ApiResponse<T> {
  return {
    data,
    status: 200,
    etag: '"1"',
    requestId: null,
    headers: new Headers(),
  }
}
function makeFile(name = 'comprovante.pdf') {
  return new File(['content'], name, { type: 'application/pdf' })
}
function privateFile(fileId: string): PrivateFile {
  return {
    fileId,
    purpose: 'task_attachment',
    state: 'available',
    originalName: `${fileId}.pdf`,
    sizeBytes: 7,
    contentType: 'application/pdf',
    rejectionReason: '',
    createdAt: '',
    expiresAt: null,
    variants: [],
  }
}
function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
function apiError(status: number, retryAfter?: string) {
  return new ApiError({
    problem: { type: 'about:blank', title: 'Falha da API', status },
    requestId: null,
    response: new Response(null, {
      status,
      headers: retryAfter ? { 'Retry-After': retryAfter } : {},
    }),
  })
}
function setup(paceMs = 0) {
  let intentCount = 0
  const service = {
    createIntent: vi
      .fn<typeof fileService.createIntent>()
      .mockImplementation(async () => {
        const suffix = ++intentCount
        return response<UploadIntent>({
          intentId: `intent-${suffix}`,
          fileId: `file-${suffix}`,
          expiresAt: '2099-01-01T00:00:00Z',
          upload: {
            url: 'https://storage.example.com/',
            method: 'POST',
            enctype: 'multipart/form-data',
            fields: {},
          },
        })
      }),
    upload: vi.fn<typeof fileService.upload>().mockResolvedValue(),
    confirm: vi
      .fn<typeof fileService.confirm>()
      .mockImplementation(async (intentId) =>
        response(privateFile(intentId.replace('intent-', 'file-'))),
      ),
    waitUntilAvailable: vi
      .fn<typeof fileService.waitUntilAvailable>()
      .mockImplementation(async (fileId) => privateFile(fileId)),
    link: vi
      .fn<typeof fileService.link>()
      .mockImplementation(async (_target, fileId) =>
        response({ fileId, attachmentId: `attachment-${fileId}` }),
      ),
    cancel: vi
      .fn<typeof fileService.cancel>()
      .mockResolvedValue(response(undefined)),
    listAttachments: vi
      .fn<typeof fileService.listAttachments>()
      .mockResolvedValue([]),
    getImageSlot: vi
      .fn<typeof fileService.getImageSlot>()
      .mockResolvedValue(response({ version: 1, file: null })),
  }
  const onChanged = vi
    .fn<ConstructorParameters<typeof FileUploadQueue>[0]['onChanged']>()
    .mockResolvedValue()
  const onBatch =
    vi.fn<ConstructorParameters<typeof FileUploadQueue>[0]['onBatch']>()
  const queue = new FileUploadQueue({
    membershipId: 'member-1',
    service: service as unknown as typeof fileService,
    paceMs,
    onChanged,
    onBatch,
  })
  queues.push(queue)
  return { queue, service, onChanged, onBatch }
}
const queues: FileUploadQueue[] = []
afterEach(() => {
  queues.splice(0).forEach((queue) => queue.dispose())
  vi.useRealTimers()
})
async function settle() {
  // Flush the independent API permits and the complete async pipeline.
  for (let index = 0; index < 50; index++) await Promise.resolve()
}

describe('FileUploadQueue', () => {
  it('executa no máximo dois fluxos e mantém os destinos capturados ao navegar', async () => {
    const { queue, service, onBatch } = setup()
    const uploads = [deferred(), deferred(), deferred()]
    let transfers = 0
    let activeTransfers = 0
    let maxTransfers = 0
    service.upload.mockImplementation(async () => {
      const index = transfers++
      activeTransfers++
      maxTransfers = Math.max(maxTransfers, activeTransfers)
      await uploads[index]!.promise
      activeTransfers--
    })
    const captured: FileTarget = structuredClone(destination)
    queue.enqueue([makeFile('a.pdf'), makeFile('b.pdf')], captured, 'Outubro')
    queue.enqueue([makeFile('c.pdf')], otherDestination, 'Outra tarefa')
    if ('occurrenceKey' in captured.target)
      captured.target.referenceMonth = '2026-11'
    await settle()
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    expect(service.upload).toHaveBeenCalledTimes(2)
    expect(queue.getSnapshot().map((job) => job.state)).toEqual([
      'uploading',
      'uploading',
      'queued',
    ])
    uploads[0]!.resolve()
    await settle()
    expect(service.createIntent).toHaveBeenCalledTimes(3)
    expect(service.createIntent.mock.calls[0]![1]).toEqual(destination)
    expect(service.createIntent.mock.calls[1]![1]).toEqual(destination)
    expect(service.createIntent.mock.calls[2]![1]).toEqual(otherDestination)
    expect(maxTransfers).toBe(2)
    uploads[1]!.resolve()
    uploads[2]!.resolve()
    await settle()
    expect(queue.getSnapshot().every((job) => job.state === 'completed')).toBe(
      true,
    )
    expect(service.link.mock.calls.map((call) => call[0])).toEqual([
      destination,
      destination,
      otherDestination,
    ])
    expect(onBatch).toHaveBeenCalledTimes(2)
    expect(onBatch.mock.calls.map(([batch]) => batch.completed).sort()).toEqual(
      [1, 2],
    )
  })

  it('isola uma falha parcial e agrupa o resultado do lote sem desfazer vínculos', async () => {
    const { queue, service, onBatch, onChanged } = setup()
    service.upload.mockRejectedValueOnce(new Error('Conexão interrompida'))
    queue.enqueue(
      [makeFile('falha.pdf'), makeFile('ok.pdf')],
      destination,
      'Tarefa',
    )
    await settle()
    expect(queue.getSnapshot().map((job) => job.state)).toEqual([
      'error',
      'completed',
    ])
    expect(service.confirm).toHaveBeenCalledTimes(1)
    expect(service.link).toHaveBeenCalledTimes(1)
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(onBatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        completed: 1,
        failed: 1,
        cancelled: 0,
        label: 'Tarefa',
      }),
    )
    expect(service.cancel).not.toHaveBeenCalled()
  })

  it('retoma conflito de vínculo com os mesmos identificadores e chave, sem reenviar bytes', async () => {
    const { queue, service, onChanged } = setup()
    service.link.mockRejectedValueOnce(apiError(412))
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    const failed = queue.getSnapshot()[0]!
    const firstLink = service.link.mock.calls[0]!
    expect(failed.state).toBe('error')
    expect(onChanged).toHaveBeenCalledTimes(1)
    queue.retry(failed.id)
    await settle()
    expect(queue.getSnapshot()[0]!.state).toBe('completed')
    expect(service.createIntent).toHaveBeenCalledTimes(1)
    expect(service.upload).toHaveBeenCalledTimes(1)
    expect(service.confirm).toHaveBeenCalledTimes(1)
    expect(service.link.mock.calls[1]!.slice(0, 3)).toEqual(
      firstLink.slice(0, 3),
    )
    expect(onChanged).toHaveBeenCalledTimes(2)
  })

  it('cancela a intenção do storage interrompido e cria outra antes de reenviar', async () => {
    const { queue, service } = setup()
    service.upload.mockRejectedValueOnce(new Error('Storage indisponível'))
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    expect(service.confirm).not.toHaveBeenCalled()
    expect(service.link).not.toHaveBeenCalled()
    const firstIntentKey = service.createIntent.mock.calls[0]![2]
    queue.retry(queue.getSnapshot()[0]!.id)
    await settle()
    expect(service.cancel).toHaveBeenCalledWith(
      'intent-1',
      expect.any(AbortSignal),
    )
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    expect(service.createIntent.mock.calls[1]![2]).not.toBe(firstIntentKey)
    expect(service.upload).toHaveBeenCalledTimes(2)
    expect(service.confirm).toHaveBeenCalledExactlyOnceWith(
      'intent-2',
      expect.any(AbortSignal),
    )
    expect(service.link.mock.calls[0]![1]).toBe('file-2')
    expect(queue.getSnapshot()[0]!.state).toBe('completed')
  })

  it('não confirma bytes interrompidos mesmo se o cancelamento da intenção falhar', async () => {
    const { queue, service } = setup()
    service.upload.mockImplementation(async (_intent, _file, signal) => {
      await new Promise<void>((_resolve, reject) =>
        signal!.addEventListener('abort', () => reject(signal!.reason), {
          once: true,
        }),
      )
    })
    service.cancel.mockRejectedValueOnce(new Error('API indisponível'))
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    const id = queue.getSnapshot()[0]!.id
    await queue.cancel(id)
    expect(queue.getSnapshot()[0]!.state).toBe('error')
    expect(service.confirm).not.toHaveBeenCalled()
    service.upload.mockResolvedValue()
    queue.retry(id)
    await settle()
    expect(service.cancel).toHaveBeenCalledTimes(2)
    expect(service.createIntent).toHaveBeenCalledOnce()
    expect(service.confirm).not.toHaveBeenCalled()
    expect(queue.getSnapshot()[0]!.state).toBe('cancelled')
  })

  it('cancelamento de item na fila não cria intenção nem afeta os envios ativos', async () => {
    const { queue, service } = setup()
    const transfer = deferred()
    service.upload.mockReturnValue(transfer.promise)
    queue.enqueue(
      [makeFile('a.pdf'), makeFile('b.pdf'), makeFile('c.pdf')],
      destination,
      'Tarefa',
    )
    await settle()
    const queued = queue.getSnapshot()[2]!
    await queue.cancel(queued.id)
    expect(queue.getSnapshot()[2]!.state).toBe('cancelled')
    expect(
      queue
        .getSnapshot()
        .slice(0, 2)
        .every((job) => job.state === 'uploading'),
    ).toBe(true)
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    expect(service.cancel).not.toHaveBeenCalled()
    transfer.resolve()
    await settle()
    expect(queue.getSnapshot().map((job) => job.state)).toEqual([
      'completed',
      'completed',
      'cancelled',
    ])
  })

  it('recupera a criação abortada sem recibo com a mesma chave antes de cancelar a reserva', async () => {
    const { queue, service } = setup()
    service.createIntent.mockImplementationOnce(
      (_file, _target, _key, signal) =>
        new Promise((_resolve, reject) => {
          signal!.addEventListener('abort', () => reject(signal!.reason), {
            once: true,
          })
        }),
    )
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    expect(service.createIntent).toHaveBeenCalledOnce()
    await queue.cancel(queue.getSnapshot()[0]!.id)
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    expect(service.createIntent.mock.calls[0]!.slice(0, 3)).toEqual(
      service.createIntent.mock.calls[1]!.slice(0, 3),
    )
    expect(service.cancel).toHaveBeenCalledExactlyOnceWith(
      'intent-1',
      expect.any(AbortSignal),
    )
    expect(service.upload).not.toHaveBeenCalled()
    expect(service.confirm).not.toHaveBeenCalled()
    expect(queue.getSnapshot()[0]!.state).toBe('cancelled')
  })

  it('descarta uma seleção recusada sem tentar criar outra intenção para cancelá-la', async () => {
    const { queue, service } = setup()
    service.createIntent.mockRejectedValueOnce(apiError(413))
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    await queue.cancel(queue.getSnapshot()[0]!.id)
    expect(service.createIntent).toHaveBeenCalledOnce()
    expect(service.cancel).not.toHaveBeenCalled()
    expect(queue.getSnapshot()[0]!.state).toBe('cancelled')
  })

  it('uma falha 429 ao cancelar pausa a fila e a nova tentativa repete somente o cancelamento', async () => {
    vi.useFakeTimers()
    const { queue, service } = setup()
    service.upload.mockImplementationOnce(
      (_intent, _file, signal) =>
        new Promise((_resolve, reject) => {
          signal!.addEventListener('abort', () => reject(signal!.reason), {
            once: true,
          })
        }),
    )
    service.cancel.mockRejectedValueOnce(apiError(429, '8'))
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    const job = queue.getSnapshot()[0]!
    await queue.cancel(job.id)
    expect(queue.getSnapshot()[0]).toMatchObject({
      state: 'error',
      cancelFailed: true,
      retryAt: Date.now() + 8000,
    })
    queue.retry(job.id)
    queue.enqueue([makeFile('outro.pdf')], otherDestination, 'Outra tarefa')
    await vi.advanceTimersByTimeAsync(7999)
    expect(service.cancel).toHaveBeenCalledOnce()
    expect(service.createIntent).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    queue.retry(job.id)
    await settle()
    expect(service.cancel).toHaveBeenCalledTimes(2)
    expect(queue.getSnapshot()[0]!.state).toBe('cancelled')
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    expect(service.confirm).toHaveBeenCalledExactlyOnceWith(
      'intent-2',
      expect.any(AbortSignal),
    )
  })

  it('reconcilia uma resposta de vínculo tardia ao cancelar sem recriar o anexo', async () => {
    const { queue, service, onChanged } = setup()
    const receipt =
      deferred<ApiResponse<{ fileId: string; attachmentId: string }>>()
    service.link.mockReturnValueOnce(receipt.promise)
    onChanged.mockResolvedValue(true)
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    const cancelling = queue.cancel(queue.getSnapshot()[0]!.id)
    receipt.resolve(
      response({ fileId: 'file-1', attachmentId: 'attachment-file-1' }),
    )
    await cancelling
    expect(queue.getSnapshot()[0]).toMatchObject({
      state: 'completed',
      reconciled: true,
    })
    expect(service.cancel).not.toHaveBeenCalled()
    expect(onChanged).toHaveBeenCalledOnce()
  })

  it('um cancelamento recusado de arquivo já vinculado recupera o resultado por leitura', async () => {
    const { queue, service, onChanged } = setup()
    service.link.mockRejectedValueOnce(
      new Error('Resposta perdida após o vínculo'),
    )
    service.cancel.mockRejectedValueOnce(apiError(409))
    service.listAttachments.mockResolvedValue([
      {
        attachmentId: 'attachment-file-1',
        createdByMemberId: 'member-1',
        createdAt: '',
        file: privateFile('file-1'),
      },
    ])
    onChanged.mockResolvedValue(true)
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    await queue.cancel(queue.getSnapshot()[0]!.id)
    expect(queue.getSnapshot()[0]).toMatchObject({
      state: 'completed',
      reconciled: true,
      attachment: { attachmentId: 'attachment-file-1' },
    })
    expect(service.listAttachments).toHaveBeenCalledExactlyOnceWith(
      destination,
      expect.any(AbortSignal),
    )
    expect(service.link).toHaveBeenCalledOnce()
    expect(service.upload).toHaveBeenCalledOnce()
  })

  it('dispose aborta fluxos sem novas mutações ou limpeza com cookies de outro contexto', async () => {
    const { queue, service, onChanged, onBatch } = setup()
    const transfers: Array<{
      signal?: AbortSignal
      transfer: ReturnType<typeof deferred<void>>
    }> = []
    service.upload.mockImplementation((_intent, _file, signal) => {
      const transfer = deferred()
      transfers.push({ signal, transfer })
      return transfer.promise
    })
    queue.enqueue(
      [makeFile('a.pdf'), makeFile('b.pdf'), makeFile('c.pdf')],
      destination,
      'Tarefa',
    )
    await settle()
    queue.dispose()
    expect(transfers.every((item) => item.signal?.aborted)).toBe(true)
    transfers.forEach((item) => item.transfer.resolve())
    queue.enqueue([makeFile('outro.pdf')], destination, 'Outro contexto')
    await settle()
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    expect(service.confirm).not.toHaveBeenCalled()
    expect(service.link).not.toHaveBeenCalled()
    expect(service.cancel).not.toHaveBeenCalled()
    expect(onChanged).not.toHaveBeenCalled()
    expect(onBatch).not.toHaveBeenCalled()
  })

  it('arquivo removido exige outra intenção e não volta a consultar o arquivo terminal', async () => {
    const { queue, service } = setup()
    service.waitUntilAvailable.mockRejectedValueOnce(
      new FileProcessingError('deleted'),
    )
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    expect(queue.getSnapshot()[0]!.state).toBe('error')
    expect(service.link).not.toHaveBeenCalled()
    queue.retry(queue.getSnapshot()[0]!.id)
    await settle()
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    expect(service.upload).toHaveBeenCalledTimes(2)
    expect(
      service.waitUntilAvailable.mock.calls.map(([fileId]) => fileId),
    ).toEqual(['file-1', 'file-2'])
    expect(service.link.mock.calls[0]![1]).toBe('file-2')
    expect(queue.getSnapshot()[0]!.state).toBe('completed')
  })

  it('arquivo rejeitado exige nova seleção e não permite retomar o mesmo conteúdo', async () => {
    const { queue, service } = setup()
    service.waitUntilAvailable.mockRejectedValueOnce(
      new FileProcessingError('rejected'),
    )
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    const job = queue.getSnapshot()[0]!
    expect(job.state).toBe('error')
    expect(job.canRetry).toBe(false)
    queue.retry(job.id)
    await settle()
    expect(service.createIntent).toHaveBeenCalledTimes(1)
    expect(service.waitUntilAvailable).toHaveBeenCalledTimes(1)
    expect(service.link).not.toHaveBeenCalled()
    await queue.cancel(job.id)
    expect(queue.getSnapshot()[0]!.state).toBe('cancelled')
  })

  it('preserva a nova intenção após substituir arquivo removido e ter falha no vínculo', async () => {
    const { queue, service } = setup()
    service.waitUntilAvailable.mockRejectedValueOnce(
      new FileProcessingError('deleted'),
    )
    service.link.mockRejectedValueOnce(new Error('Resposta de vínculo perdida'))
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    const id = queue.getSnapshot()[0]!.id
    queue.retry(id)
    await settle()
    expect(queue.getSnapshot()[0]!.state).toBe('error')
    const firstLink = service.link.mock.calls[0]!
    queue.retry(id)
    await settle()
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    expect(service.upload).toHaveBeenCalledTimes(2)
    expect(service.link.mock.calls[1]!.slice(0, 3)).toEqual(
      firstLink.slice(0, 3),
    )
    expect(queue.getSnapshot()[0]!.state).toBe('completed')
  })

  it('cancela intenção recebida após o abort sem enviar ou confirmar bytes', async () => {
    const { queue, service } = setup()
    const creation = deferred<ApiResponse<UploadIntent>>()
    service.createIntent.mockReturnValueOnce(creation.promise)
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    const id = queue.getSnapshot()[0]!.id
    const cancellation = queue.cancel(id)
    expect(service.createIntent.mock.calls[0]![3]?.aborted).toBe(true)
    creation.resolve(
      response({
        intentId: 'late-intent',
        fileId: 'late-file',
        expiresAt: '',
        upload: { url: 'https://storage.example.com/', fields: {} },
      }),
    )
    await cancellation
    expect(service.cancel).toHaveBeenCalledWith(
      'late-intent',
      expect.any(AbortSignal),
    )
    expect(service.upload).not.toHaveBeenCalled()
    expect(service.confirm).not.toHaveBeenCalled()
    expect(service.link).not.toHaveBeenCalled()
    expect(queue.getSnapshot()[0]!.state).toBe('cancelled')
  })

  it('recupera resposta perdida da criação usando a mesma chave de idempotência', async () => {
    const { queue, service } = setup()
    service.createIntent.mockRejectedValueOnce(new Error('Resposta perdida'))
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    const key = service.createIntent.mock.calls[0]![2]
    queue.retry(queue.getSnapshot()[0]!.id)
    await settle()
    expect(service.createIntent.mock.calls[1]![2]).toBe(key)
    expect(service.upload).toHaveBeenCalledTimes(1)
    expect(queue.getSnapshot()[0]!.state).toBe('completed')
  })

  it('respeita Retry-After no 429 para retomada explícita e outros itens aguardando', async () => {
    vi.useFakeTimers()
    const { queue, service } = setup()
    const transfer = deferred()
    service.createIntent.mockRejectedValueOnce(apiError(429, '8'))
    service.upload.mockReturnValue(transfer.promise)
    queue.enqueue(
      [
        makeFile('limite.pdf'),
        makeFile('ativo.pdf'),
        makeFile('aguardando.pdf'),
      ],
      destination,
      'Tarefa',
    )
    await settle()
    const limited = queue.getSnapshot()[0]!
    expect(limited.state).toBe('error')
    expect(limited.retryAt).toBe(Date.now() + 8000)
    const callsBefore = service.createIntent.mock.calls.length
    queue.retry(limited.id)
    await settle()
    expect(queue.getSnapshot()[0]!.state).toBe('error')
    await vi.advanceTimersByTimeAsync(7999)
    expect(service.createIntent).toHaveBeenCalledTimes(callsBefore)
    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(service.createIntent.mock.calls.length).toBeGreaterThan(callsBefore)
    queue.retry(limited.id)
    transfer.resolve()
    await settle()
    expect(queue.getSnapshot().every((job) => job.state === 'completed')).toBe(
      true,
    )
  })

  it('informa porcentagem por item e só conta sucesso depois da confirmação e do vínculo', async () => {
    const { queue, service, onBatch } = setup()
    const transfer = deferred()
    const verification = deferred<PrivateFile>()
    service.upload.mockImplementation((_intent, _file, _signal, onProgress) => {
      onProgress?.(68)
      return transfer.promise
    })
    service.waitUntilAvailable.mockReturnValue(verification.promise)
    queue.enqueue([makeFile()], destination, 'Tarefa')
    await settle()
    expect(queue.getSnapshot()[0]).toEqual(
      expect.objectContaining({ state: 'uploading', progress: 68 }),
    )
    expect(onBatch).not.toHaveBeenCalled()
    transfer.resolve()
    await settle()
    expect(queue.getSnapshot()[0]).toEqual(
      expect.objectContaining({ state: 'verifying', progress: null }),
    )
    expect(service.link).not.toHaveBeenCalled()
    verification.resolve(privateFile('file-1'))
    await settle()
    expect(queue.getSnapshot()[0]).toEqual(
      expect.objectContaining({
        state: 'completed',
        attachment: expect.objectContaining({
          attachmentId: 'attachment-file-1',
          createdByMemberId: 'member-1',
        }),
      }),
    )
    expect(onBatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ completed: 1, failed: 0 }),
    )
  })

  it('recalcula Retry-After para uma permissão que já aguardava o intervalo entre chamadas', async () => {
    vi.useFakeTimers()
    const { queue, service } = setup(1000)
    const firstCreation = deferred<ApiResponse<UploadIntent>>()
    const transfer = deferred()
    service.createIntent.mockReturnValueOnce(firstCreation.promise)
    service.upload.mockReturnValue(transfer.promise)
    queue.enqueue(
      [makeFile('limite.pdf'), makeFile('aguardando.pdf')],
      destination,
      'Tarefa',
    )
    await settle()
    expect(service.createIntent).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(100)
    firstCreation.reject(apiError(429, '8'))
    await settle()
    expect(queue.getSnapshot()[0]!.retryAt).toBe(Date.now() + 8000)
    await vi.advanceTimersByTimeAsync(900)
    expect(service.createIntent).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(7099)
    expect(service.createIntent).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(service.createIntent).toHaveBeenCalledTimes(2)
    transfer.resolve()
  })

  it('reserva a cota de dez intenções inclusive para arquivos aprovados que falharam no vínculo', async () => {
    const { queue, service, onBatch } = setup()
    service.link.mockRejectedValue(new Error('Destino alterado'))
    queue.enqueue(
      Array.from({ length: 11 }, (_, index) =>
        makeFile(`arquivo-${index}.pdf`),
      ),
      destination,
      'Tarefa',
    )
    await vi.waitFor(() =>
      expect(queue.getSnapshot().every((job) => job.state === 'error')).toBe(
        true,
      ),
    )
    expect(service.createIntent).toHaveBeenCalledTimes(10)
    expect(service.link).toHaveBeenCalledTimes(10)
    expect(queue.getSnapshot()[10]!.error).toContain(
      'Há muitos arquivos pendentes',
    )
    expect(onBatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ failed: 11, completed: 0 }),
    )
  })

  it('rejeita formatos inválidos antes de reservar cota ou criar intenção', async () => {
    const { queue, service, onBatch } = setup()
    queue.enqueue(
      [new File(['<svg/>'], 'imagem.svg', { type: 'image/svg+xml' })],
      destination,
      'Tarefa',
    )
    await settle()
    const invalid = queue.getSnapshot()[0]!
    expect(invalid).toEqual(
      expect.objectContaining({ state: 'error', canRetry: false }),
    )
    queue.retry(invalid.id)
    await settle()
    expect(service.createIntent).not.toHaveBeenCalled()
    expect(onBatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ failed: 1, completed: 0 }),
    )
  })
})
