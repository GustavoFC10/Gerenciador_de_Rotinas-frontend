import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import EmptyState from '../../components/common/EmptyState'
import {
  SettingsContentSection,
  SettingsPageHeader,
} from '../../components/settings/SettingsPageChrome'
import FormActions from '../../components/forms/FormActions'
import FormSection from '../../components/forms/FormSection'
import FormShell from '../../components/forms/FormShell'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import FloatingMenu from '../../components/ui/FloatingMenu'
import Textarea from '../../components/ui/Textarea'
import TextField from '../../components/ui/TextField'
import { focusRing } from '../../constants/designTokens'
import { getSettingsDepartmentPath, ROUTES } from '../../constants/routes'
import { useOrganizationMembers } from '../../hooks/useOrganizationMembers'
import type { DepartmentInput } from '../../services/departmentService'
import type { Department, Screen } from '../../types/domain'
import { normalizeSearch } from '../../utils/normalizeSearch'

interface DepartmentsSettingsPageProps {
  departments: Department[]
  screens: Screen[]
  onDepartmentCreate: (input: DepartmentInput) => Promise<Department>
}

function DepartmentsSettingsPage({
  departments,
  screens,
  onDepartmentCreate,
}: DepartmentsSettingsPageProps) {
  const navigate = useNavigate()
  const {
    members,
    error: membersError,
    isInitialLoading: isLoadingMembers,
  } = useOrganizationMembers()
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [developmentNotice, setDevelopmentNotice] = useState('')

  const visibleDepartments = useMemo(() => {
    const query = normalizeSearch(search)

    return [...departments]
      .filter((department) =>
        normalizeSearch(
          [department.name, department.description ?? ''].join(' '),
        ).includes(query),
      )
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
  }, [departments, search])

  const screenCountByDepartment = useMemo(
    () =>
      screens
        .filter((screen) => !screen.archivedAt)
        .reduce((counts, screen) => {
          counts.set(
            screen.departmentId,
            (counts.get(screen.departmentId) ?? 0) + 1,
          )
          return counts
        }, new Map<string, number>()),
    [screens],
  )

  const memberCountByDepartment = useMemo(
    () =>
      departments.reduce((counts, department) => {
        const count = members.filter(
          (member) =>
            member.status === 'active' &&
            (member.role === 'owner' ||
              member.role === 'admin' ||
              member.departmentAccesses.some(
                (access) => access.departmentId === department.id,
              )),
        ).length
        counts.set(department.id, count)
        return counts
      }, new Map<string, number>()),
    [departments, members],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setFormError('Informe o nome do departamento.')
      return
    }

    setIsCreating(true)
    setFormError('')

    try {
      const department = await onDepartmentCreate({
        name: trimmedName,
        description: description.trim() || undefined,
      })
      navigate(getSettingsDepartmentPath(department.id))
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível criar o departamento.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  function closeForm() {
    if (isCreating) return
    setIsFormOpen(false)
    setFormError('')
  }

  return (
    <>
      <SettingsPageHeader
        breadcrumbs={[
          { label: 'Configurações', to: ROUTES.SETTINGS },
          { label: 'Departamentos' },
        ]}
        title="Departamentos"
        description="Organize as áreas do escritório e configure como cada uma trabalha."
        actions={
          <Button
            tone="primary"
            onClick={() => {
              setDevelopmentNotice('')
              setIsFormOpen(true)
            }}
          >
            Novo departamento
          </Button>
        }
      />

      <div className="space-y-5 pt-6">
        {isFormOpen && (
          <FormShell
            title="Novo departamento"
            description="O departamento passa a agrupar suas telas operacionais e seus acessos."
            error={formError || null}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <FormSection title="Informações gerais">
              <TextField
                label="Nome *"
                value={name}
                maxLength={120}
                autoFocus
                required
                placeholder="Ex.: Fiscal"
                onChange={(event) => setName(event.currentTarget.value)}
              />
              <Textarea
                label="Descrição"
                value={description}
                rows={2}
                placeholder="Responsabilidades da área"
                onChange={(event) => setDescription(event.currentTarget.value)}
              />
            </FormSection>
            <FormActions
              submitLabel="Criar departamento"
              isSubmitting={isCreating}
              onCancel={closeForm}
            />
          </FormShell>
        )}

        <SettingsContentSection
          title="Todos os departamentos"
          description="Abra um departamento para administrar seus dados, telas e permissões."
        >
          <label className="block max-w-xl text-sm font-medium text-[var(--color-text-muted)]">
            <span className="mb-1.5 block">Buscar departamento</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Buscar por nome ou descrição"
              className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            />
          </label>

          {developmentNotice && (
            <p
              role="status"
              className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-brand-border)] bg-[var(--color-brand-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-brand-strong)]"
            >
              {developmentNotice}
            </p>
          )}

          {visibleDepartments.length > 0 ? (
            <ul className="mt-5 divide-y divide-[var(--color-list-border)] overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-list-border)] bg-[var(--color-panel-bg)]">
              {visibleDepartments.map((department) => {
                const memberCount = memberCountByDepartment.get(department.id)
                const screenCount =
                  screenCountByDepartment.get(department.id) ?? 0

                return (
                  <li key={department.id} className="px-4 py-4 sm:px-5">
                    <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 @min-[32rem]/settings:grid-cols-[2.5rem_minmax(0,1fr)_auto] @min-[32rem]/settings:items-center">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-sm font-black text-[var(--color-brand)]">
                        {department.name
                          .trim()
                          .slice(0, 1)
                          .toLocaleUpperCase('pt-BR') || 'D'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={getSettingsDepartmentPath(department.id)}
                          className={`block truncate text-sm font-extrabold text-[var(--color-text-strong)] hover:text-[var(--color-brand)] ${focusRing}`}
                        >
                          {department.name}
                        </Link>
                        <p className="mt-1 wrap-anywhere text-sm text-[var(--color-text-muted)]">
                          {department.description || 'Sem descrição'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge>
                            {isLoadingMembers
                              ? 'Carregando a equipe'
                              : membersError
                                ? 'Equipe indisponível'
                                : `${memberCount ?? 0} ${memberCount === 1 ? 'colaborador' : 'colaboradores'}`}
                          </Badge>
                          <Badge>
                            {screenCount} {screenCount === 1 ? 'tela' : 'telas'}
                          </Badge>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2 @min-[32rem]/settings:col-span-1">
                        <Link
                          to={getSettingsDepartmentPath(department.id)}
                          className={`inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] px-3 text-sm font-bold text-[var(--color-button-neutral-text)] transition hover:bg-[var(--color-button-neutral-hover-bg)] ${focusRing}`}
                        >
                          Abrir
                        </Link>
                        <DepartmentActionMenu
                          departmentName={department.name}
                          onDevelopmentNotice={setDevelopmentNotice}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={
                  search
                    ? 'Nenhum departamento encontrado'
                    : 'Nenhum departamento cadastrado'
                }
                description={
                  search
                    ? 'Ajuste a busca para encontrar outro departamento.'
                    : 'Crie o primeiro departamento para organizar telas e acessos.'
                }
              />
            </div>
          )}
        </SettingsContentSection>
      </div>
    </>
  )
}

function DepartmentActionMenu({
  departmentName,
  onDevelopmentNotice,
}: {
  departmentName: string
  onDevelopmentNotice: (message: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  function notify(action: 'edição' | 'exclusão') {
    onDevelopmentNotice(
      `A ${action} de “${departmentName}” está em desenvolvimento e ainda não possui suporte no backend.`,
    )
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <IconButton
        ref={triggerRef}
        label={`Mais ações para ${departmentName}`}
        tone="ghost"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((current) => !current)}
      >
        <DotsIcon />
      </IconButton>
      <FloatingMenu
        anchorRef={triggerRef}
        id={menuId}
        isOpen={isOpen}
        onDismiss={() => setIsOpen(false)}
        className="w-44 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1 shadow-[var(--shadow-floating)]"
        ariaLabel={`Ações para ${departmentName}`}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => notify('edição')}
          className={`flex min-h-9 w-full items-center rounded-[var(--radius-control)] px-2.5 text-left text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-control-hover-bg)] ${focusRing}`}
        >
          Editar dados
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => notify('exclusão')}
          className={`flex min-h-9 w-full items-center rounded-[var(--radius-control)] px-2.5 text-left text-sm font-semibold text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] ${focusRing}`}
        >
          Excluir departamento
        </button>
      </FloatingMenu>
    </div>
  )
}

function DotsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

export default DepartmentsSettingsPage
