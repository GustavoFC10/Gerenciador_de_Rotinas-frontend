import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'

import Button from '../components/ui/Button'
import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { DepartmentInput } from '../services/departmentService'
import type { RoutineControlData } from '../types/domain'

interface SettingsPageProps {
  data: Pick<
    RoutineControlData,
    'departments' | 'screens' | 'clients' | 'routines'
  >
  onDepartmentCreate: (input: DepartmentInput) => Promise<void>
}

function SettingsPage({ data, onDepartmentCreate }: SettingsPageProps) {
  const [departmentName, setDepartmentName] = useState('')
  const [departmentDescription, setDepartmentDescription] = useState('')
  const [departmentError, setDepartmentError] = useState<string | null>(null)
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false)

  async function handleDepartmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = departmentName.trim()

    if (!name) {
      setDepartmentError('Informe o nome do departamento.')
      return
    }

    setDepartmentError(null)
    setIsCreatingDepartment(true)

    try {
      await onDepartmentCreate({
        name,
        description: departmentDescription.trim() || undefined,
      })
      setDepartmentName('')
      setDepartmentDescription('')
    } catch (caughtError) {
      setDepartmentError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível criar o departamento.',
      )
    } finally {
      setIsCreatingDepartment(false)
    }
  }

  const activeScreens = data.screens.filter((screen) => !screen.archivedAt)

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        title="Configurações"
        label="Administração da organização"
        meta={
          <span className="rounded-full border border-[var(--color-brand-border)] bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-extrabold text-[var(--color-brand-strong)]">
            Acesso administrativo
          </span>
        }
      />

      <section className="mb-5 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
          Centralize aqui a estrutura que sustenta a operação: departamentos,
          telas, pessoas, empresas e rotinas. As alterações são aplicadas na
          organização ativa e respeitam as permissões do backend.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
        <section className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)] sm:p-6">
          <SectionHeading
            eyebrow="Estrutura"
            title="Departamentos"
            description="Crie as áreas que organizam o acesso e a operação da equipe."
            count={`${data.departments.length} cadastrados`}
          />

          <form
            onSubmit={handleDepartmentSubmit}
            className="mt-5 grid gap-3 rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end"
          >
            <label className="grid gap-1.5 text-sm font-bold text-[var(--color-text-main)]">
              <span>Nome *</span>
              <input
                required
                maxLength={120}
                value={departmentName}
                onChange={(event) =>
                  setDepartmentName(event.currentTarget.value)
                }
                placeholder="Ex.: Fiscal"
                className="min-h-10 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-[var(--color-control-text)] outline-none focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-[var(--color-text-main)]">
              <span>Descrição</span>
              <input
                value={departmentDescription}
                onChange={(event) =>
                  setDepartmentDescription(event.currentTarget.value)
                }
                placeholder="Responsabilidades da área"
                className="min-h-10 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-[var(--color-control-text)] outline-none focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
            </label>
            <Button type="submit" disabled={isCreatingDepartment}>
              {isCreatingDepartment ? 'Criando…' : 'Criar departamento'}
            </Button>
          </form>

          {departmentError && (
            <p
              role="alert"
              className="mt-3 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-error-text)]"
            >
              {departmentError}
            </p>
          )}

          <ul className="mt-5 divide-y divide-[var(--color-list-border)] overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-list-border)]">
            {data.departments.map((department) => (
              <li
                key={department.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-list-panel-bg)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[var(--color-text-strong)]">
                    {department.name}
                  </p>
                  {department.description && (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {department.description}
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold text-[var(--color-text-subtle)]">
                  Departamento ativo
                </span>
              </li>
            ))}
            {data.departments.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                Crie o primeiro departamento para começar a organizar a
                operação.
              </li>
            )}
          </ul>
        </section>

        <div className="grid content-start gap-5">
          <section className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)]">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-brand)]">
                  Visualização
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-[var(--color-text-strong)]">
                  Telas por departamento
                </h2>
                <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                  Defina as planilhas e agendas que cada departamento usará na
                  operação.
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-panel-soft-bg)] px-3 py-1 text-xs font-bold text-[var(--color-text-muted)]">
                {activeScreens.length} ativas
              </span>
            </header>

            <div className="mt-4 space-y-3">
              {data.departments.map((department) => {
                const departmentScreens = activeScreens.filter(
                  (screen) => screen.departmentId === department.id,
                )

                return (
                  <div
                    key={department.id}
                    className="rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-soft-bg)] px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-[var(--color-text-strong)]">
                        {department.name}
                      </p>
                      <span className="text-xs font-bold text-[var(--color-text-subtle)]">
                        {departmentScreens.length}
                      </span>
                    </div>
                    {departmentScreens.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {departmentScreens.map((screen) => (
                          <li
                            key={screen.id}
                            className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]"
                          >
                            <span className="truncate">{screen.name}</span>
                            <span className="shrink-0 font-bold">
                              {screen.type === 'spreadsheet'
                                ? 'Planilha'
                                : 'Agenda'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                        Nenhuma tela configurada.
                      </p>
                    )}
                  </div>
                )
              })}
              {data.departments.length === 0 && (
                <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--color-divider)] px-3 py-5 text-center text-sm text-[var(--color-text-muted)]">
                  Crie um departamento antes de configurar suas telas.
                </p>
              )}
            </div>

            <Link
              to={ROUTES.SCREEN_CREATE}
              className={`mt-5 inline-flex min-h-10 items-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-3.5 text-sm font-bold text-[var(--color-button-primary-text)] hover:opacity-90 ${focusRing}`}
            >
              Criar tela
            </Link>
          </section>

          <SettingsCard
            eyebrow="Pessoas e acessos"
            title="Equipe e permissões"
            description="Convide pessoas, revise cargos e organize os acessos departamentais."
            to={ROUTES.EMPLOYEES}
            actionLabel="Gerenciar equipe"
          >
            <div className="flex flex-wrap gap-2">
              <QuickLink to={ROUTES.EMPLOYEE_CREATE}>Convidar pessoa</QuickLink>
              <QuickLink to={ROUTES.ROLES}>Cargos e permissões</QuickLink>
            </div>
          </SettingsCard>

          <SettingsCard
            eyebrow="Cadastros"
            title="Base operacional"
            description="Acesse empresas e rotinas que alimentam as telas da organização."
            to={ROUTES.COMPANIES}
            actionLabel="Abrir empresas"
          >
            <div className="flex flex-wrap gap-2">
              <QuickLink to={ROUTES.COMPANY_CREATE}>Nova empresa</QuickLink>
              <QuickLink to={ROUTES.ROUTINES}>Ver rotinas</QuickLink>
              <QuickLink to={ROUTES.ROUTINE_CREATE}>Nova rotina</QuickLink>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string
  title: string
  description: string
  count: string
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-brand)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-[var(--color-text-strong)]">
          {title}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
      <span className="rounded-full bg-[var(--color-panel-soft-bg)] px-3 py-1 text-xs font-bold text-[var(--color-text-muted)]">
        {count}
      </span>
    </header>
  )
}

function SettingsCard({
  eyebrow,
  title,
  description,
  to,
  actionLabel,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  to: string
  actionLabel: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)]">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-brand)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-extrabold text-[var(--color-text-strong)]">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
      <div className="mt-4">{children}</div>
      <Link
        to={to}
        className={`mt-5 inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] px-3.5 text-sm font-bold text-[var(--color-text-strong)] hover:bg-[var(--color-control-hover-bg)] ${focusRing}`}
      >
        {actionLabel}
      </Link>
    </section>
  )
}

function QuickLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={`rounded-full border border-[var(--color-divider)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:border-[var(--color-brand-border)] hover:text-[var(--color-brand-strong)] ${focusRing}`}
    >
      {children}
    </Link>
  )
}

export default SettingsPage
