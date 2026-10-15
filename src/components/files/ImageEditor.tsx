import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { useImageSlot } from '../../hooks/useFileQueries'
import { queryKeys, type OrganizationQueryScope } from '../../query/queryKeys'
import { isApiError } from '../../services/httpClient'
import {
  fileErrorMessage,
  fileOwnerPath,
  fileService,
} from '../../services/fileService'
import type { FileTarget } from '../../types/files'
import type { AppUser } from '../../types/domain'
import { isOrganizationAdmin } from '../../utils/permissions'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import FileIcon from './FileIcon'
import FileUploadControl from './FileUploadControl'
import PrivateImage from './PrivateImage'

type ImageDestination = Exclude<FileTarget, { purpose: 'task_attachment' }>

export default function ImageEditor({
  destination,
  label,
}: {
  destination: ImageDestination
  label: string
}) {
  const { activeMembership, user, refreshSession } = useAuth()
  if (!activeMembership || !user) return null
  const identity = `${activeMembership.organization.id}:${activeMembership.id}:${fileOwnerPath(destination)}`
  return (
    <ImageEditorContent
      key={identity}
      destination={destination}
      label={label}
      scope={{
        organizationId: activeMembership.organization.id,
        membershipId: activeMembership.id,
      }}
      user={user}
      refreshSession={refreshSession}
    />
  )
}

function ImageEditorContent({
  destination,
  label,
  scope,
  user,
  refreshSession,
}: {
  destination: ImageDestination
  label: string
  scope: OrganizationQueryScope
  user: AppUser
  refreshSession: () => Promise<void>
}) {
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const query = useImageSlot(scope, destination)
  const ownAvatar =
    destination.purpose === 'member_avatar' &&
    destination.target.memberId === user.membershipId
  const canReplace =
    destination.purpose === 'department_image'
      ? isOrganizationAdmin(user)
      : ownAvatar
  const canRemove =
    canReplace ||
    (destination.purpose === 'member_avatar' && isOrganizationAdmin(user))
  async function refresh() {
    await client.invalidateQueries({ queryKey: queryKeys.scope(scope) })
    if (ownAvatar) await refreshSession()
  }
  async function remove() {
    if (busy || isUploading) return
    const active = new AbortController()
    controller.current = active
    setBusy(true)
    setError('')
    try {
      await fileService.remove(destination, undefined, active.signal)
      await refresh()
    } catch (caught) {
      if (!active.signal.aborted) {
        setError(fileErrorMessage(caught))
        await refresh().catch(() => undefined)
      }
    } finally {
      if (!active.signal.aborted) setBusy(false)
    }
  }
  const reference = query.data?.file
    ? {
        fileId: query.data.file.fileId,
        version: query.data.version,
        variants: query.data.file.variants.map((variant) => variant.kind),
      }
    : null

  // A flag desabilitada não é um erro da pessoa nem um estado de edição.
  if (
    query.isPending ||
    (isApiError(query.error) && query.error.status === 501)
  )
    return null
  if (!reference && !canReplace && !query.error) return null
  const isAvatar = destination.purpose === 'member_avatar'
  const uploadLabel = `${reference ? 'Trocar' : 'Adicionar'} ${isAvatar ? 'foto' : 'imagem'}`
  return (
    <section
      aria-label={
        destination.purpose === 'member_avatar'
          ? 'Foto do colaborador'
          : 'Imagem do departamento'
      }
      className="flex max-w-full flex-wrap items-center gap-3"
    >
      {reference && (
        <PrivateImage
          reference={reference}
          label={label}
          variant="256"
          className="size-12"
          shape={isAvatar ? 'avatar' : 'department'}
        />
      )}
      {query.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]"
        >
          <p>{isAvatar ? 'Foto indisponível.' : 'Imagem indisponível.'}</p>
          <Button
            size="sm"
            tone="neutral"
            className="gap-1.5"
            onClick={() => void query.refetch()}
          >
            <FileIcon name="retry" />
            Tentar novamente
          </Button>
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start gap-2">
          {canReplace && !query.error && (
            <FileUploadControl
              destination={destination}
              label={uploadLabel}
              disabled={busy}
              onChanged={refresh}
              onBusyChange={setIsUploading}
            />
          )}
          {canRemove && query.data?.file && !query.error && (
            <IconButton
              label={isAvatar ? 'Remover foto' : 'Remover imagem'}
              tone="ghost"
              disabled={busy || isUploading}
              onClick={() => void remove()}
              className="shrink-0 hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error-text)]"
            >
              <FileIcon
                name={busy ? 'progress' : 'remove'}
                className={`size-4 ${busy ? 'animate-spin motion-reduce:animate-none' : ''}`}
              />
            </IconButton>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="max-w-sm rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-xs font-semibold text-[var(--status-error-text)]"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
