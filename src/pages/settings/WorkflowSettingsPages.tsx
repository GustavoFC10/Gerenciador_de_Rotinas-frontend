import { Link } from 'react-router'

import {
  DevelopmentPlaceholder,
  SettingsChevron,
  SettingsPageHeader,
} from '../../components/settings/SettingsPageChrome'
import Card from '../../components/ui/Card'
import { focusRing } from '../../constants/designTokens'
import { ROUTES } from '../../constants/routes'

const workflowDestinations = [
  {
    to: ROUTES.SETTINGS_WORKFLOW_AUTOMATIONS,
    title: 'Automações',
    description: 'Automatize ações recorrentes do fluxo de trabalho.',
    available: false,
  },
  {
    to: ROUTES.SETTINGS_WORKFLOW_SHORTCUTS,
    title: 'Atalhos',
    description: 'Defina padrões operacionais de atalhos para a organização.',
    available: false,
  },
]

function WorkflowsSettingsPage() {
  return (
    <>
      <SettingsPageHeader
        breadcrumbs={[
          { label: 'Configurações', to: ROUTES.SETTINGS },
          { label: 'Fluxos de trabalho' },
        ]}
        title="Fluxos de trabalho"
        description="Padronize como as operações recorrentes são configuradas e evoluem na organização."
      />

      <section className="grid gap-3 pt-6" aria-label="Áreas de fluxos de trabalho">
        {workflowDestinations.map((destination) => (
          <Link
            key={destination.to}
            to={destination.to}
            className={`group rounded-[var(--radius-panel)] ${focusRing}`}
          >
            <Card className="p-5 transition group-hover:border-[var(--color-brand-border)] group-hover:bg-[var(--color-control-hover-bg)]" variant="flat">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-sm font-black text-[var(--color-brand)]">
                  {destination.title.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-base font-black text-[var(--color-text-strong)]">
                    {destination.title}
                    {!destination.available && (
                      <span className="rounded-full bg-[var(--color-panel-soft-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                        Em desenvolvimento
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[var(--color-text-muted)]">
                    {destination.description}
                  </span>
                </span>
                <SettingsChevron />
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </>
  )
}

export function WorkflowDevelopmentPage({
  kind,
}: {
  kind: 'automations' | 'shortcuts'
}) {
  const isAutomations = kind === 'automations'
  const title = isAutomations ? 'Automações' : 'Atalhos'
  const actionLabel = isAutomations ? 'Criar automação' : 'Configurar atalhos'

  return (
    <>
      <SettingsPageHeader
        breadcrumbs={[
          { label: 'Configurações', to: ROUTES.SETTINGS },
          { label: 'Fluxos de trabalho', to: ROUTES.SETTINGS_WORKFLOWS },
          { label: title },
        ]}
        title={title}
        description={
          isAutomations
            ? 'Automatize ações recorrentes do fluxo de trabalho.'
            : 'Defina padrões de atalhos da organização para operações recorrentes.'
        }
      />

      <section className="pt-6">
        <DevelopmentPlaceholder
          title={
            isAutomations
              ? 'Nenhuma automação configurada'
              : 'Nenhum atalho organizacional configurado'
          }
          description={
            isAutomations
              ? 'A criação de automações será disponibilizada quando houver suporte no backend.'
              : 'Os atalhos organizacionais serão disponibilizados quando houver suporte no backend.'
          }
          actionLabel={actionLabel}
        />
      </section>
    </>
  )
}

export default WorkflowsSettingsPage
