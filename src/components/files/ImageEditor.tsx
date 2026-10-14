import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { queryKeys } from '../../query/queryKeys'
import { httpClient } from '../../services/httpClient'
import {
  fileErrorMessage,
  fileOwnerPath,
  fileService,
} from '../../services/fileService'
import type { FileTarget, ImageSlot } from '../../types/files'
import { isOrganizationAdmin } from '../../utils/permissions'
import Button from '../ui/Button'
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
  const { activeMembership, user } = useAuth()
  if (!activeMembership || !user) return null
  const identity = `${activeMembership.organization.id}:${activeMembership.id}:${fileOwnerPath(destination)}`
  return (
    <ImageEditorContent
      key={identity}
      destination={destination}
      label={label}
    />
  )
}

function ImageEditorContent({
  destination,
  label,
}: {
  destination: ImageDestination
  label: string
}) {
  const { activeMembership, user, refreshSession } = useAuth()
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const scope = {
    organizationId: activeMembership!.organization.id,
    membershipId: activeMembership!.id,
  }
  const key = [
    ...queryKeys.scope(scope),
    'image-slot',
    fileOwnerPath(destination),
  ]
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      (await httpClient.get<ImageSlot>(fileOwnerPath(destination), { signal }))
        .data,
  })
  const ownAvatar =
    destination.purpose === 'member_avatar' &&
    destination.target.memberId === user!.membershipId
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
  return (
    <section
      aria-label={
        destination.purpose === 'member_avatar'
          ? 'Foto do colaborador'
          : 'Imagem do departamento'
      }
      className="my-4 space-y-3"
    >
      <PrivateImage
        reference={reference}
        label={label}
        variant="256"
        className="size-24"
      />
      {query.isPending && <p role="status">Carregando imagem…</p>}
      {query.error && (
        <div role="alert">
          <p>{fileErrorMessage(query.error)}</p>
          <Button tone="neutral" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {canReplace && (
        <FileUploadControl
          destination={destination}
          disabled={busy || query.isPending || Boolean(query.error)}
          onChanged={refresh}
        />
      )}
      {canRemove && query.data?.file && (
        <Button tone="neutral" disabled={busy} onClick={() => void remove()}>
          Remover imagem
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--status-error-text)]">
          {error}
        </p>
      )}
    </section>
  )
}
