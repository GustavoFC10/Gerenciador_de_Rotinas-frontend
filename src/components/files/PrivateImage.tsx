import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../../contexts/authContextDefinition'
import { fileService } from '../../services/fileService'
import type { ImageReference } from '../../types/files'

export default function PrivateImage({
  reference,
  label,
  variant = '64',
  className = 'size-10',
}: {
  reference?: ImageReference | null
  label: string
  variant?: '64' | '256'
  className?: string
}) {
  const auth = useContext(AuthContext)
  const scope = auth?.activeMembership
  const fileId = reference?.fileId
  const identity = `${scope?.organization.id}:${scope?.id}:${reference?.fileId}:${reference?.version}:${variant}`
  const [image, setImage] = useState<{ identity: string; url: string } | null>(
    null,
  )
  useEffect(() => {
    if (!fileId || !scope) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function renew() {
      try {
        const data = await fileService.download(
          fileId!,
          variant,
          controller.signal,
        )
        if (controller.signal.aborted) return
        setImage({ identity, url: data.url })
        timer = setTimeout(
          () => void renew(),
          Math.max(1000, data.expiresIn * 800),
        )
      } catch {
        if (!controller.signal.aborted) {
          setImage(null)
          timer = setTimeout(() => void renew(), 60_000)
        }
      }
    }
    void renew()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [identity, fileId, scope, variant])
  const initials =
    label
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase('pt-BR') || '?'
  return image?.identity === identity ? (
    <img
      src={image.url}
      alt={label}
      referrerPolicy="no-referrer"
      onError={() => setImage(null)}
      className={`shrink-0 rounded-[var(--radius-control)] object-cover ${className}`}
    />
  ) : (
    <span
      role="img"
      aria-label={label}
      className={`inline-grid shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-sm font-bold text-[var(--color-brand)] ${className}`}
    >
      {initials}
    </span>
  )
}
