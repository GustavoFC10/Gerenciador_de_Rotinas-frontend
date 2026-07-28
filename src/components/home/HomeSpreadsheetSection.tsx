import { Link } from 'react-router'

import { focusRing } from '../../constants/designTokens'
import type { HomeSpreadsheetSummary } from '../../utils/homeOverview'
import { HomeIcon, HomeProgressBar, HomeSectionHeading } from './HomePrimitives'

function HomeSpreadsheetSection({
  summaries,
}: {
  summaries: HomeSpreadsheetSummary[]
}) {
  return (
    <section className="mb-5" aria-labelledby="home-spreadsheets-title">
      <HomeSectionHeading
        title="Planilhas"
        titleId="home-spreadsheets-title"
        description="Seu ponto de partida para acompanhar empresas e rotinas."
      />

      {summaries.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-4">
          {summaries.map((summary) => (
            <SpreadsheetCard key={summary.spreadsheet.id} summary={summary} />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-5 py-8 text-center">
          <p className="text-sm font-bold text-[var(--color-text-strong)]">
            Nenhuma planilha disponível
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Quando uma planilha for liberada para você, ela aparecerá aqui.
          </p>
        </div>
      )}
    </section>
  )
}

function SpreadsheetCard({ summary }: { summary: HomeSpreadsheetSummary }) {
  const hasPersonalTasks = summary.personalTotal > 0
  const attentionLabel =
    summary.personalAttention === 1
      ? '1 tarefa sua exige atenção'
      : `${summary.personalAttention} tarefas suas exigem atenção`

  return (
    <Link
      to={summary.spreadsheet.to}
      className={`group flex min-h-48 flex-col rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)] transition hover:border-[var(--color-sidebar-primary-active-border)] hover:bg-[var(--color-panel-soft-bg)] ${focusRing}`}
      aria-label={`Abrir planilha ${summary.spreadsheet.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
          <HomeIcon name="spreadsheet" className="size-6" />
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-brand)]">
          Abrir
          <HomeIcon
            name="arrow"
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-extrabold tracking-tight text-[var(--color-text-strong)]">
          {summary.spreadsheet.name}
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {summary.spreadsheet.description ??
            `${summary.clients} empresas · ${summary.routines} rotinas`}
        </p>
        {summary.spreadsheet.description && (
          <p className="mt-1 text-xs font-medium text-[var(--color-text-subtle)]">
            {summary.clients} empresas · {summary.routines} rotinas
          </p>
        )}
      </div>

      <div className="mt-auto pt-5">
        {summary.personalAttention > 0 ? (
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--status-error-text)]">
            <HomeIcon name="alert" className="size-4 shrink-0" />
            {attentionLabel}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)]">
            <HomeIcon name="check" className="size-4 shrink-0" />
            {hasPersonalTasks
              ? 'Nenhuma tarefa sua exige atenção'
              : 'Sem tarefas atribuídas nesta competência'}
          </p>
        )}

        {hasPersonalTasks && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Seu andamento</span>
              <span>
                {summary.personalFinalized} de {summary.personalTotal}{' '}
                encerradas
              </span>
            </div>
            <HomeProgressBar
              value={summary.personalCompletionPercentage}
              label={`Andamento pessoal na planilha ${summary.spreadsheet.name}`}
            />
          </div>
        )}
      </div>
    </Link>
  )
}

export default HomeSpreadsheetSection
