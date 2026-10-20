import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FileService,
  fileErrorMessage,
  fileOwnerPath,
  taskFileTarget,
  validateUpload,
} from './fileService'
import { HttpClient } from './httpClient'
import type { FileTarget, UploadIntent } from '../types/files'
import type { Task } from '../types/domain'

const destination: FileTarget = {
  purpose: 'task_attachment',
  target: { referenceMonth: '2026-10', occurrenceKey: 'occurrence-1' },
}
const intent: UploadIntent = {
  intentId: 'intent-1',
  fileId: 'file-1',
  expiresAt: '2026-10-15T00:00:00Z',
  upload: {
    url: 'https://storage.example.com/',
    method: 'POST',
    enctype: 'multipart/form-data',
    fields: {
      key: 'private-key',
      policy: 'opaque-policy',
      'x-amz-signature': 'signature',
      'Content-Type': 'application/pdf',
    },
  },
}
function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
function setup() {
  const fetchApi = vi.fn<typeof fetch>()
  const fetchStorage = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(null, { status: 204 }))
  const client = new HttpClient({
    baseUrl: 'https://api.example.com',
    fetchImplementation: fetchApi,
  })
  client.setCsrfToken('csrf-token')
  return {
    client,
    service: new FileService(client, fetchStorage),
    fetchApi,
    fetchStorage,
  }
}
afterEach(() => vi.useRealTimers())

class StorageRequest extends EventTarget {
  upload = new EventTarget()
  status = 204
  withCredentials = true
  open = vi.fn()
  send = vi.fn()
  setRequestHeader = vi.fn()
  abort = vi.fn(() => this.dispatchEvent(new Event('abort')))
  progress(loaded: number, total: number, lengthComputable = true) {
    this.upload.dispatchEvent(
      Object.assign(new Event('progress'), {
        loaded,
        total,
        lengthComputable,
      }),
    )
  }
}

describe('FileService', () => {
  it('envia intenção JSON com destino, tamanho, MIME, CSRF e idempotência', async () => {
    const { service, fetchApi } = setup()
    fetchApi.mockResolvedValue(json(intent, 201))
    await service.createIntent(
      new File(['pdf'], 'comprovante.pdf', { type: 'application/pdf' }),
      destination,
      'upload-key',
    )
    const [url, options] = fetchApi.mock.calls[0]!
    expect(url).toBe('https://api.example.com/api/v1/files/upload-intents/')
    expect(JSON.parse(options!.body as string)).toEqual({
      ...destination,
      originalName: 'comprovante.pdf',
      sizeBytes: 3,
      contentType: 'application/pdf',
    })
    expect(new Headers(options!.headers).get('X-CSRFToken')).toBe('csrf-token')
    expect(new Headers(options!.headers).get('Idempotency-Key')).toBe(
      'upload-key',
    )
  })

  it('envia todos os campos opacos e file por último sem credenciais ou headers da API', async () => {
    const { service, fetchStorage, fetchApi } = setup()
    await service.upload(intent, new File(['pdf'], 'arquivo.pdf'))
    const [, options] = fetchStorage.mock.calls[0]!
    const form = options!.body as FormData
    expect([...form.keys()]).toEqual([
      ...Object.keys(intent.upload.fields),
      'file',
    ])
    for (const [key, value] of Object.entries(intent.upload.fields))
      expect(form.get(key)).toBe(value)
    expect(options!.credentials).toBe('omit')
    expect(options!.headers).toBeUndefined()
    expect(fetchApi).not.toHaveBeenCalled()
  })

  it('não expõe conteúdo de erro retornado pelo armazenamento', async () => {
    const { service, fetchStorage } = setup()
    fetchStorage.mockResolvedValue(
      new Response('secret signature', { status: 403 }),
    )
    await expect(
      service.upload(intent, new File(['a'], 'a.pdf')),
    ).rejects.toThrow('O armazenamento recusou')
  })

  it('mede o total multipart via XHR sem credenciais e aguarda o 2xx após 100%', async () => {
    const { client, fetchApi } = setup()
    const storage = new StorageRequest()
    const service = new FileService(
      client,
      vi.fn(),
      () => storage as unknown as XMLHttpRequest,
    )
    const progress = vi.fn()
    let completed = false
    const upload = service
      .upload(intent, new File(['pdf'], 'a.pdf'), undefined, progress)
      .then(() => {
        completed = true
      })
    expect(storage.open).toHaveBeenCalledWith('POST', intent.upload.url)
    expect(storage.withCredentials).toBe(false)
    expect(storage.setRequestHeader).not.toHaveBeenCalled()
    expect([...(storage.send.mock.calls[0]![0] as FormData).keys()]).toEqual([
      ...Object.keys(intent.upload.fields),
      'file',
    ])
    storage.progress(10, 40)
    expect(progress).toHaveBeenLastCalledWith(25)
    storage.progress(20, 40, false)
    expect(progress).toHaveBeenLastCalledWith(null)
    storage.progress(20, 0)
    expect(progress).toHaveBeenLastCalledWith(null)
    storage.progress(40, 40)
    await Promise.resolve()
    expect(progress).toHaveBeenLastCalledWith(100)
    expect(completed).toBe(false)
    storage.dispatchEvent(new Event('load'))
    await upload
    expect(completed).toBe(true)
    expect(fetchApi).not.toHaveBeenCalled()
  })

  it('registra listeners antes de send e interrompe o XHR ao cancelar', async () => {
    const { client } = setup()
    const storage = new StorageRequest()
    const progress = vi.fn()
    storage.send.mockImplementation(() => storage.progress(1, 4))
    const service = new FileService(
      client,
      vi.fn(),
      () => storage as unknown as XMLHttpRequest,
    )
    const controller = new AbortController()
    const upload = service.upload(
      intent,
      new File(['pdf'], 'a.pdf'),
      controller.signal,
      progress,
    )
    const assertion = expect(upload).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(progress).toHaveBeenCalledWith(25)
    controller.abort()
    await assertion
    expect(storage.abort).toHaveBeenCalledOnce()
    storage.progress(4, 4)
    expect(progress).toHaveBeenCalledTimes(1)
  })

  it('rejeita contrato de transporte ou autorização expirada antes de enviar', async () => {
    const { service, fetchStorage } = setup()
    const file = new File(['pdf'], 'a.pdf')
    await expect(
      service.upload(
        { ...intent, uploadExpiresAt: '2000-01-01T00:00:00Z' },
        file,
      ),
    ).rejects.toThrow('expirou')
    await expect(
      service.upload(
        { ...intent, upload: { ...intent.upload, method: 'PUT' as 'POST' } },
        file,
      ),
    ).rejects.toThrow('formato de envio inválido')
    expect(fetchStorage).not.toHaveBeenCalled()
  })

  it('confirma com JSON vazio e consulta até available', async () => {
    vi.useFakeTimers()
    const { service, fetchApi } = setup()
    fetchApi
      .mockResolvedValueOnce(json({ state: 'pending' }, 202))
      .mockResolvedValueOnce(json({ state: 'scanning' }))
      .mockResolvedValueOnce(json({ fileId: 'file-1', state: 'available' }))
    await service.confirm('intent-1')
    expect(fetchApi.mock.calls[0]![1]!.body).toBe('{}')
    const result = service.waitUntilAvailable(
      'file-1',
      new AbortController().signal,
    )
    await vi.advanceTimersByTimeAsync(3000)
    expect((await result).state).toBe('available')
    expect(fetchApi).toHaveBeenCalledTimes(3)
  })

  it.each(['rejected', 'deleted'])(
    'interrompe processamento em %s sem vincular',
    async (state) => {
      const { service, fetchApi } = setup()
      fetchApi.mockResolvedValue(
        json({ state, rejectionReason: 'internal-scanner-detail' }),
      )
      await expect(
        service.waitUntilAvailable('file-1', new AbortController().signal),
      ).rejects.toThrow(/Selecione outro/)
      expect(fetchApi).toHaveBeenCalledTimes(1)
    },
  )

  it('interrompe polling cancelado sem novas requisições', async () => {
    const { service, fetchApi } = setup()
    const controller = new AbortController()
    controller.abort()
    await expect(
      service.waitUntilAvailable('file-1', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchApi).not.toHaveBeenCalled()
  })

  it('respeita Retry-After da confirmação e do 429 com polling progressivo', async () => {
    vi.useFakeTimers()
    const { service, fetchApi } = setup()
    fetchApi
      .mockResolvedValueOnce(
        json({ fileId: 'file-1', state: 'scanning' }, 202, {
          'Retry-After': '5',
        }),
      )
      .mockResolvedValueOnce(
        json({ title: 'Limite', status: 429 }, 429, { 'Retry-After': '8' }),
      )
      .mockResolvedValueOnce(json({ fileId: 'file-1', state: 'available' }))
    const confirmation = await service.confirm('intent-1')
    const result = service.waitUntilAvailable(
      'file-1',
      new AbortController().signal,
      confirmation,
    )
    await vi.advanceTimersByTimeAsync(4999)
    expect(fetchApi).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchApi).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(7999)
    expect(fetchApi).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect((await result).state).toBe('available')
    expect(fetchApi).toHaveBeenCalledTimes(3)
  })

  it('cancelar durante Retry-After interrompe a espera sem fazer outra consulta', async () => {
    vi.useFakeTimers()
    const { service, fetchApi } = setup()
    fetchApi.mockResolvedValue(
      json({ state: 'scanning' }, 200, { 'Retry-After': '10' }),
    )
    const controller = new AbortController()
    const result = service.waitUntilAvailable('file-1', controller.signal)
    const assertion = expect(result).rejects.toMatchObject({
      name: 'AbortError',
    })
    await vi.advanceTimersByTimeAsync(1000)
    controller.abort()
    await assertion
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetchApi).toHaveBeenCalledOnce()
  })

  it.each([
    [destination, 'POST', '/task-occurrences/occurrence-1/attachments/'],
    [
      {
        purpose: 'task_attachment',
        target: { competenceId: 'competence-1', taskId: 'task-1' },
      },
      'POST',
      '/tasks/task-1/attachments/',
    ],
    [
      { purpose: 'member_avatar', target: { memberId: 'member-1' } },
      'PUT',
      '/organization-members/member-1/avatar/',
    ],
    [
      { purpose: 'department_image', target: { departmentId: 'department-1' } },
      'PUT',
      '/departments/department-1/image/',
    ],
  ] as const)(
    'relê a versão antes do vínculo em %j',
    async (target, method, suffix) => {
      const { service, fetchApi } = setup()
      fetchApi
        .mockResolvedValueOnce(json({}, 200, { ETag: '"7"' }))
        .mockResolvedValueOnce(json({ fileId: 'file-1' }, 201))
      await service.link(target, 'file-1', 'link-key')
      const [url, options] = fetchApi.mock.calls[1]!
      expect(String(url).endsWith(suffix)).toBe(true)
      expect(options!.method).toBe(method)
      expect(new Headers(options!.headers).get('If-Match')).toBe('"7"')
      expect(new Headers(options!.headers).get('Idempotency-Key')).toBe(
        'link-key',
      )
      expect(JSON.parse(options!.body as string)).toEqual({ fileId: 'file-1' })
    },
  )

  it('não repete automaticamente escrita com 412', async () => {
    const { service, fetchApi } = setup()
    fetchApi
      .mockResolvedValueOnce(json({}, 200, { ETag: '"7"' }))
      .mockResolvedValueOnce(json({ title: 'Conflict', status: 412 }, 412))
      .mockResolvedValueOnce(json({}, 200, { ETag: '"8"' }))
    const error = await service
      .link(destination, 'file-1', 'link-key')
      .catch((caught: unknown) => caught)
    expect(fileErrorMessage(error)).toContain(
      'revise antes de tentar novamente',
    )
    expect(fetchApi).toHaveBeenCalledTimes(3)
    expect(fetchApi.mock.calls[2]![1]!.method).toBe('GET')
  })

  it('remove com ETag recente e emite download com variante explícita', async () => {
    const { service, fetchApi } = setup()
    fetchApi
      .mockResolvedValueOnce(json({}, 200, { ETag: '"8"' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        json({ url: 'https://storage.example.com/temporary', expiresIn: 60 }),
      )
    await service.remove(destination, 'attachment-1')
    expect(fetchApi.mock.calls[1]![0]).toBe(
      `${'https://api.example.com'}${fileOwnerPath(destination)}attachments/attachment-1/`,
    )
    expect(
      new Headers(fetchApi.mock.calls[1]![1]!.headers).get('If-Match'),
    ).toBe('"8"')
    await service.download('image-1', '64')
    expect(fetchApi.mock.calls[2]![1]!.body).toBe('{"variant":"64"}')
  })

  it('serializa vínculo e remoção do mesmo destino e relê o ETag após cada escrita', async () => {
    const { service, fetchApi } = setup()
    let release: (() => void) | undefined
    const firstWrite = new Promise<void>((resolve) => {
      release = resolve
    })
    let version = 1
    let writes = 0
    fetchApi.mockImplementation(async (_url, options) => {
      if (options?.method === 'GET')
        return json({}, 200, { ETag: `"${version}"` })
      if (++writes === 1) await firstWrite
      version++
      return options?.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : json({ fileId: 'file-1' }, 201)
    })
    const first = service.link(destination, 'file-1', 'link-1')
    const removal = service.remove(destination, 'attachment-1')
    const second = service.link(destination, 'file-2', 'link-2')
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(2))
    expect(writes).toBe(1)
    release?.()
    await Promise.all([first, removal, second])
    expect(fetchApi.mock.calls.map(([, options]) => options?.method)).toEqual([
      'GET',
      'POST',
      'GET',
      'DELETE',
      'GET',
      'POST',
    ])
    expect(
      [1, 3, 5].map((index) =>
        new Headers(fetchApi.mock.calls[index]![1]!.headers).get('If-Match'),
      ),
    ).toEqual(['"1"', '"2"', '"3"'])
  })

  it('valida extensão, MIME, arquivo vazio e tamanho antes de solicitar intenção', () => {
    expect(() =>
      validateUpload(
        new File(['a'], 'vector.svg', { type: 'image/svg+xml' }),
        'member_avatar',
      ),
    ).toThrow()
    expect(() =>
      validateUpload(
        new File(['a'], 'photo.png', { type: 'application/pdf' }),
        'task_attachment',
      ),
    ).toThrow()
    expect(() =>
      validateUpload(new File([], 'a.pdf'), 'task_attachment'),
    ).toThrow()
    const tooLarge = new File(['a'], 'photo.png')
    Object.defineProperty(tooLarge, 'size', { value: 5 * 1024 * 1024 + 1 })
    expect(() => validateUpload(tooLarge, 'member_avatar')).toThrow('5 MiB')
    expect(
      validateUpload(new File(['name'], 'data.csv'), 'task_attachment'),
    ).toBe('text/csv')
    expect(validateUpload(new File(['a'], 'a.pdf'), 'task_attachment')).toBe(
      'application/pdf',
    )
  })

  it('preserva referência recorrente ao materializar e não mistura destinos', () => {
    const task = {
      occurrenceKey: 'occurrence-1',
      period: '2026-10',
      competenceId: 'competence-1',
      taskId: 'task-1',
    } as Task
    expect(taskFileTarget(task)).toEqual(destination)
    expect(taskFileTarget({ ...task, occurrenceKey: undefined })).toEqual({
      purpose: 'task_attachment',
      target: { competenceId: 'competence-1', taskId: 'task-1' },
    })
  })
})
