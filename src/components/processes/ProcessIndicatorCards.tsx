import type { ProcessIndicators } from '../../types/processes'
import { formatProcessDays } from '../../utils/processPresentation'

export default function ProcessIndicatorCards({ indicators, filtered = false }: {
  indicators: ProcessIndicators; filtered?: boolean
}) {
  const values = [
    ['Vencem em até 7 dias', indicators.dueSoon],
    ['Concluídos neste mês', indicators.completedThisMonth],
    ['Concluídos neste ano', indicators.completedThisYear],
    ['Atraso médio', formatProcessDays(indicators.averageOverdueDays)],
    ['Maior atraso', formatProcessDays(indicators.maxOverdueDays)],
    ['Tempo médio de conclusão', formatProcessDays(indicators.averageCompletionDays)],
    ['Idade média dos abertos', formatProcessDays(indicators.averageOpenAgeDays)],
  ]
  return <section className="panel process-indicators" aria-label={filtered ? 'Indicadores do conjunto filtrado' : 'Indicadores globais'}>
    <p className="process-group-note">{filtered ? 'Indicadores de todo o conjunto filtrado' : 'Indicadores globais da organização'}</p>
    <dl className="process-indicator-grid">{values.map(([label, value]) => <div key={label}>
      <dt>{label}</dt><dd className="num">{value}</dd>
    </div>)}</dl>
  </section>
}
