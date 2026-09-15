import { useState } from 'react'

import {
  DevelopmentPlaceholder,
  SettingsContentSection,
  SettingsPageHeader,
} from '../../components/settings/SettingsPageChrome'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth'

function OrganizationSettingsPage() {
  const { activeMembership } = useAuth()
  const [isEditNoticeVisible, setIsEditNoticeVisible] = useState(false)
  const organization = activeMembership?.organization

  return (
    <>
      <SettingsPageHeader
        breadcrumbs={[
          { label: 'Configurações', to: ROUTES.SETTINGS },
          { label: 'Organização' },
        ]}
        title="Organização"
        description="Informações e parâmetros disponíveis para o escritório que utiliza o sistema."
      />

      <div className="space-y-5 pt-6">
        <SettingsContentSection
          title="Informações gerais"
          description="Dados recebidos da sessão ativa da organização."
          action={
            <Button tone="neutral" onClick={() => setIsEditNoticeVisible(true)}>
              Editar organização
            </Button>
          }
        >
          <dl className="grid gap-4 @min-[32rem]/settings:grid-cols-2">
            <OrganizationDatum label="Nome" value={organization?.name ?? '—'} />
            <OrganizationDatum
              label="Identificador"
              value={organization?.slug ?? '—'}
            />
          </dl>
          {isEditNoticeVisible && (
            <p
              role="status"
              className="mt-5 rounded-[var(--radius-control)] border border-[var(--color-brand-border)] bg-[var(--color-brand-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-brand-strong)]"
            >
              A edição dos dados da organização está em desenvolvimento e ainda
              não possui suporte no backend.
            </p>
          )}
        </SettingsContentSection>

        <SettingsContentSection
          title="Operação"
          description="Parâmetros globais atualmente disponíveis na sessão."
        >
          <dl className="grid gap-4 @min-[32rem]/settings:grid-cols-2">
            <OrganizationDatum
              label="Fuso horário"
              value={organization?.timezone ?? 'Não informado'}
            />
            <div className="border-l-2 border-[var(--color-divider)] pl-4">
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Estado
              </dt>
              <dd className="mt-2">
                <Badge variant="brand">Organização ativa</Badge>
              </dd>
            </div>
          </dl>
        </SettingsContentSection>

        <SettingsContentSection
          title="Ações da organização"
          description="Recursos administrativos globais serão concentrados aqui quando estiverem disponíveis."
        >
          <DevelopmentPlaceholder
            title="Nenhuma ação adicional disponível"
            description="Novas ações administrativas dependerão de suporte específico no backend."
            actionLabel="Ver recursos futuros"
          />
        </SettingsContentSection>
      </div>
    </>
  )
}

function OrganizationDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l-2 border-[var(--color-divider)] pl-4">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 wrap-anywhere text-sm font-extrabold text-[var(--color-text-strong)]">
        {value}
      </dd>
    </div>
  )
}

export default OrganizationSettingsPage
