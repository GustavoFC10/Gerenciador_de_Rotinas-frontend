import { useEffect, useRef, useState } from 'react'

import { fileErrorMessage, fileService } from '../services/fileService'
import type { FileTarget, UploadIntent } from '../types/files'
import type { ApiResponse } from '../services/httpClient'
import type { PrivateFile } from '../types/files'
import { useNotifications } from './useNotifications'

export type FileUploadPhase =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'verifying'
  | 'linking'
  | 'completed'
  | 'error'
  | 'cancelling'
  | 'cancelled'

interface UseFileUploadOptions {
  destination: FileTarget | null
  disabled?: boolean
  onChanged: () => Promise<void>
}

interface PendingUpload {
  intent: UploadIntent
  destination: FileTarget
  linkKey: string
  uploaded: boolean
  confirmed: boolean
  linked: boolean
  confirmation?: ApiResponse<PrivateFile>
}

export function useFileUpload({
  destination,
  disabled,
  onChanged,
}: UseFileUploadOptions) {
  const { notify } = useNotifications()
  const [phase, setPhase] = useState<FileUploadPhase>('idle')
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasPending, setHasPending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [fileName, setFileName] = useState('')
  const pending = useRef<PendingUpload | null>(null)
  const controller = useRef<AbortController | null>(null)
  const running = useRef(false)
  const cancelInProgress = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      controller.current?.abort()
      const current = pending.current
      if (current && !current.linked)
        void fileService.cancel(current.intent.intentId).catch(() => undefined)
    }
  }, [])

  async function finish(signal: AbortSignal) {
    signal.throwIfAborted()
    const current = pending.current
    if (!current) return
    if (!current.linked) {
      if (!current.confirmed) {
        setPhase('verifying')
        setProgress(null)
        setStatus('Verificando…')
        current.confirmation = await fileService.confirm(
          current.intent.intentId,
          signal,
        )
        current.confirmed = true
      }
      signal.throwIfAborted()
      setPhase('verifying')
      setProgress(null)
      setStatus('Verificando…')
      const initial = current.confirmation
      current.confirmation = undefined
      await fileService.waitUntilAvailable(
        current.intent.fileId,
        signal,
        initial,
      )
      signal.throwIfAborted()
      setPhase('linking')
      setStatus('Vinculando arquivo…')
      await fileService.link(
        current.destination,
        current.intent.fileId,
        current.linkKey,
        signal,
      )
      current.linked = true
    }
    signal.throwIfAborted()
    await onChanged()
    signal.throwIfAborted()
    pending.current = null
    setHasPending(false)
    setPhase('completed')
    setStatus('Arquivo salvo.')
    notify({
      title: 'Arquivo salvo',
      tone: 'success',
      dedupeKey: 'image-upload-success',
    })
  }

  async function run(file?: File, destinationOverride?: FileTarget) {
    if (
      running.current ||
      cancelInProgress.current ||
      disabled ||
      (file && pending.current)
    )
      return
    const target = destinationOverride ?? destination
    if (file && !target) return
    running.current = true
    const active = new AbortController()
    controller.current = active
    setBusy(true)
    setError('')
    try {
      if (file && target) {
        setFileName(file.name)
        setPhase('preparing')
        setProgress(null)
        setStatus('Preparando envio…')
        const { data: intent } = await fileService.createIntent(
          file,
          target,
          crypto.randomUUID(),
          active.signal,
        )
        if (active.signal.aborted) {
          void fileService.cancel(intent.intentId).catch(() => undefined)
          active.signal.throwIfAborted()
        }
        pending.current = {
          intent,
          destination: target,
          linkKey: crypto.randomUUID(),
          uploaded: false,
          confirmed: false,
          linked: false,
        }
        setHasPending(true)
        setPhase('uploading')
        setStatus('Enviando arquivo…')
        try {
          await fileService.upload(
            intent,
            file,
            active.signal,
            (percentage) => {
              if (!active.signal.aborted && mounted.current)
                setProgress(percentage)
            },
          )
          if (pending.current?.intent.intentId === intent.intentId)
            pending.current.uploaded = true
          active.signal.throwIfAborted()
        } catch (uploadError) {
          if (!active.signal.aborted) {
            await fileService.cancel(intent.intentId).catch(() => undefined)
            if (pending.current?.intent.intentId === intent.intentId) {
              pending.current = null
              setHasPending(false)
            }
          }
          throw uploadError
        }
      }
      await finish(active.signal)
    } catch (caught) {
      if (!active.signal.aborted && mounted.current) {
        setPhase('error')
        setStatus('')
        const message = fileErrorMessage(caught)
        setError(message)
        notify({
          title: 'Não foi possível salvar o arquivo',
          message,
          tone: 'error',
          dedupeKey: 'image-upload-error',
        })
        await onChanged().catch(() => undefined)
      }
    } finally {
      if (controller.current === active && !active.signal.aborted) {
        running.current = false
        if (mounted.current) setBusy(false)
      }
    }
  }

  async function cancel() {
    if (cancelInProgress.current) return
    cancelInProgress.current = true
    setCancelling(true)
    setPhase('cancelling')
    controller.current?.abort()
    setBusy(true)
    setError('')
    try {
      const current = pending.current
      if (current && !current.linked)
        await fileService.cancel(current.intent.intentId)
      if (!mounted.current) return
      pending.current = null
      setHasPending(false)
      setPhase('cancelled')
      setStatus('Envio encerrado.')
      await onChanged()
    } catch (caught) {
      if (mounted.current) {
        setPhase('error')
        let message: string
        if (pending.current && !pending.current.uploaded) {
          // Bytes interrompidos não podem ser confirmados numa retomada.
          pending.current = null
          setHasPending(false)
          message =
            'O envio foi interrompido. Selecione o arquivo novamente para tentar de novo.'
        } else {
          message = fileErrorMessage(caught)
        }
        setError(message)
        notify({
          title: 'O envio precisa de atenção',
          message,
          tone: 'error',
          dedupeKey: 'image-upload-error',
        })
        await onChanged().catch(() => undefined)
      }
    } finally {
      running.current = false
      cancelInProgress.current = false
      if (mounted.current) {
        setBusy(false)
        setCancelling(false)
      }
    }
  }

  function dismiss() {
    if (running.current || pending.current) return
    setStatus('')
    setError('')
    setFileName('')
    setPhase('idle')
    setProgress(null)
  }

  return {
    status,
    phase,
    progress,
    error,
    busy,
    hasPending,
    cancelling,
    fileName,
    run,
    cancel,
    dismiss,
  }
}
