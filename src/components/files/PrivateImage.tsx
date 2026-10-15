import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../../contexts/authContextDefinition'
import { fileService } from '../../services/fileService'
import type { ImageReference } from '../../types/files'

export default function PrivateImage({
  reference,
  label,
  variant = '64',
  className = 'size-10',
  shape = 'avatar',
}: {
  reference?: ImageReference | null
  label: string
  variant?: '64' | '256'
  className?: string
  shape?: 'avatar' | 'department'
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
  const appearance =
    shape === 'avatar'
      ? 'rounded-full bg-[var(--color-sidebar-icon-bg)] text-[var(--color-sidebar-icon-text)]'
      : 'rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
  const frame = `shrink-0 ring-1 ring-[var(--color-control-border)] ${appearance} ${className}`
  return image?.identity === identity ? (
    <img
      src={image.url}
      alt={label}
      referrerPolicy="no-referrer"
      onError={() => setImage(null)}
      className={`object-cover ${frame}`}
    />
  ) : (
    <span
      role="img"
      aria-label={label}
      className={`inline-grid place-items-center text-xs font-extrabold ${frame}`}
    >
      {initials}
    </span>
  )
}
