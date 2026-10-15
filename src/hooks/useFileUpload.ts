import { useEffect, useRef, useState } from 'react'

import { fileErrorMessage, fileService } from '../services/fileService'
import type { FileTarget, UploadIntent } from '../types/files'

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
}

export function useFileUpload({
  destination,
  disabled,
  onChanged,
}: UseFileUploadOptions) {
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
        setStatus('Confirmando envio…')
        await fileService.confirm(current.intent.intentId, signal)
        current.confirmed = true
      }
      signal.throwIfAborted()
      setStatus('Processando arquivo…')
      await fileService.waitUntilAvailable(current.intent.fileId, signal)
      signal.throwIfAborted()
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
    setStatus('Arquivo salvo.')
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
        setStatus('Enviando arquivo…')
        try {
          await fileService.upload(intent, file, active.signal)
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
        setStatus('')
        setError(fileErrorMessage(caught))
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
      setStatus('Envio encerrado.')
      await onChanged()
    } catch (caught) {
      if (mounted.current) {
        if (pending.current && !pending.current.uploaded) {
          // Bytes interrompidos não podem ser confirmados numa retomada.
          pending.current = null
          setHasPending(false)
          setError(
            'O envio foi interrompido. Selecione o arquivo novamente para tentar de novo.',
          )
        } else {
          setError(fileErrorMessage(caught))
        }
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
  }

  return {
    status,
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
