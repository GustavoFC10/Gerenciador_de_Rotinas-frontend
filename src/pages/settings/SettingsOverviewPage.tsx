import { Link } from 'react-router'

import Card from '../../components/ui/Card'
import { focusRing } from '../../constants/designTokens'
import { ROUTES } from '../../constants/routes'
import {
  SettingsChevron,
  SettingsPageHeader,
} from '../../components/settings/SettingsPageChrome'

const destinations = [
  {
    to: ROUTES.SETTINGS_ORGANIZATION,
    title: 'Organização',
    description: 'Dados e parâmetros gerais do escritório.',
  },
  {
    to: ROUTES.SETTINGS_DEPARTMENTS,
    title: 'Departamentos',
    description: 'Estrutura, telas e permissões por departamento.',
  },
  {
    to: ROUTES.SETTINGS_WORKFLOWS,
    title: 'Fluxos de trabalho',
    description: 'Automações e atalhos operacionais.',
  },
  {
    to: ROUTES.SETTINGS_INTEGRATIONS,
    title: 'Integrações',
    description: 'Conexões com sistemas e serviços externos.',
  },
]

function SettingsOverviewPage() {
  return (
    <>
      <SettingsPageHeader
        title="Configurações"
        description="Gerencie o funcionamento do escritório. Escolha uma área para configurar seus recursos e regras operacionais."
      />

      <section className="grid gap-3 pt-6 sm:grid-cols-2" aria-label="Áreas de configuração">
        {destinations.map((destination) => (
          <Link
            key={destination.to}
            to={destination.to}
            className={`group min-w-0 rounded-[var(--radius-panel)] ${focusRing}`}
          >
            <Card className="h-full p-5 transition group-hover:border-[var(--color-brand-border)] group-hover:bg-[var(--color-control-hover-bg)]" variant="flat">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-sm font-black text-[var(--color-brand)]">
                  {destination.title.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-black text-[var(--color-text-strong)]">
                    {destination.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[var(--color-text-muted)]">
                    {destination.description}
                  </span>
                </span>
                <SettingsChevron className="mt-1 text-[var(--color-brand)]" />
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </>
  )
}

export default SettingsOverviewPage
