import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import {
  CreationErrorSummary,
  CreationSuccess,
  FieldError,
} from '../components/forms/CreationFeedback'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import { focusRing } from '../constants/designTokens'
import { USER_ROLE } from '../constants/roles'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type {
  CreateEmployeeInput,
  Employee,
  EntityId,
  RoutineControlData,
  UserRole,
} from '../types/domain'

interface CreateEmployeePageProps {
  data: RoutineControlData
  onCreate: (input: CreateEmployeeInput) => Employee
}

interface EmployeeDraft {
  name: string
  login: string
  password: string
  passwordConfirmation: string
  role: UserRole
  departmentIds: EntityId[]
}

type EmployeeField =
  | 'name'
  | 'login'
  | 'password'
  | 'passwordConfirmation'
  | 'departmentIds'
  | 'submit'

type EmployeeErrors = Partial<Record<EmployeeField, string>>

const initialDraft: EmployeeDraft = {
  name: '',
  login: '',
  password: '',
  passwordConfirmation: '',
  role: USER_ROLE.EMPLOYEE,
  departmentIds: [],
}

const roleOptions: Array<{
  value: UserRole
  label: string
  description: string
  permissionSummary: string
}> = [
  {
    value: USER_ROLE.EMPLOYEE,
    label: 'Funcionário',
    description: 'Executa e acompanha as tarefas dos departamentos permitidos.',
    permissionSummary: 'Pode executar tarefas',
  },
  {
    value: USER_ROLE.LEADER,
    label: 'Líder',
    description: 'Também mantém rotinas e empresas dentro do próprio escopo.',
    permissionSummary: 'Pode editar cadastros do departamento',
  },
  {
    value: USER_ROLE.MANAGER,
    label: 'Administrador',
    description: 'Acessa a gestão geral e administra usuários e permissões.',
    permissionSummary: 'Acesso administrativo',
  },
]

function CreateEmployeePage({ data, onCreate }: CreateEmployeePageProps) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<EmployeeDraft>(initialDraft)
  const [errors, setErrors] = useState<EmployeeErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null)
  const selectedRole = roleOptions.find((role) => role.value === draft.role)!
  const selectedDepartments = useMemo(
    () =>
      data.departments.filter((department) =>
        draft.departmentIds.includes(department.id),
      ),
    [data.departments, draft.departmentIds],
  )

  if (createdEmployee) {
    return (
      <div className="mx-auto w-full max-w-[90rem]">
        <WorkspaceBar
          context={{ label: 'Cadastros', to: ROUTES.HOME }}
          label="Equipe"
          title="Adicionar funcionário"
        />
        <CreationSuccess
          eyebrow="Funcionário criado"
          title={createdEmployee.name}
          description="O perfil, o cargo e os acessos por departamento foram configurados nesta sessão. A senha não foi adicionada aos dados operacionais."
          detail={`${selectedRole.label} · ${
            selectedDepartments.length === 1
              ? selectedDepartments[0]?.name
              : `${selectedDepartments.length} departamentos`
          }`}
          primaryAction={{
            label: 'Ir para equipe',
            to: ROUTES.EMPLOYEES,
          }}
          secondaryAction={{
            label: 'Cadastrar outro',
            onClick: () => {
              setDraft(initialDraft)
              setErrors({})
              setCreatedEmployee(null)
            },
          }}
        />
      </div>
    )
  }

  function updateDraft<K extends keyof EmployeeDraft>(
    field: K,
    value: EmployeeDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    if (field in errors) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  function toggleDepartment(departmentId: EntityId) {
    updateDraft(
      'departmentIds',
      draft.departmentIds.includes(departmentId)
        ? draft.departmentIds.filter((id) => id !== departmentId)
        : [...draft.departmentIds, departmentId],
    )
  }

  function validate(): EmployeeErrors {
    const nextErrors: EmployeeErrors = {}
    const login = draft.login.trim().toLocaleLowerCase('pt-BR')

    if (!draft.name.trim()) {
      nextErrors.name = 'Informe o nome do funcionário.'
    }

    if (!login) {
      nextErrors.login = 'Informe o login do funcionário.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) {
      nextErrors.login = 'Use um endereço de e-mail válido como login.'
    } else if (
      data.employees.some(
        (employee) =>
          employee.login?.trim().toLocaleLowerCase('pt-BR') === login,
      )
    ) {
      nextErrors.login = 'Este login já está em uso.'
    }

    if (draft.password.length < 8) {
      nextErrors.password = 'A senha deve ter pelo menos 8 caracteres.'
    }

    if (!draft.passwordConfirmation) {
      nextErrors.passwordConfirmation = 'Confirme a senha inicial.'
    } else if (draft.passwordConfirmation !== draft.password) {
      nextErrors.passwordConfirmation = 'As senhas informadas não coincidem.'
    }

    if (draft.departmentIds.length === 0) {
      nextErrors.departmentIds = 'Selecione pelo menos um departamento.'
    }

    return nextErrors
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    try {
      const employee = onCreate({
        name: draft.name.trim(),
        login: draft.login.trim().toLocaleLowerCase('pt-BR'),
        password: draft.password,
        role: draft.role,
        departmentIds: draft.departmentIds,
      })
      setErrors({})
      setCreatedEmployee(employee)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : 'Não foi possível criar o funcionário.',
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        context={{ label: 'Cadastros', to: ROUTES.HOME }}
        label="Equipe"
        title="Adicionar funcionário"
        meta="Perfil e acesso"
      />

      <form onSubmit={handleSubmit} noValidate>
        <CreationErrorSummary
          messages={Object.values(errors).filter((message): message is string =>
            Boolean(message),
          )}
        />

        <div
          className={`grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)] ${
            Object.keys(errors).length > 0 ? 'mt-4' : ''
          }`}
        >
          <div className="space-y-5">
            <Card>
              <SectionHeader
                eyebrow="Identidade"
                title="Dados de acesso"
                description="O login identifica o funcionário; a senha é usada somente pela camada de autenticação."
              />
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                <div className="sm:col-span-2">
                  <TextField
                    id="employee-name"
                    label="Nome completo *"
                    value={draft.name}
                    onChange={(event) =>
                      updateDraft('name', event.target.value)
                    }
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? 'employee-name-error' : undefined
                    }
                    placeholder="Ex.: Mariana Costa"
                    required
                  />
                  <FieldError id="employee-name-error">
                    {errors.name}
                  </FieldError>
                </div>

                <div className="sm:col-span-2">
                  <TextField
                    id="employee-login"
                    label="Login (e-mail) *"
                    type="email"
                    value={draft.login}
                    onChange={(event) =>
                      updateDraft('login', event.target.value)
                    }
                    autoComplete="username"
                    aria-invalid={Boolean(errors.login)}
                    aria-describedby={
                      errors.login
                        ? 'employee-login-error'
                        : 'employee-login-hint'
                    }
                    placeholder="mariana@empresa.com.br"
                    required
                  />
                  <p
                    id="employee-login-hint"
                    className="mt-1.5 text-xs text-[var(--color-text-muted)]"
                  >
                    Este será o identificador usado na tela de login.
                  </p>
                  <FieldError id="employee-login-error">
                    {errors.login}
                  </FieldError>
                </div>

                <div>
                  <TextField
                    id="employee-password"
                    label="Senha inicial *"
                    type={showPassword ? 'text' : 'password'}
                    value={draft.password}
                    onChange={(event) =>
                      updateDraft('password', event.target.value)
                    }
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password
                        ? 'employee-password-error'
                        : 'employee-password-hint'
                    }
                    required
                  />
                  <p
                    id="employee-password-hint"
                    className="mt-1.5 text-xs text-[var(--color-text-muted)]"
                  >
                    Use pelo menos 8 caracteres.
                  </p>
                  <FieldError id="employee-password-error">
                    {errors.password}
                  </FieldError>
                </div>

                <div>
                  <TextField
                    id="employee-password-confirmation"
                    label="Confirmar senha *"
                    type={showPassword ? 'text' : 'password'}
                    value={draft.passwordConfirmation}
                    onChange={(event) =>
                      updateDraft('passwordConfirmation', event.target.value)
                    }
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.passwordConfirmation)}
                    aria-describedby={
                      errors.passwordConfirmation
                        ? 'employee-password-confirmation-error'
                        : undefined
                    }
                    required
                  />
                  <FieldError id="employee-password-confirmation-error">
                    {errors.passwordConfirmation}
                  </FieldError>
                </div>

                <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(event) => setShowPassword(event.target.checked)}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  Mostrar senhas
                </label>
              </div>
            </Card>

            <Card>
              <SectionHeader
                eyebrow="Permissões"
                title="Cargo"
                description="O cargo define o que a pessoa pode fazer. O escopo por departamento é escolhido separadamente."
              />
              <fieldset className="space-y-2 px-5 py-5 sm:px-6">
                <legend className="sr-only">Cargo do funcionário</legend>
                {roleOptions.map((role) => {
                  const selected = draft.role === role.value

                  return (
                    <label
                      key={role.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-4 transition ${
                        selected
                          ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)]'
                          : 'border-[var(--color-divider)] bg-[var(--color-panel-bg)] hover:bg-[var(--color-control-hover-bg)]'
                      } ${focusRing}`}
                    >
                      <input
                        type="radio"
                        name="employee-role"
                        value={role.value}
                        checked={selected}
                        onChange={() => updateDraft('role', role.value)}
                        className="mt-1 size-4 accent-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-[var(--color-text-strong)]">
                            {role.label}
                          </span>
                          {role.value === USER_ROLE.MANAGER && (
                            <span className="rounded-full bg-[var(--status-progress-bg)] px-2 py-0.5 text-[11px] font-black text-[var(--status-progress-text)] ring-1 ring-[var(--status-progress-border)]">
                              Acesso elevado
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-[var(--color-text-muted)]">
                          {role.description}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </fieldset>
            </Card>

            <Card>
              <SectionHeader
                eyebrow="Escopo"
                title="Departamentos permitidos"
                description="Selecione onde as permissões do cargo serão aplicadas. Nada é concedido automaticamente."
              />
              <fieldset
                id="employee-departments"
                className="grid gap-2 px-5 py-5 sm:grid-cols-2 sm:px-6"
                aria-invalid={Boolean(errors.departmentIds)}
                aria-required="true"
                aria-describedby={
                  errors.departmentIds
                    ? 'employee-departments-error'
                    : undefined
                }
              >
                <legend className="sr-only">Departamentos permitidos</legend>
                {data.departments.map((department) => {
                  const checked = draft.departmentIds.includes(department.id)

                  return (
                    <label
                      key={department.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border p-3 ${
                        checked
                          ? 'border-[var(--color-control-focus)] bg-[var(--color-brand-soft)]'
                          : 'border-[var(--color-divider)] hover:bg-[var(--color-control-hover-bg)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="employee-departments"
                        value={department.id}
                        checked={checked}
                        onChange={() => toggleDepartment(department.id)}
                        className="size-4 accent-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
                      />
                      <span className="text-sm font-bold text-[var(--color-text-strong)]">
                        {department.name}
                      </span>
                    </label>
                  )
                })}
                {data.departments.length === 0 && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Nenhum departamento está configurado.
                  </p>
                )}
                <div className="sm:col-span-2">
                  <FieldError id="employee-departments-error">
                    {errors.departmentIds}
                  </FieldError>
                </div>
              </fieldset>
            </Card>
          </div>

          <Card className="xl:sticky xl:top-5">
            <div className="border-b border-[var(--color-divider)] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
                Resumo do acesso
              </p>
              <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
                {draft.name.trim() || 'Novo funcionário'}
              </h2>
              <p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
                {draft.login.trim() || 'Login ainda não informado'}
              </p>
            </div>
            <dl className="space-y-4 px-5 py-5">
              <div>
                <dt className="text-xs font-bold text-[var(--color-text-muted)]">
                  Cargo
                </dt>
                <dd className="mt-1 text-sm font-black text-[var(--color-text-strong)]">
                  {selectedRole.label}
                </dd>
                <dd className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                  {selectedRole.permissionSummary}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-[var(--color-text-muted)]">
                  Departamentos
                </dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {selectedDepartments.map((department) => (
                    <span
                      key={department.id}
                      className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-strong)]"
                    >
                      {department.name}
                    </span>
                  ))}
                  {selectedDepartments.length === 0 && (
                    <span className="text-sm text-[var(--color-text-muted)]">
                      Nenhum selecionado
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {draft.role === USER_ROLE.MANAGER && (
              <div className="border-t border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] px-5 py-4">
                <p className="text-sm font-bold text-[var(--status-progress-text)]">
                  Administradores têm acesso elevado. Confirme cargo e escopo
                  antes de criar.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="sticky bottom-0 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[color-mix(in_srgb,var(--color-panel-bg)_94%,transparent)] px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur sm:px-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Campos marcados com * são obrigatórios.
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              tone="neutral"
              onClick={() => navigate(ROUTES.HOME)}
            >
              Cancelar
            </Button>
            <Button type="submit" tone="primary">
              Criar funcionário
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
    <div className="border-b border-[var(--color-divider)] px-5 py-4 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-black text-[var(--color-text-strong)]">
        {title}
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
    </div>
  )
}

export default CreateEmployeePage
