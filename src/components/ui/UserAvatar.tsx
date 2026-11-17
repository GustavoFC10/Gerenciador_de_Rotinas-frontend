import { useState } from 'react'

import type { ImageReference } from '../../types/files'
import PrivateImage from '../files/PrivateImage'

export default function UserAvatar({
  name,
  avatar,
  avatarUrl,
  size = 'sm',
}: {
  name: string
  avatar?: ImageReference | null
  avatarUrl?: string
  size?: 'sm' | 'lg'
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const sizeClass = size === 'lg' ? 'size-16 text-lg' : 'size-9 text-xs'
  const frameClass = `${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-[var(--color-control-border)]`
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase('pt-BR') || 'U'

  if (avatar) {
    return (
      <PrivateImage
        reference={avatar}
        label={name}
        variant={size === 'lg' ? '256' : '64'}
        className={sizeClass}
      />
    )
  }

  if (avatarUrl && avatarUrl !== failedUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setFailedUrl(avatarUrl)}
        className={frameClass}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-grid place-items-center bg-[var(--color-brand-soft)] font-semibold text-[var(--color-brand)] ${frameClass}`}
    >
      {initials}
    </span>
  )
}
