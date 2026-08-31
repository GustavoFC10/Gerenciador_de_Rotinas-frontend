import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useSearchParams } from 'react-router'

import {
  CreationErrorSummary,
  CreationSuccess,
  FieldError,
} from '../components/forms/CreationFeedback'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { ScreenInput } from '../services/screenService'
import type { Client, Department, Routine, Screen, ScreenType } from '../types/domain'

interface CreateScreenPageProps {
  departments: Department[]
  clients: Client[]
  routines: Routine[]
  onCreate: (input: ScreenInput) => Promise<Screen>
  onCancel: () => void
  header?: ReactNode
  fixedDepartmentId?: string
}

type ScreenField = 'name' | 'departmentId' | 'submit'
type ScreenErrors = Partial<Record<ScreenField, string>>

function CreateScreenPage({
  departments,
  clients,
  routines,
  onCreate,
  onCancel,
  header,
  fixedDepartmentId,
}: CreateScreenPageProps) {
  const [searchParams] = useSearchParams()
  const requestedDepartmentId = searchParams.get('departmentId')
  const [name, setName] = useState('')
  const [type, setType] = useState<ScreenType>('spreadsheet')
  const [departmentId, setDepartmentId] = useState(() =>
    fixedDepartmentId ?? getInitialDepartmentId(departments, requestedDepartmentId),
  )
  const [companyIds, setCompanyIds] = useState<string[]>([])
  const [routineIds, setRoutineIds] = useState<string[]>([])
  const [companySearch, setCompanySearch] = useState('')
  const [routineSearch, setRoutineSearch] = useState('')
  const [errors, setErrors] = useState<ScreenErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdScreen, setCreatedScreen] = useState<Screen | null>(null)

  useEffect(() => {
    if (!fixedDepartmentId) return
    setDepartmentId(fixedDepartmentId)
    setRoutineIds([])
  }, [fixedDepartmentId])

  const selectedDepartment = departments.find(
    (department) => department.id === departmentId,
  )
  const visibleCompanies = useMemo(
    () =>
      clients
        .filter((client) => client.active !== false)
        .filter((client) =>
          normalizeForSearch(
            client.code + ' ' + client.name + ' ' + (client.legalName ?? ''),
          ).includes(normalizeForSearch(companySearch)),
        )
        .sort((left, right) =>
          left.name.localeCompare(right.name, 'pt-BR'),
        ),
    [clients, companySearch],
  )
  const visibleRoutines = useMemo(
    () =>
      routines
        .filter(
          (routine) =>
            routine.departmentId === departmentId &&
            routine.active !== false,
        )
        .filter((routine) =>
          normalizeForSearch(
            routine.name + ' ' + routine.shortName + ' ' + (routine.description ?? ''),
          ).includes(normalizeForSearch(routineSearch)),
        )
        .sort((left, right) =>
          left.name.localeCompare(right.name, 'pt-BR'),
        ),
    [departmentId, routineSearch, routines],
  )

  if (createdScreen) {
    return (
      <div className="mx-auto w-full max-w-[90rem]">
        {header ?? (
          <WorkspaceBar
            context={{ label: 'Configurações', to: ROUTES.SETTINGS }}
            label="Visualização"
            title="Nova tela"
          />
        )}
        <CreationSuccess
          eyebrow="Tela criada"
          title={createdScreen.name}
          description="A configuração visual e a composição selecionada foram enviadas para a API."
          detail={
            (createdScreen.type === 'spreadsheet' ? 'Planilha' : 'Agenda') +
            ' · ' +
            (selectedDepartment?.name ?? 'Departamento')
          }
          primaryAction={
            createdScreen.type === 'spreadsheet'
              ? {
                  label: 'Abrir planilha',
                  to:
                    ROUTES.SPREADSHEET +
                    '?screenId=' +
                    encodeURIComponent(createdScreen.id),
                }
              : {
                  label: 'Abrir agenda',
                  to:
                    ROUTES.AGENDA +
                    '?screenId=' +
                    encodeURIComponent(createdScreen.id),
                }
          }
          secondaryAction={{
            label: 'Criar outra tela',
            onClick: resetForm,
          }}
        />
      </div>
    )
  }

  function resetForm() {
    setName('')
    setType('spreadsheet')
    setDepartmentId(
      fixedDepartmentId ?? getInitialDepartmentId(departments, requestedDepartmentId),
    )
    setCompanyIds([])
    setRoutineIds([])
    setCompanySearch('')
    setRoutineSearch('')
    setErrors({})
  }

  function updateDepartment(nextDepartmentId: string) {
    if (fixedDepartmentId) return
    setDepartmentId(nextDepartmentId)
    setRoutineIds([])
    setErrors((current) => ({ ...current, departmentId: undefined }))
  }

  function toggle(
    selection: string[],
    id: string,
    maximum: number,
  ): string[] {
    return selection.includes(id)
      ? selection.filter((item) => item !== id)
      : selection.length >= maximum
        ? selection
        : [...selection, id]
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: ScreenErrors = {}

    if (!name.trim()) nextErrors.name = 'Informe o nome da tela.'
    if (!departmentId) {
      nextErrors.departmentId = 'Selecione o departamento da tela.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const screen = await onCreate({
        name: name.trim(),
        type,
        departmentId,
        ...(type === 'spreadsheet' ? { companyIds, routineIds } : {}),
      })
      setCreatedScreen(screen)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caughtError) {
      setErrors({
        submit:
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível criar a tela.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      {header ?? (
        <WorkspaceBar
          context={{ label: 'Configurações', to: ROUTES.SETTINGS }}
          label="Visualização"
          title="Nova tela"
          meta="Estrutura de trabalho"
        />
      )}

      <p className="-mt-1 mb-5 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
        Telas organizam a visualização dentro de um departamento. Em uma
        planilha, qualquer empresa ativa do tenant pode compor as linhas;
        as rotinas precisam pertencer ao departamento escolhido.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <CreationErrorSummary
          messages={Object.values(errors).filter(
            (message): message is string => Boolean(message),
          )}
        />

        <div
          className={
            'grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] ' +
            (Object.values(errors).some(Boolean) ? 'mt-4' : '')
          }
        >
          <div className="space-y-5">
            <Card>
              <SectionHeader
                eyebrow="Estrutura"
                title="Defina a tela"
                description="Escolha o departamento e o formato que a equipe usará para acompanhar a operação."
              />
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                <div className="sm:col-span-2">
                  <TextField
                    id="screen-name"
                    label="Nome da tela *"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setErrors((current) => ({
                        ...current,
                        name: undefined,
                      }))
                    }}
                    placeholder="Ex.: MEI"
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? 'screen-name-error' : undefined
                    }
                  />
                  <FieldError id="screen-name-error">{errors.name}</FieldError>
                </div>

                <FieldContainer error={errors.departmentId}>
                  <Select
                    id="screen-department"
                    label="Departamento *"
                    value={departmentId}
                    onChange={(event) =>
                      updateDepartment(event.target.value)
                    }
                    required
                    disabled={departments.length === 0 || Boolean(fixedDepartmentId)}
                    aria-invalid={Boolean(errors.departmentId)}
                  >
                    <option value="">Selecione</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </Select>
                </FieldContainer>

                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-[var(--color-text-muted)]">
                    Tipo *
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    <TypeOption
                      checked={type === 'spreadsheet'}
                      label="Planilha"
                      description="Matriz de empresas e rotinas"
                      onChange={() => setType('spreadsheet')}
                    />
                    <TypeOption
                      checked={type === 'agenda'}
                      label="Agenda"
                      description="Fila de acompanhamento"
                      onChange={() => setType('agenda')}
                    />
                  </div>
                </fieldset>
              </div>
            </Card>

            {type === 'spreadsheet' && (
              <Card>
                <SectionHeader
                  eyebrow="Composição inicial"
                  title="Monte a visualização"
                  description="Estas escolhas definem as linhas e colunas exibidas. Empresas ativas do tenant podem compor a planilha; as rotinas são filtradas pelo departamento."
                />
                <div className="grid gap-5 px-5 py-5 lg:grid-cols-2 sm:px-6">
                  <SelectionPanel
                    id="screen-companies"
                    title="Empresas"
                    description="Linhas da planilha · máximo de 500"
                    searchLabel="Buscar empresas"
                    searchValue={companySearch}
                    onSearchChange={setCompanySearch}
                    items={visibleCompanies.map((client) => ({
                      id: client.id,
                      label: client.name,
                      description: client.code + (client.legalName ? ' · ' + client.legalName : ''),
                    }))}
                    selectedIds={companyIds}
                    onToggle={(id) => {
                      if (!companyIds.includes(id) && companyIds.length >= 500) {
                        setErrors((current) => ({
                          ...current,
                          submit:
                            'Uma tela aceita no máximo 500 empresas.',
                        }))
                        return
                      }
                      setCompanyIds((current) => toggle(current, id, 500))
                    }}
                    emptyLabel="Nenhuma empresa ativa encontrada."
                  />
                  <SelectionPanel
                    id="screen-routines"
                    title="Rotinas"
                    description="Colunas da planilha · máximo de 200"
                    searchLabel="Buscar rotinas"
                    searchValue={routineSearch}
                    onSearchChange={setRoutineSearch}
                    items={visibleRoutines.map((routine) => ({
                      id: routine.id,
                      label: routine.name,
                      description: routine.shortName,
                    }))}
                    selectedIds={routineIds}
                    onToggle={(id) => {
                      if (!routineIds.includes(id) && routineIds.length >= 200) {
                        setErrors((current) => ({
                          ...current,
                          submit:
                            'Uma tela aceita no máximo 200 rotinas.',
                        }))
                        return
                      }
                      setRoutineIds((current) => toggle(current, id, 200))
                    }}
                    emptyLabel={
                      departmentId
                        ? 'Nenhuma rotina ativa neste departamento.'
                        : 'Selecione o departamento primeiro.'
                    }
                  />
                </div>
              </Card>
            )}
          </div>

          <ScreenPreview
            name={name}
            type={type}
            departmentName={selectedDepartment?.name}
            companyCount={companyIds.length}
            routineCount={routineIds.length}
          />
        </div>

        <div className="sticky bottom-0 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[color-mix(in_srgb,var(--color-panel-bg)_94%,transparent)] px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur sm:px-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Campos marcados com * são obrigatórios.
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              tone="neutral"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                departments.length === 0
              }
            >
              {isSubmitting ? 'Criando…' : 'Criar tela'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="border-b border-[var(--color-divider)] px-5 py-4 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    </header>
  )
}

function FieldContainer({
  error,
  children,
}: {
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      {children}
      <FieldError id="screen-department-error">{error}</FieldError>
    </div>
  )
}

function TypeOption({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  onChange: () => void
}) {
  return (
    <label
      className={
        'flex cursor-pointer flex-col rounded-[var(--radius-control)] border p-3 transition ' +
        (checked
          ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)]'
          : 'border-[var(--color-divider)] hover:bg-[var(--color-control-hover-bg)]')
      }
    >
      <span className="flex items-center gap-2">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          className="size-4 accent-[var(--color-brand)]"
        />
        <span className="text-sm font-black text-[var(--color-text-strong)]">
          {label}
        </span>
      </span>
      <span className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
        {description}
      </span>
    </label>
  )
}

function SelectionPanel({
  id,
  title,
  description,
  searchLabel,
  searchValue,
  onSearchChange,
  items,
  selectedIds,
  onToggle,
  disabled = false,
  emptyLabel,
}: {
  id: string
  title: string
  description: string
  searchLabel: string
  searchValue: string
  onSearchChange: (value: string) => void
  items: Array<{ id: string; label: string; description: string }>
  selectedIds: string[]
  onToggle: (id: string) => void
  disabled?: boolean
  emptyLabel: string
}) {
  return (
    <section aria-labelledby={id + '-title'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            id={id + '-title'}
            className="text-sm font-black text-[var(--color-text-strong)]"
          >
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-panel-soft-bg)] px-2 py-1 text-xs font-bold text-[var(--color-text-muted)]">
          {selectedIds.length}
        </span>
      </div>
      <TextField
        id={id + '-search'}
        label={<span className="sr-only">{searchLabel}</span>}
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchLabel}
        className="mt-3"
        disabled={disabled}
      />
      <ul className="mt-3 max-h-72 divide-y divide-[var(--color-divider)] overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-divider)]">
        {items.map((item) => {
          const checked = selectedIds.includes(item.id)
          return (
            <li key={item.id}>
              <label
                className={
                  'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition ' +
                  (checked
                    ? 'bg-[var(--color-brand-soft)]'
                    : 'hover:bg-[var(--color-control-hover-bg)]')
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(item.id)}
                  disabled={disabled}
                  className="size-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-text-muted)]">
                    {item.description}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
        {items.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">
            {emptyLabel}
          </li>
        )}
      </ul>
    </section>
  )
}

function ScreenPreview({
  name,
  type,
  departmentName,
  companyCount,
  routineCount,
}: {
  name: string
  type: ScreenType
  departmentName?: string
  companyCount: number
  routineCount: number
}) {
  return (
    <aside className="xl:sticky xl:top-5">
      <Card>
        <header className="border-b border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
            Prévia
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
            {name.trim() || 'Nova tela'}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {type === 'spreadsheet' ? 'Planilha operacional' : 'Agenda operacional'}
          </p>
        </header>
        <dl className="divide-y divide-[var(--color-divider)] px-5 py-4">
          <PreviewItem
            label="Departamento"
            value={departmentName || 'Selecione'}
          />
          <PreviewItem
            label="Tipo"
            value={type === 'spreadsheet' ? 'Planilha' : 'Agenda'}
          />
          {type === 'spreadsheet' && (
            <>
              <PreviewItem label="Empresas" value={String(companyCount)} />
              <PreviewItem label="Rotinas" value={String(routineCount)} />
            </>
          )}
        </dl>
        <div className="border-t border-[var(--color-divider)] px-5 py-4">
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">
            Empresas e rotinas entram como composição visual. As empresas
            ativas do tenant podem ser usadas em qualquer departamento; as
            rotinas acompanham o departamento da tela.
          </p>
        </div>
      </Card>
    </aside>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-xs font-semibold text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="text-right text-xs font-extrabold text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function getInitialDepartmentId(
  departments: Department[],
  requestedDepartmentId: string | null,
): string {
  return departments.some(
    (department) => department.id === requestedDepartmentId,
  )
    ? requestedDepartmentId!
    : departments[0]?.id ?? ''
}

export default CreateScreenPage
