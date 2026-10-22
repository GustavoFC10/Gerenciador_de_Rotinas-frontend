import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import MemberModuleFields from '../../components/forms/MemberModuleFields'
import {
  initialModuleAccesses,
  moduleAccessError,
  moduleAccessPayload,
} from '../../utils/memberModuleAccess'
import { FieldError } from '../../components/forms/CreationFeedback'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth'
import { useOrganizationMembers } from '../../hooks/useOrganizationMembers'
import { queryKeys } from '../../query/queryKeys'
import { departmentService } from '../../services/departmentService'
import {
  organizationMemberService,
  type OrganizationMemberResource,
} from '../../services/organizationMemberService'

export default function ModuleAccessSettingsPage() {
  const { activeMembership } = useAuth()
  const {
    members,
    isInitialLoading,
    error,
    scope,
    replaceMember,
    reloadMembers,
  } = useOrganizationMembers()
  const [params, setParams] = useSearchParams()
  const selected =
    members.find(
      (member) => member.id === (params.get('member') ?? activeMembership?.id),
    ) ?? members[0]
  const canManage = activeMembership?.role === 'owner'
  return (
    <>
      <Link
        to={ROUTES.EMPLOYEES}
        className="text-sm font-bold text-[var(--color-brand)] hover:underline"
      >
        ← Equipe
      </Link>
      <header className="mt-5 max-w-3xl">
        <h1 className="text-2xl font-black text-[var(--color-text-strong)]">
          Cargos e acessos por módulo
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Os acessos de Rotinas e Processos são independentes. A configuração é
          salva de uma só vez.
        </p>
      </header>
      {!canManage ? (
        <p role="alert" className="mt-6">
          Somente o proprietário pode configurar os acessos no módulo Equipe.
        </p>
      ) : isInitialLoading ? (
        <p role="status" className="mt-6">
          Carregando a equipe…
        </p>
      ) : error ? (
        <div role="alert" className="mt-6">
          <p>{error.message}</p>
          <Button onClick={() => void reloadMembers()}>Tentar novamente</Button>
        </div>
      ) : !selected ? (
        <p className="mt-6">Nenhum colaborador cadastrado.</p>
      ) : (
        <>
          <div className="mt-6 max-w-xl">
            <Select
              id="module-access-member"
              label="Colaborador"
              value={selected.id}
              onChange={(event) => setParams({ member: event.target.value })}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} · {member.email}
                </option>
              ))}
            </Select>
          </div>
          {scope && (
            <MemberAccessEditor
              key={selected.id}
              member={selected}
              scope={scope}
              onChange={replaceMember}
            />
          )}
        </>
      )}
    </>
  )
}
function MemberAccessEditor({
  member,
  scope,
  onChange,
}: {
  member: OrganizationMemberResource
  scope: { organizationId: string; membershipId: string }
  onChange: (member: OrganizationMemberResource) => void
}) {
  const { activeMembership, refreshSession } = useAuth()
  const client = useQueryClient()
  const [accesses, setAccesses] = useState(() => initialModuleAccesses(member))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const departments = useQuery({
    queryKey: [...queryKeys.scope(scope), 'module-access-departments'],
    queryFn: () => departmentService.listAll(),
  })
  const mutation = useMutation({
    mutationFn: () =>
      organizationMemberService.update(member.id, {
        moduleAccesses: moduleAccessPayload(accesses),
      }),
  })
  const canEdit =
    (activeMembership?.role === 'owner' || member.role !== 'owner') &&
    ['active', 'pending'].includes(member.status)
  useEffect(() => {
    setAccesses(initialModuleAccesses(member))
  }, [member])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (
      !canEdit ||
      mutation.isPending ||
      departments.isPending ||
      departments.error
    )
      return
    const problem = moduleAccessError(accesses)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setSaved(false)
    try {
      const response = await mutation.mutateAsync()
      onChange(response.data)
      await client.invalidateQueries({
        queryKey: [...queryKeys.scope(scope), 'module-permissions'],
      })
      if (member.id === activeMembership?.id) {
        await refreshSession()
        await client.invalidateQueries({ queryKey: queryKeys.scope(scope) })
      }
      setSaved(true)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar os acessos.',
      )
    }
  }
  return (
    <form
      onSubmit={(event) => void save(event)}
      className="mt-6 max-w-3xl space-y-4 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 sm:p-6"
    >
      {!canEdit && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {member.role === 'owner' && activeMembership?.role !== 'owner'
            ? 'Somente um proprietário pode alterar os acessos de outro proprietário.'
            : 'Os acessos só podem ser alterados para colaboradores ativos ou com convite pendente.'}
        </p>
      )}
      {departments.isPending ? (
        <p role="status">Carregando os departamentos…</p>
      ) : departments.error ? (
        <div role="alert">
          <p>{departments.error.message}</p>
          <Button type="button" onClick={() => void departments.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <MemberModuleFields
          value={accesses}
          onChange={(value) => {
            setAccesses(value)
            setSaved(false)
          }}
          departments={departments.data}
          disabled={!canEdit || mutation.isPending}
        />
      )}
      <FieldError id="module-access-error">{error}</FieldError>
      {saved && (
        <p
          role="status"
          className="text-sm font-bold text-[var(--color-brand)]"
        >
          Acessos atualizados.
        </p>
      )}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              mutation.isPending || departments.isPending || !!departments.error
            }
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar acessos'}
          </Button>
        </div>
      )}
    </form>
  )
}
