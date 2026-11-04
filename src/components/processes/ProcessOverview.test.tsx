/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProcessOverview from './ProcessOverview'
import { processTestCatalog } from './processTestFixtures'
import type { ProcessIndicators } from '../../types/processes'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const empty = { count: 0, next: null, previous: null, results: [] }
const indicators: ProcessIndicators = {
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
