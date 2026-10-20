import {
  FileProcessingError,
  fileErrorMessage,
  fileService,
  validateUpload,
} from './fileService'
import { isApiError, type ApiResponse } from './httpClient'
import type { FileTarget, PrivateFile, UploadIntent } from '../types/files'
import type { UploadBatchResult, UploadJob } from '../types/fileUploads'

interface UploadRecord {
  job: UploadJob
  file?: File
  intent?: UploadIntent
  intentKey: string
  intentRequested: boolean
  linkKey: string
  uploaded: boolean
  confirmed?: ApiResponse<PrivateFile>
  linked: boolean
  restart: boolean
  controller?: AbortController
  work?: Promise<void>
}

interface QueueOptions {
  membershipId: string
  onChanged: (job: UploadJob, signal?: AbortSignal) => Promise<boolean | void>
  onBatch: (result: UploadBatchResult) => void
  service?: typeof fileService
  paceMs?: number
}

/** Owns browser files and requests independently of the screen that selected them. */
export class FileUploadQueue {
  private records = new Map<string, UploadRecord>()
  private listeners = new Set<() => void>()
  private snapshot: UploadJob[] = []
  private reported = new Set<string>()
  private active = 0
  private disposed = false
  private cooldownUntil = 0
  private wakeTimer?: ReturnType<typeof setTimeout>
  private nextRequestAt = 0
  private requestTail: Promise<void> = Promise.resolve()
  private service: typeof fileService

  constructor(private options: QueueOptions) {
    this.service = options.service ?? fileService
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot

  activate() {
    this.disposed = false
  }

  enqueue = (files: File[], destination: FileTarget, label: string) => {
    if (this.disposed || !files.length) return
    const batchId = crypto.randomUUID()
    for (const file of files) {
      const job: UploadJob = {
        id: crypto.randomUUID(),
        batchId,
        destination: structuredClone(destination),
        label,
        fileName: file.name,
        sizeBytes: file.size,
        state: 'queued',
        progress: null,
      }
      try {
        validateUpload(file, destination.purpose)
      } catch (error) {
        job.state = 'error'
        job.error = fileErrorMessage(error)
        job.canRetry = false
      }
      this.records.set(job.id, {
        job,
        file,
        intentKey: crypto.randomUUID(),
        intentRequested: false,
        linkKey: crypto.randomUUID(),
        uploaded: false,
        linked: false,
        restart: false,
      })
    }
    this.emit()
    this.pump()
    this.reportBatches()
  }

  retry = (id: string) => {
    const record = this.records.get(id)
    if (
      this.disposed ||
      !record ||
      record.job.state !== 'error' ||
      record.work ||
      record.job.canRetry === false
    )
      return
    if (record.job.retryAt && record.job.retryAt > Date.now()) return
    this.reported.delete(record.job.batchId)
    if (record.job.cancelFailed) {
      void this.cancel(id)
      return
    }
    this.update(record, {
      state: 'queued',
      error: undefined,
      retryAt: undefined,
    })
    this.pump()
  }

  cancel = async (id: string) => {
    const record = this.records.get(id)
    if (
      this.disposed ||
      !record ||
      ['completed', 'cancelled', 'cancelling'].includes(record.job.state)
    )
      return
    this.reported.delete(record.job.batchId)
    this.update(record, { state: 'cancelling', error: undefined })
    record.controller?.abort()
    // A late create response must settle before deciding which intent to cancel.
    await record.work
    if (this.disposed) return
    const controller = new AbortController()
    record.controller = controller
    try {
      if (record.linked) {
        const reconciled = await this.options
          .onChanged(record.job, controller.signal)
          .catch(() => false)
        record.file = undefined
        this.update(record, {
          state: 'completed',
          progress: null,
          reconciled: Boolean(reconciled),
        })
      } else {
        // Aborting fetch can lose a successful create response. Recover its receipt
        // with the same payload/key before claiming that its reservation is gone.
        if (!record.intent && record.intentRequested && record.file) {
          const recovered = await this.api(
            () =>
              this.service.createIntent(
                record.file!,
                record.job.destination,
                record.intentKey,
                controller.signal,
              ),
            controller.signal,
          )
          record.intent = recovered.data
        }
        if (record.intent)
          await this.api(
            () =>
              this.service.cancel(record.intent!.intentId, controller.signal),
            controller.signal,
          )
        if (this.disposed) return
        record.intent = undefined
        record.intentRequested = false
        record.file = undefined
        this.update(record, {
          state: 'cancelled',
          progress: null,
          cancelFailed: false,
        })
      }
    } catch (error) {
      if (this.disposed) return
      if (isApiError(error) && [404, 410].includes(error.status)) {
        record.intent = undefined
        record.intentRequested = false
        record.file = undefined
        this.update(record, {
          state: 'cancelled',
          progress: null,
          cancelFailed: false,
        })
        return
      }
      if (isApiError(error) && error.status === 409 && record.intent) {
        const linked = await this.reconcileLinkedCancellation(
          record,
          controller.signal,
        ).catch(() => false)
        if (linked || this.disposed) return
      }
      this.update(record, {
        state: 'error',
        error: `Não foi possível cancelar. ${fileErrorMessage(error)}`,
        progress: null,
        cancelFailed: true,
        canRetry: true,
        retryAt:
          this.cooldownUntil > Date.now() ? this.cooldownUntil : undefined,
      })
    } finally {
      record.controller = undefined
      this.reportBatches()
      this.pump()
    }
  }

  private async reconcileLinkedCancellation(
    record: UploadRecord,
    signal: AbortSignal,
  ): Promise<boolean> {
    const fileId = record.intent!.fileId
    if (record.job.destination.purpose === 'task_attachment') {
      const attachments = await this.api(
        () => this.service.listAttachments(record.job.destination, signal),
        signal,
      )
      const attachment = attachments.find((item) => item.file.fileId === fileId)
      if (!attachment) return false
      this.update(record, { attachment })
    } else {
      const slot = await this.api(
        () => this.service.getImageSlot(record.job.destination, signal),
        signal,
      )
      if (slot.data.file?.fileId !== fileId) return false
    }
    record.linked = true
    const reconciled = await this.options
      .onChanged(record.job, signal)
      .catch(() => false)
    signal.throwIfAborted()
    record.file = undefined
    this.update(record, {
      state: 'completed',
      progress: null,
      reconciled: Boolean(reconciled),
      cancelFailed: false,
    })
    return true
  }

  dismiss = (id: string) => {
    const record = this.records.get(id)
    if (!record || !['completed', 'cancelled'].includes(record.job.state))
      return
    this.records.delete(id)
    this.emit()
  }

  dispose() {
    this.disposed = true
    clearTimeout(this.wakeTimer)
    for (const record of this.records.values()) {
      record.controller?.abort()
      record.file = undefined
    }
    // No cleanup API writes: membership/session cookies may already have changed.
    this.listeners.clear()
  }

  private update(record: UploadRecord, patch: Partial<UploadJob>) {
    record.job = { ...record.job, ...patch }
    this.emit()
  }

  private emit() {
    if (this.disposed) return
    this.snapshot = [...this.records.values()].map((record) => record.job)
    this.listeners.forEach((listener) => listener())
  }

  private pump() {
    if (this.disposed) return
    clearTimeout(this.wakeTimer)
    if (this.cooldownUntil > Date.now()) {
      this.wakeTimer = setTimeout(
        () => this.pump(),
        this.cooldownUntil - Date.now(),
      )
      return
    }
    for (const record of this.records.values()) {
      if (this.active >= 2) break
      if (record.job.state !== 'queued' || record.work) continue
      const reserved = [...this.records.values()].filter(
        (item) =>
          !item.linked && (item.intent || item.job.state === 'preparing'),
      ).length
      if (!record.intent && reserved >= 10) {
        this.update(record, {
          state: 'error',
          error:
            'Há muitos arquivos pendentes. Conclua ou cancele outros envios antes de tentar novamente.',
        })
        continue
      }
      this.active++
      record.work = this.run(record).finally(() => {
        record.work = undefined
        this.active--
        this.reportBatches()
        this.pump()
      })
    }
    this.reportBatches()
  }

  /** Reserve API slots globally; storage transfers run concurrently. */
  private async api<T>(
    action: () => Promise<T>,
    signal: AbortSignal,
    cost = 1,
  ): Promise<T> {
    const permit = this.requestTail.then(async () => {
      // A concurrent response can extend Retry-After while this permit sleeps.
      while (Math.max(this.nextRequestAt, this.cooldownUntil) > Date.now()) {
        await delay(
          Math.max(this.nextRequestAt, this.cooldownUntil) - Date.now(),
          signal,
        )
      }
      this.nextRequestAt = Date.now() + (this.options.paceMs ?? 1000) * cost
    })
    this.requestTail = permit.catch(() => undefined)
    await permit
    while (this.cooldownUntil > Date.now())
      await delay(this.cooldownUntil - Date.now(), signal)
    signal.throwIfAborted()
    try {
      return await action()
    } catch (error) {
      if (isApiError(error) && error.status === 429)
        this.cooldownUntil = Date.now() + retryDelay(error.retryAfter)
      throw error
    }
  }

  private async run(record: UploadRecord) {
    const controller = new AbortController()
    record.controller = controller
    const signal = controller.signal
    try {
      const file = record.file
      if (!file)
        throw new Error(
          'Selecione o arquivo novamente para iniciar outro envio.',
        )
      validateUpload(file, record.job.destination.purpose)
      this.update(record, {
        state: 'preparing',
        error: undefined,
        progress: null,
      })
      if (record.restart && record.intent) {
        await this.api(
          () => this.service.cancel(record.intent!.intentId, signal),
          signal,
        )
        record.intent = undefined
        record.intentRequested = false
        record.intentKey = crypto.randomUUID()
        record.linkKey = crypto.randomUUID()
        record.confirmed = undefined
        record.uploaded = false
        record.restart = false
      }
      if (!record.intent) {
        const { data } = await this.api(async () => {
          const previouslyRequested = record.intentRequested
          record.intentRequested = true
          try {
            return await this.service.createIntent(
              file,
              record.job.destination,
              record.intentKey,
              signal,
            )
          } catch (error) {
            if (isApiError(error)) record.intentRequested = previouslyRequested
            throw error
          }
        }, signal)
        record.intent = data
        record.restart = false
      }
      signal.throwIfAborted()
      if (!record.uploaded) {
        this.update(record, { state: 'uploading', progress: null })
        try {
          await this.service.upload(record.intent, file, signal, (progress) => {
            if (!signal.aborted) this.update(record, { progress })
          })
          record.uploaded = true
        } catch (error) {
          // Never confirm an interrupted or ambiguous storage transfer.
          record.restart = true
          throw error
        }
      }
      signal.throwIfAborted()
      this.update(record, { state: 'verifying', progress: null })
      if (!record.confirmed) {
        record.confirmed = await this.api(
          () => this.service.confirm(record.intent!.intentId, signal),
          signal,
        )
      }
      const approved = await this.service.waitUntilAvailable(
        record.intent.fileId,
        signal,
        record.confirmed,
        (retryAfter) => {
          this.cooldownUntil = Date.now() + retryDelay(retryAfter)
        },
      )
      signal.throwIfAborted()
      this.update(record, { state: 'linking' })
      if (!record.linked) {
        const receipt = await this.api(
          () =>
            this.service.link(
              record.job.destination,
              record.intent!.fileId,
              record.linkKey,
              signal,
            ),
          signal,
          2,
        )
        record.linked = true
        if (receipt.data.attachmentId) {
          this.update(record, {
            attachment: {
              attachmentId: receipt.data.attachmentId,
              createdByMemberId: this.options.membershipId,
              createdAt: '',
              file: approved,
            },
          })
        }
      }
      signal.throwIfAborted()
      const reconciled = await this.options
        .onChanged(record.job, signal)
        .catch(() => false)
      if (reconciled) record.job = { ...record.job, reconciled: true }
      signal.throwIfAborted()
      record.file = undefined
      this.update(record, { state: 'completed', progress: null })
    } catch (error) {
      if (signal.aborted || this.disposed) return
      if (error instanceof FileProcessingError) {
        // A terminal file cannot be approved by polling it again.
        if (error.state === 'deleted') {
          record.intent = undefined
          record.intentRequested = false
        }
        record.restart = true
        record.intentKey = crypto.randomUUID()
        record.linkKey = crypto.randomUUID()
        record.confirmed = undefined
        record.uploaded = false
        if (error.state === 'rejected')
          record.job = { ...record.job, canRetry: false }
      }
      if (isApiError(error)) {
        if ([404, 410].includes(error.status)) {
          record.intent = undefined
          record.intentRequested = false
          record.intentKey = crypto.randomUUID()
          record.linkKey = crypto.randomUUID()
          record.confirmed = undefined
          record.uploaded = false
        }
        if (error.status === 412)
          await this.options
            .onChanged(record.job, signal)
            .catch(() => undefined)
      }
      this.update(record, {
        state: 'error',
        progress: null,
        error: fileErrorMessage(error),
        retryAt:
          this.cooldownUntil > Date.now() ? this.cooldownUntil : undefined,
      })
    } finally {
      if (record.controller === controller) record.controller = undefined
    }
  }

  private reportBatches() {
    if (this.disposed) return
    const batches = new Map<string, UploadJob[]>()
    this.snapshot.forEach((job) =>
      batches.set(job.batchId, [...(batches.get(job.batchId) ?? []), job]),
    )
    for (const [id, jobs] of batches) {
      if (
        this.reported.has(id) ||
        jobs.some(
          (job) => !['completed', 'error', 'cancelled'].includes(job.state),
        )
      )
        continue
      this.reported.add(id)
      this.options.onBatch({
        id,
        label: jobs[0].label,
        purpose: jobs[0].destination.purpose,
        completed: jobs.filter((job) => job.state === 'completed').length,
        failed: jobs.filter((job) => job.state === 'error').length,
        cancelled: jobs.filter((job) => job.state === 'cancelled').length,
      })
    }
  }
}

function retryDelay(value: string | null): number {
  if (!value) return 5000
  const seconds = Number(value)
  return Number.isFinite(seconds)
    ? Math.max(1000, seconds * 1000)
    : Math.max(1000, Date.parse(value) - Date.now() || 5000)
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  if (!ms) return Promise.resolve()
  return new Promise((resolve, reject) => {
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
