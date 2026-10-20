import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { useImageSlot } from '../../hooks/useFileQueries'
import { useNotifications } from '../../hooks/useNotifications'
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
  const { notify } = useNotifications()
  const [busy, setBusy] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const query = useImageSlot(scope, destination)
  const { error: queryError, refetch: refetchImage } = query
  const isAvatar = destination.purpose === 'member_avatar'
  const reportedQueryError = useRef<unknown>(null)
  useEffect(() => {
    if (!queryError) {
      reportedQueryError.current = null
      return
    }
    if (
      reportedQueryError.current === queryError ||
      (isApiError(queryError) && queryError.status === 501)
    )
      return
    reportedQueryError.current = queryError
    notify({
      title: isAvatar ? 'Foto indisponível' : 'Imagem indisponível',
      message: fileErrorMessage(queryError),
      tone: 'error',
      dedupeKey: 'image-slot-load',
      action: {
        label: 'Tentar novamente',
        onClick: () => {
          void refetchImage()
        },
      },
    })
  }, [isAvatar, notify, queryError, refetchImage])
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
    try {
      await fileService.remove(destination, undefined, active.signal)
      await refresh()
      notify({
        title: isAvatar ? 'Foto removida' : 'Imagem removida',
        tone: 'success',
        dedupeKey: 'image-remove',
      })
    } catch (caught) {
      if (!active.signal.aborted) {
        notify({
          title: isAvatar
            ? 'Não foi possível remover a foto'
            : 'Não foi possível remover a imagem',
          message: fileErrorMessage(caught),
          tone: 'error',
          dedupeKey: 'image-remove',
        })
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
        <Button
          size="sm"
          tone="neutral"
          className="gap-1.5"
          title={isAvatar ? 'Foto indisponível' : 'Imagem indisponível'}
          onClick={() => void query.refetch()}
        >
          <FileIcon name="retry" />
          Tentar novamente
        </Button>
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
      </div>
    </section>
  )
}
