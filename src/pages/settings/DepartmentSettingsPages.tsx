import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'

import EmptyState from '../../components/common/EmptyState'
import {
  DepartmentSettingsHeader,
  SettingsChevron,
  SettingsContentSection,
} from '../../components/settings/SettingsPageChrome'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { focusRing } from '../../constants/designTokens'
import {
  getSettingsDepartmentScreenCreatePath,
  getSettingsDepartmentScreenPath,
  ROUTES,
} from '../../constants/routes'
import type { Department, Routine, Screen } from '../../types/domain'

interface DepartmentPageDataProps {
  departments: Department[]
  screens: Screen[]
  routines: Routine[]
}

export function DepartmentGeneralSettingsPage({
  departments,
}: Pick<DepartmentPageDataProps, 'departments'>) {
  const department = useSettingsDepartment(departments)

  if (!department) return <MissingDepartmentPage />

  return (
    <>
      <DepartmentSettingsHeader
        departmentId={department.id}
        departmentName={department.name}
        description="Configurações e funcionamento do departamento."
      />

      <div className="space-y-5 pt-6">
        <SettingsContentSection
          title="Informações gerais"
          description="Dados atualmente disponíveis para este departamento."
        >
          <dl className="grid gap-5 sm:grid-cols-2">
            <DepartmentDatum label="Nome" value={department.name} />
            <DepartmentDatum
              label="Descrição"
              value={department.description || 'Sem descrição cadastrada'}
            />
          </dl>
          <DepartmentDevelopmentAction
            label="Editar dados do departamento"
            message="A edição de departamentos está em desenvolvimento e ainda não possui suporte no backend."
          />
        </SettingsContentSection>

        <Card
          className="border-[var(--status-error-border)] p-5 sm:p-6"
          variant="flat"
        >
          <h2 className="text-base font-black text-[var(--status-error-text)]">
            Zona de perigo
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
            A exclusão de um departamento pode afetar telas e acessos
            relacionados.
          </p>
          <DepartmentDevelopmentAction
            label="Excluir departamento"
            message="A exclusão de departamentos está em desenvolvimento e ainda não possui suporte no backend."
          />
        </Card>
      </div>
    </>
  )
}

export function DepartmentScreensSettingsPage({
  departments,
  screens,
}: Pick<DepartmentPageDataProps, 'departments' | 'screens'>) {
  const department = useSettingsDepartment(departments)

  if (!department) return <MissingDepartmentPage />

  const departmentScreens = screens
    .filter(
      (screen) => screen.departmentId === department.id && !screen.archivedAt,
    )
    .sort(
      (left, right) =>
        left.position - right.position ||
        left.name.localeCompare(right.name, 'pt-BR'),
    )

  return (
    <>
      <DepartmentSettingsHeader
        departmentId={department.id}
        departmentName={department.name}
        title="Telas"
        description="Configure as visualizações disponíveis para este departamento."
        trailingBreadcrumbs={[{ label: 'Telas' }]}
        actions={
          <Link
            to={getSettingsDepartmentScreenCreatePath(department.id)}
            className={`inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 text-sm font-bold text-[var(--color-button-primary-text)] transition hover:bg-[var(--color-button-primary-hover-bg)] ${focusRing}`}
          >
            Nova tela
          </Link>
        }
      />

      <section className="pt-6" aria-label="Telas do departamento">
        {departmentScreens.length > 0 ? (
          <ul className="divide-y divide-[var(--color-list-border)] rounded-[var(--radius-panel)] border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)]">
            {departmentScreens.map((screen) => (
              <li key={screen.id}>
                <Link
                  to={getSettingsDepartmentScreenPath(department.id, screen.id)}
                  className={`flex min-h-20 min-w-0 items-center gap-4 px-4 py-3 transition hover:bg-[var(--color-table-row-hover-bg)] ${focusRing}`}
                >
                  <ScreenTypeMark type={screen.type} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-[var(--color-text-strong)]">
                      {screen.name}
                    </span>
                    <span className="mt-1 block truncate text-sm text-[var(--color-text-muted)]">
                      {screen.type === 'spreadsheet' ? 'Planilha' : 'Agenda'}
                      {screen.type === 'spreadsheet'
                        ? ` · ${screen.companies.length} ${screen.companies.length === 1 ? 'empresa' : 'empresas'} · ${screen.routines.length} ${screen.routines.length === 1 ? 'rotina' : 'rotinas'}`
                        : ' · Fila de acompanhamento'}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-sm font-bold text-[var(--color-brand)] sm:inline">
                    Abrir
                  </span>
                  <SettingsChevron />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nenhuma tela configurada"
            description="Crie uma planilha ou agenda para organizar o trabalho deste departamento."
          />
        )}
      </section>
    </>
  )
}

export function DepartmentPermissionsSettingsPage({
  departments,
}: Pick<DepartmentPageDataProps, 'departments'>) {
  const department = useSettingsDepartment(departments)

  if (!department) return <MissingDepartmentPage />

  return (
    <>
      <DepartmentSettingsHeader
        departmentId={department.id}
        departmentName={department.name}
        title="Permissões"
        description="As permissões são organizadas por capacidade e seguem os papéis já definidos pela organização."
        trailingBreadcrumbs={[{ label: 'Permissões' }]}
      />

      <div className="space-y-5 pt-6">
        <PermissionGroup
          title="Gerenciamento de tarefas"
          description="Regras aplicadas às tarefas deste departamento."
          rows={[
            {
              role: 'Owner e admin',
              detail:
                'Podem atribuir responsáveis e executar as transições permitidas.',
            },
            {
              role: 'Lead',
              detail:
                'Pode atribuir responsáveis e avançar tarefas, sem marcar erro ou reabrir tarefas.',
            },
            {
              role: 'Contributor',
              detail:
                'Pode avançar apenas as próprias tarefas, conforme as transições permitidas.',
            },
            {
              role: 'Viewer',
              detail: 'Possui acesso de visualização, sem ações de alteração.',
            },
          ]}
        />

        <PermissionGroup
          title="Configuração"
          description="Regras usadas para administrar a estrutura da organização."
          rows={[
            {
              role: 'Owner e admin',
              detail:
                'Podem administrar a organização, criar telas e configurar sua composição.',
            },
            {
              role: 'Membros do departamento',
              detail:
                'Usam as telas às quais têm acesso, sem alterar a configuração estrutural.',
            },
          ]}
        />

        <SettingsContentSection
          title="Acessos da equipe"
          description="A associação entre pessoas e departamentos é gerenciada no cadastro da equipe."
          action={
            <Link
              to={ROUTES.EMPLOYEES}
              className={`inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-[var(--color-button-neutral-border)] bg-[var(--color-button-neutral-bg)] px-3 text-sm font-bold text-[var(--color-button-neutral-text)] transition hover:bg-[var(--color-button-neutral-hover-bg)] ${focusRing}`}
            >
              Gerenciar equipe
            </Link>
          }
        >
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Owners e admins têm acesso administrativo global. Para members,
            configure os papéis lead, contributor ou viewer no departamento
            correspondente.
          </p>
        </SettingsContentSection>
      </div>
    </>
  )
}

function PermissionGroup({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: Array<{ role: string; detail: string }>
}) {
  return (
    <SettingsContentSection title={title} description={description}>
      <ul className="divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
        {rows.map((row) => (
          <li key={row.role} className="flex flex-wrap items-start gap-3 py-4">
            <Badge>{row.role}</Badge>
            <p className="min-w-[14rem] flex-1 text-sm leading-6 text-[var(--color-text-muted)]">
              {row.detail}
            </p>
          </li>
        ))}
      </ul>
    </SettingsContentSection>
  )
}

function DepartmentDevelopmentAction({
  label,
  message,
}: {
  label: string
  message: string
}) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="mt-5">
      <Button tone="neutral" onClick={() => setIsVisible(true)}>
        {label}
      </Button>
      {isVisible && (
        <p
          role="status"
          className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-brand-border)] bg-[var(--color-brand-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-brand-strong)]"
        >
          {message}
        </p>
      )}
    </div>
  )
}

function DepartmentDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-[var(--color-divider)] pl-4">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-extrabold text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

function useSettingsDepartment(departments: Department[]): Department | null {
  const { departmentId } = useParams()
  return (
    departments.find((department) => department.id === departmentId) ?? null
  )
}

function MissingDepartmentPage() {
  return <Navigate to={ROUTES.SETTINGS_DEPARTMENTS} replace />
}

function ScreenTypeMark({ type }: { type: Screen['type'] }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-sm font-black text-[var(--color-brand)]">
      {type === 'spreadsheet' ? 'P' : 'A'}
    </span>
  )
}
