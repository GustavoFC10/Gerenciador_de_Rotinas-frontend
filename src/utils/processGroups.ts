import type { ProcessSummary } from '../types/processes'
import { monthLabel, processDaysLate, processMonth, PROCESS_STATUS_PRESENTATION } from './processPresentation'

export type ProcessGrouping = 'none' | 'status' | 'completion' | 'overdue'
export interface ProcessGroup { id: string; label: string; results: ProcessSummary[] }

/** Presentation of the current page only; status and row order belong to the API. */
export function groupProcessPage(
  results: readonly ProcessSummary[], mode: ProcessGrouping, timeZone: string,
  ordering: 'recent' | 'urgency' = 'recent',
): ProcessGroup[] {
  const groups = new Map<string, ProcessGroup>()
  for (const process of results) {
    let id: string = process.status
    let label = PROCESS_STATUS_PRESENTATION[process.status].label
    if (mode === 'completion' && process.status === 'concluido') {
      const month = process.concluidoEm ? processMonth(timeZone, new Date(process.concluidoEm)) : null
      id = `concluido:${month ?? 'sem-data'}`
      label = month ? `Concluídos · ${monthLabel(month)}` : 'Concluídos sem data de conclusão'
    }
    if (mode === 'overdue' && process.status === 'atrasado') {
      const days = processDaysLate(process, timeZone)
      const band = !process.prazo ? 'sem-prazo' : days <= 7 ? '7' : days <= 30 ? '30' : 'mais'
      id = `atrasado:${band}`
      label = band === 'sem-prazo' ? 'Atrasados sem prazo informado' :
        band === '7' ? 'Atrasados · até 7 dias' : band === '30' ? 'Atrasados · de 8 a 30 dias' : 'Atrasados · mais de 30 dias'
    }
    if (!groups.has(id)) groups.set(id, { id, label, results: [] })
    groups.get(id)!.results.push(process)
  }
  const values = [...groups.values()]
  if (ordering === 'urgency') {
    const rank = (id: string) => id.startsWith('atrasado') ? 0 : id === 'andamento' ? 1 : id === 'agendado' ? 2 : 3
    values.sort((a, b) => rank(a.id) - rank(b.id))
  }
  return values
}
