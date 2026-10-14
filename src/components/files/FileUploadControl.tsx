import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import {
  attachmentAccept,
  fileErrorMessage,
  fileService,
  imageAccept,
} from '../../services/fileService'
import type { FileTarget, UploadIntent } from '../../types/files'

interface Props {
  destination: FileTarget
  disabled?: boolean
  onChanged: () => Promise<void>
}

export default function FileUploadControl({
  destination,
  disabled,
  onChanged,
}: Props) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasPending, setHasPending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const pending = useRef<{
    intent: UploadIntent
    linkKey: string
    confirmed: boolean
    linked: boolean
  } | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      controller.current?.abort()
      const current = pending.current
      if (current && !current.linked)
        void fileService.cancel(current.intent.intentId).catch(() => undefined)
    },
    [],
  )

  async function finish(signal: AbortSignal) {
    signal.throwIfAborted()
    const current = pending.current
    if (!current) return
    if (!current.linked) {
      setStatus('Confirmando envio…')
      if (!current.confirmed) {
        await fileService.confirm(current.intent.intentId, signal)
        current.confirmed = true
      }
      setStatus('Processando arquivo…')
      await fileService.waitUntilAvailable(current.intent.fileId, signal)
      setStatus('Vinculando arquivo…')
      await fileService.link(
        destination,
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

  async function run(file?: File) {
    if (busy || disabled) return
    const active = new AbortController()
    controller.current = active
    setBusy(true)
    setError('')
    try {
      if (file) {
        setStatus('Preparando envio…')
        const { data: intent } = await fileService.createIntent(
          file,
          destination,
          crypto.randomUUID(),
          active.signal,
        )
        pending.current = {
          intent,
          linkKey: crypto.randomUUID(),
          confirmed: false,
          linked: false,
        }
        setHasPending(true)
        setStatus('Enviando arquivo…')
        try {
          await fileService.upload(intent, file, active.signal)
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
      if (!active.signal.aborted) {
        setStatus('')
        setError(fileErrorMessage(caught))
        // Atualiza o destino após conflito, sem repetir a escrita automaticamente.
        await onChanged().catch(() => undefined)
      }
    } finally {
      if (!active.signal.aborted) setBusy(false)
    }
  }

  async function cancel() {
    if (cancelling) return
    setCancelling(true)
    controller.current?.abort()
    setBusy(true)
    setError('')
    try {
      const current = pending.current
      if (current && !current.linked)
        await fileService.cancel(current.intent.intentId)
      pending.current = null
      setHasPending(false)
      setStatus('Envio encerrado.')
      await onChanged()
    } catch (caught) {
      setError(fileErrorMessage(caught))
      await onChanged().catch(() => undefined)
    } finally {
      setBusy(false)
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <label className="grid gap-2 font-semibold">
        {destination.purpose === 'task_attachment'
          ? 'Anexar arquivo'
          : 'Selecionar imagem'}
        <input
          type="file"
          accept={
            destination.purpose === 'task_attachment'
              ? attachmentAccept
              : imageAccept
          }
          disabled={disabled || busy || hasPending}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void run(file)
          }}
        />
      </label>
      <p className="text-xs text-[var(--color-text-muted)]">
        {destination.purpose === 'task_attachment'
          ? 'PDF, TXT, CSV, JPEG, PNG ou WebP, até 20 MiB.'
          : 'JPEG, PNG ou WebP, até 5 MiB e 16 megapixels. Recorte quadrado central.'}
      </p>
      {status && <p role="status">{status}</p>}
      {error && (
        <p role="alert" className="text-[var(--status-error-text)]">
          {error}
        </p>
      )}
      {hasPending && (
        <div className="flex gap-2">
          {!busy && (
            <Button
              tone="neutral"
              disabled={disabled}
              onClick={() => void run()}
            >
              Retomar
            </Button>
          )}
          <Button
            tone="neutral"
            disabled={cancelling}
            onClick={() => void cancel()}
          >
            Cancelar envio
          </Button>
        </div>
      )}
    </div>
  )
}
