/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProcessOverview from './ProcessOverview'
import { processTestCatalog, processTestExtraIndicators, processTestLeggacyMetrics } from './processTestFixtures'
import type { ProcessIndicators } from '../../types/processes'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const empty = { count: 0, next: null, previous: null, results: [] }
const indicators: ProcessIndicators = {
  ...processTestExtraIndicators,
  total: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
  late: 0,
  waiting: 0,
  byStatus: {
    andamento: 0,
    agendado: 0,
    atrasado: 0,
    concluido: 0,
    cancelado: 0,
  },
  bySector: {},
  byType: {},
}
let root: Root
let host: HTMLDivElement
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
describe('ProcessOverview UX', () => {
  it('shows global deadlines and completion cards to Regularidade with zero, null and fractional days', async () => {
    await act(async () => root.render(<ProcessOverview queue={empty} scheduled={empty} execution={empty}
      catalog={{ ...processTestCatalog, permissions: { ...processTestCatalog.permissions, viewFinancial: false } }}
      indicators={{ ...indicators, completedThisMonth: 9, averageOpenAgeDays: 0.25, averageCompletionDays: 0 }}
      leggacyMetrics={processTestLeggacyMetrics.map(item => ({ ...item, completedCount: 3, waitingCount: 8, averageDays: 0.5, minDays: 0, maxDays: 2 }))}
      timeZone="America/Sao_Paulo" onOpen={vi.fn()} onList={vi.fn()} onSector={vi.fn()} />))
    expect(host.textContent).toContain('Prazos da Leggacy')
    expect(host.textContent).toContain('Menos de 1 dia')
    expect(host.textContent).toContain('0 dias')
    expect(host.textContent).toContain('Amostra concluída3')
    expect(host.textContent).toContain('Aguardando8')
    expect(host.textContent).toContain('Concluídos neste mês9')
  })

  it.each([true, false])(
    'keeps empty-state guidance with create permission %s without duplicating the top action',
    async (create) => {
      await act(async () =>
        root.render(
          <ProcessOverview
            queue={empty}
            scheduled={empty}
            execution={empty}
            catalog={{
              ...processTestCatalog,
              permissions: { ...processTestCatalog.permissions, create },
            }}
            indicators={indicators}
            sector="fin"
            timeZone="America/Sao_Paulo"
            onOpen={vi.fn()}
            onList={vi.fn()}
            onSector={vi.fn()}
          />,
        ),
      )
      expect(host.textContent).toContain('Nenhum processo cadastrado')
      expect(
        [...host.querySelectorAll('button')].some(
          (button) => button.textContent?.trim() === 'Novo processo',
        ),
      ).toBe(false)
      expect(host.textContent).toContain(
        create
          ? 'Use Novo processo na barra superior'
          : 'Os processos cadastrados pela Diretoria aparecerão aqui',
      )
      expect(host.textContent).toContain('Panorama da operação')
      expect(host.textContent).toContain('Aguardando liberação')
      expect(host.textContent).toContain('Filas executáveis por setor')
    },
  )
})
