import { Link, Navigate, useParams } from 'react-router'

import {
  DevelopmentPlaceholder,
  SettingsPageHeader,
} from '../../components/settings/SettingsPageChrome'
import Card from '../../components/ui/Card'
import { focusRing } from '../../constants/designTokens'
import { ROUTES } from '../../constants/routes'

const integrations = [
  {
    id: 'enviador-de-mensagens',
    title: 'Enviador de mensagens',
    description: 'E-mail e WhatsApp',
  },
  {
    id: 'calculadora-contabil',
    title: 'Calculadora contábil',
    description: 'Cálculos e consultas de apoio à operação',
  },
]

function IntegrationsSettingsPage() {
  return (
    <>
      <SettingsPageHeader
        breadcrumbs={[
          { label: 'Configurações', to: ROUTES.SETTINGS },
          { label: 'Integrações' },
        ]}
        title="Integrações"
        description="Conecte a organização a sistemas e serviços externos quando eles estiverem disponíveis."
      />

      <section className="pt-6" aria-label="Integrações disponíveis">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
          Disponíveis em breve
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {integrations.map((integration) => (
            <Link
              key={integration.id}
              to={`${ROUTES.SETTINGS_INTEGRATIONS}/${integration.id}`}
              className={`group rounded-[var(--radius-panel)] ${focusRing}`}
            >
              <Card
                className="h-full p-5 transition group-hover:border-[var(--color-brand-border)] group-hover:bg-[var(--color-control-hover-bg)]"
                variant="flat"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-sm font-black text-[var(--color-brand)]">
                    {integration.title.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black text-[var(--color-text-strong)]">
                      {integration.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--color-text-muted)]">
                      {integration.description}
                    </span>
                    <span className="mt-3 inline-flex rounded-full bg-[var(--color-panel-soft-bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      Em desenvolvimento
                    </span>
                  </span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

export function IntegrationDetailSettingsPage() {
  const { integrationId } = useParams()
  const integration = integrations.find((item) => item.id === integrationId)

  if (!integration)
    return <Navigate to={ROUTES.SETTINGS_INTEGRATIONS} replace />

  return (
    <>
      <SettingsPageHeader
        breadcrumbs={[
          { label: 'Configurações', to: ROUTES.SETTINGS },
          { label: 'Integrações', to: ROUTES.SETTINGS_INTEGRATIONS },
          { label: integration.title },
        ]}
        title={integration.title}
        description={integration.description}
      />

      <section className="pt-6">
        <DevelopmentPlaceholder
          title="Integração indisponível"
          description="A configuração desta integração está em desenvolvimento e ainda não possui suporte no backend."
          actionLabel="Configurar integração"
        />
      </section>
    </>
  )
}

export default IntegrationsSettingsPage
