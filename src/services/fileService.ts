import { HttpClient, httpClient, isApiError } from './httpClient'
import type { ApiResponse } from './httpClient'
import type {
  AttachmentResource,
  FileTarget,
  FileLinkReceipt,
  ImageSlot,
  PrivateFile,
  UploadIntent,
} from '../types/files'
import type { Task } from '../types/domain'

const fileTypes: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}
export const attachmentAccept = '.pdf,.txt,.csv,.jpg,.jpeg,.png,.webp'
export const imageAccept = '.jpg,.jpeg,.png,.webp'

export class FileProcessingError extends Error {
  constructor(readonly state: 'rejected' | 'deleted') {
    super(
      state === 'rejected'
        ? 'O arquivo foi rejeitado na análise. Selecione outro arquivo.'
        : 'O arquivo foi removido durante o processamento. Selecione outro arquivo.',
    )
    this.name = 'FileProcessingError'
  }
}

export function validateUpload(
  file: File,
  purpose: FileTarget['purpose'],
): string {
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? ''
  const contentType = fileTypes[extension]
  const image = purpose !== 'task_attachment'
  if (!contentType || (image && !contentType.startsWith('image/'))) {
    throw new Error(
      image
        ? 'Selecione uma imagem JPEG, PNG ou WebP.'
        : 'Selecione um arquivo PDF, TXT, CSV, JPEG, PNG ou WebP.',
    )
  }
  // O navegador pode informar CSV como application/vnd.ms-excel ou omitir o MIME.
  if (
    file.type &&
    file.type !== contentType &&
    !(
      extension === 'csv' &&
      ['application/vnd.ms-excel', 'text/plain'].includes(file.type)
    )
  ) {
    throw new Error('O formato do arquivo não corresponde à extensão.')
  }
  const limit = (image ? 5 : 20) * 1024 * 1024
  if (!file.size || file.size > limit) {
    throw new Error(
      `Selecione um arquivo não vazio de até ${image ? 5 : 20} MiB.`,
    )
  }
  return contentType
}

export function taskFileTarget(
  task: Task,
): FileTarget & { purpose: 'task_attachment' } {
  if (task.occurrenceKey) {
    return {
      purpose: 'task_attachment',
      target: {
        referenceMonth: task.period,
        occurrenceKey: task.occurrenceKey,
      },
    }
  }
  if (!task.taskId || !task.competenceId)
    throw new Error('Destino do anexo indisponível.')
  return {
    purpose: 'task_attachment',
    target: { competenceId: task.competenceId, taskId: task.taskId },
  }
}

export function fileOwnerPath(destination: FileTarget): string {
  const id = encodeURIComponent
  if (destination.purpose === 'member_avatar')
    return `/api/v1/organization-members/${id(destination.target.memberId)}/avatar/`
  if (destination.purpose === 'department_image')
    return `/api/v1/departments/${id(destination.target.departmentId)}/image/`
  const target = destination.target
  if ('occurrenceKey' in target)
    return `/api/v1/competences/by-period/${id(target.referenceMonth)}/task-occurrences/${id(target.occurrenceKey)}/`
  return `/api/v1/competences/${id(target.competenceId)}/tasks/${id(target.taskId)}/`
}

export class FileService {
  private readonly destinationWrites = new Map<string, Promise<unknown>>()

  constructor(
    private readonly client: HttpClient,
    private readonly storageFetch: typeof fetch = (...args) =>
      globalThis.fetch(...args),
    private readonly createStorageRequest: () => XMLHttpRequest = () =>
      new XMLHttpRequest(),
  ) {}

  async listAttachments(
    destination: FileTarget,
    signal?: AbortSignal,
  ): Promise<AttachmentResource[]> {
    const results: AttachmentResource[] = []
    let next: string | null = `${fileOwnerPath(destination)}attachments/`
    while (next) {
      const response: ApiResponse<{
        results: AttachmentResource[]
        next: string | null
      }> = await this.client.get(next, { signal })
      results.push(...response.data.results)
      next = response.data.next
    }
    return results
  }

  getImageSlot(destination: FileTarget, signal?: AbortSignal) {
    return this.client.get<ImageSlot>(fileOwnerPath(destination), { signal })
  }

  createIntent(
    file: File,
    destination: FileTarget,
    idempotencyKey: string,
    signal?: AbortSignal,
  ) {
    const contentType = validateUpload(file, destination.purpose)
    return this.client.post<UploadIntent>(
      '/api/v1/files/upload-intents/',
      {
        ...destination,
        originalName: file.name,
        sizeBytes: file.size,
        contentType,
      },
      { idempotencyKey, signal },
    )
  }

  async upload(
    intent: UploadIntent,
    file: File,
    signal?: AbortSignal,
    onProgress?: (percentage: number | null) => void,
  ): Promise<void> {
    signal?.throwIfAborted()
    const url = new URL(intent.upload.url)
    if (!['https:', 'http:'].includes(url.protocol))
      throw new Error('Endereço de envio inválido.')
    if (
      (intent.upload.method && intent.upload.method !== 'POST') ||
      (intent.upload.enctype && intent.upload.enctype !== 'multipart/form-data')
    )
      throw new Error('O armazenamento informou um formato de envio inválido.')
    if (
      intent.uploadExpiresAt &&
      Date.parse(intent.uploadExpiresAt) <= Date.now()
    )
      throw new Error(
        'A autorização de envio expirou. Selecione o arquivo novamente.',
      )
    const form = new FormData()
    for (const [key, value] of Object.entries(intent.upload.fields))
      form.append(key, value)
    form.append('file', file)
    if (onProgress) {
      await this.uploadWithProgress(url.toString(), form, onProgress, signal)
      return
    }
    let response: Response
    try {
      response = await this.storageFetch(url.toString(), {
        method: 'POST',
        body: form,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal,
      })
    } catch (error) {
      signal?.throwIfAborted()
      throw new Error('Não foi possível enviar o arquivo ao armazenamento.', {
        cause: error,
      })
    }
    if (!response.ok)
      throw new Error(
        'O armazenamento recusou o envio. Selecione o arquivo novamente.',
      )
  }

  private uploadWithProgress(
    url: string,
    form: FormData,
    onProgress: (percentage: number | null) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.createStorageRequest()
      const cleanup = () => {
        signal?.removeEventListener('abort', abort)
        request.upload.removeEventListener('progress', progress)
        request.removeEventListener('load', load)
        request.removeEventListener('error', error)
        request.removeEventListener('timeout', error)
        request.removeEventListener('abort', aborted)
      }
      const finish = (failure?: unknown) => {
        cleanup()
        if (failure) reject(failure)
        else resolve()
      }
      const progress = (event: ProgressEvent) => {
        onProgress(
          event.lengthComputable && event.total > 0
            ? Math.min(
                100,
                Math.max(0, Math.round((event.loaded / event.total) * 100)),
              )
            : null,
        )
      }
      const load = () =>
        finish(
          request.status >= 200 && request.status < 300
            ? undefined
            : new Error(
                'O armazenamento recusou o envio. Selecione o arquivo novamente.',
              ),
        )
      const error = () =>
        finish(new Error('Não foi possível enviar o arquivo ao armazenamento.'))
      const aborted = () =>
        finish(
          signal?.reason ?? new DOMException('Envio cancelado.', 'AbortError'),
        )
      const abort = () => {
        request.abort()
        aborted()
      }
      // Registrar antes de open/send também cobre os navegadores que exigem
      // o listener antecipadamente para habilitar progresso entre origens.
      request.upload.addEventListener('progress', progress)
      request.addEventListener('load', load)
      request.addEventListener('error', error)
      request.addEventListener('timeout', error)
      request.addEventListener('abort', aborted)
      signal?.addEventListener('abort', abort, { once: true })
      try {
        signal?.throwIfAborted()
        request.open('POST', url)
        request.withCredentials = false
        // O navegador define o Content-Type com seu boundary. Nunca reutilizar
        // headers, cookies ou CSRF do cliente da API neste request ao storage.
        request.send(form)
      } catch (caught) {
        cleanup()
        reject(caught)
      }
    })
  }

  confirm(intentId: string, signal?: AbortSignal) {
    return this.client.post<PrivateFile>(
      `/api/v1/files/upload-intents/${encodeURIComponent(intentId)}/confirm/`,
      {},
      { signal },
    )
  }

  get(fileId: string, signal?: AbortSignal) {
    return this.client.get<PrivateFile>(
      `/api/v1/files/${encodeURIComponent(fileId)}/`,
      { signal },
    )
  }

  cancel(intentId: string, signal?: AbortSignal) {
    return this.client.delete<void>(
      `/api/v1/files/upload-intents/${encodeURIComponent(intentId)}/`,
      { signal },
    )
  }

  async waitUntilAvailable(
    fileId: string,
    signal: AbortSignal,
    initial?: ApiResponse<PrivateFile>,
    onThrottled?: (retryAfter: string | null) => void,
  ): Promise<PrivateFile> {
    const deadline = Date.now() + 120_000
    let interval = 3000
    let response = initial
    while (Date.now() < deadline) {
      signal.throwIfAborted()
      try {
        response ??= await this.get(fileId, signal)
      } catch (caught) {
        if (!isApiError(caught) || caught.status !== 429) throw caught
        onThrottled?.(caught.retryAfter)
        await abortableDelay(
          Math.min(
            Math.max(interval, retryAfterMs(caught.retryAfter)),
            Math.max(0, deadline - Date.now()),
          ),
          signal,
        )
        interval = Math.min(15_000, interval * 1.5)
        continue
      }
      const { data } = response
      if (data.state === 'available') return data
      if (data.state === 'rejected') throw new FileProcessingError('rejected')
      if (data.state === 'deleted') throw new FileProcessingError('deleted')
      await abortableDelay(
        Math.min(
          Math.max(
            interval,
            retryAfterMs(response.headers?.get('Retry-After')),
          ),
          Math.max(0, deadline - Date.now()),
        ),
        signal,
      )
      interval = Math.min(15_000, interval * 1.5)
      response = undefined
    }
    throw new Error(
      'O arquivo continua em processamento. Use Retomar para consultar novamente.',
    )
  }

  async link(
    destination: FileTarget,
    fileId: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ) {
    return this.serializeDestination(destination, signal, async (path) => {
      const etag = await this.currentVersion(path, signal)
      const options = { ifMatch: etag, idempotencyKey, signal }
      return destination.purpose === 'task_attachment'
        ? this.client.post<FileLinkReceipt>(
            `${path}attachments/`,
            { fileId },
            options,
          )
        : this.client.put<FileLinkReceipt>(path, { fileId }, options)
    })
  }

  async remove(
    destination: FileTarget,
    attachmentId?: string,
    signal?: AbortSignal,
  ) {
    return this.serializeDestination(destination, signal, async (path) => {
      const etag = await this.currentVersion(path, signal)
      return this.client.delete<void>(
        attachmentId
          ? `${path}attachments/${encodeURIComponent(attachmentId)}/`
          : path,
        { ifMatch: etag, signal },
      )
    })
  }

  private async currentVersion(path: string, signal?: AbortSignal) {
    const current = await this.client.get<{ etag?: string }>(path, { signal })
    const etag = current.etag ?? current.data.etag
    if (!etag) throw new Error('A API não informou a versão atual do destino.')
    signal?.throwIfAborted()
    return etag
  }

  private serializeDestination<T>(
    destination: FileTarget,
    signal: AbortSignal | undefined,
    operation: (path: string) => Promise<T>,
  ): Promise<T> {
    const path = fileOwnerPath(destination)
    const previous = this.destinationWrites.get(path) ?? Promise.resolve()
    const current = previous
      .catch(() => undefined)
      .then(async () => {
        signal?.throwIfAborted()
        try {
          return await operation(path)
        } catch (caught) {
          if (isApiError(caught) && caught.status === 412)
            await this.client.get(path, { signal }).catch(() => undefined)
          // Uma alteração concorrente exige retomada explícita. Não repetir a escrita.
          throw caught
        }
      })
    this.destinationWrites.set(path, current)
    void current
      .finally(() => {
        if (this.destinationWrites.get(path) === current)
          this.destinationWrites.delete(path)
      })
      .catch(() => undefined)
    return current
  }

  async download(fileId: string, variant?: '64' | '256', signal?: AbortSignal) {
    const { data } = await this.client.post<{ url: string; expiresIn: number }>(
      `/api/v1/files/${encodeURIComponent(fileId)}/download/`,
      variant ? { variant } : {},
      { signal },
    )
    const url = new URL(data.url)
    if (!['https:', 'http:'].includes(url.protocol))
      throw new Error('Endereço de download inválido.')
    return data
  }
}

function retryAfterMs(value: string | null | undefined): number {
  if (!value) return 0
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function fileErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const messages: Record<number, string> = {
      403: 'Você não tem permissão para esta operação.',
      404: 'Arquivo ou destino indisponível para seu acesso.',
      409: 'Não foi possível concluir: confira o destino, a cota e o limite de anexos.',
      410: 'Este envio expirou. Cancele e selecione o arquivo novamente.',
      412: 'O destino foi alterado por outra pessoa. Os dados foram atualizados; revise antes de tentar novamente.',
      428: 'A API exige a versão atual do destino. Atualize e tente novamente.',
      413: 'O arquivo ultrapassa o tamanho permitido.',
      415: 'Formato de arquivo não permitido.',
      429: 'Muitas solicitações. Aguarde um pouco antes de tentar novamente.',
      501: 'Este recurso de arquivos está temporariamente desabilitado.',
      503: 'O serviço de arquivos está indisponível. Tente novamente mais tarde.',
    }
    return (
      messages[error.status] ??
      'Não foi possível concluir a operação com o arquivo.'
    )
  }
  return error instanceof Error
    ? error.message
    : 'Não foi possível concluir a operação com o arquivo.'
}

export const fileService = new FileService(httpClient)
