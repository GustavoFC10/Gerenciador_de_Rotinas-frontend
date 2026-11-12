/** @vitest-environment happy-dom */
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHonorariosCalculation } from './useHonorariosCalculation'
import { honorariosService } from '../services/honorariosService'
import { defaultProfile } from '../utils/honorariosPresentation'
import type {
  HonorariosCalculateResponse,
  HonorariosProfile,
} from '../types/honorarios'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root, host: HTMLDivElement
let latest: ReturnType<typeof useHonorariosCalculation>
function Probe({
  profile,
  version = 0,
}: {
  profile: HonorariosProfile
  version?: number
}) {
  const result = useHonorariosCalculation(profile, version)
  useEffect(() => {
    latest = result
  }, [result])
  return (
    <output>
      {result.isPending
        ? 'Atualizando'
        : (result.data?.calculation.total ?? 'Erro')}
    </output>
  )
}
function calculation(total: string): HonorariosCalculateResponse {
  return {
    paramsVersion: 0,
    calculation: {
      total,
      anual: total,
      tabela: total,
      custo: '0.00',
      valorHoras: '0.00',
      ajuste: '0.00',
      linhas: [],
    },
    plans: [],
  }
}
beforeEach(() => {
  vi.useFakeTimers()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})
async function render(profile: HonorariosProfile, version = 0) {
  await act(async () =>
    root.render(<Probe profile={profile} version={version} />),
  )
}
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('Cálculo de Honorários', () => {
  it('agrupa alterações e envia somente o perfil mais recente após o debounce', async () => {
    const calculate = vi
      .spyOn(honorariosService, 'calculate')
      .mockResolvedValue(calculation('450.00'))
    const profile = defaultProfile()
    await render(profile)
    await tick(200)
    await render({ ...profile, funcionarios: 4 })
    await tick(200)
    expect(calculate).not.toHaveBeenCalled()
    await tick(150)
    expect(calculate).toHaveBeenCalledTimes(1)
    expect(calculate.mock.calls[0][0].funcionarios).toBe(4)
    expect(host.textContent).toBe('450.00')
  })
  it('aborta e descarta uma resposta antiga mesmo quando o transporte ignora o cancelamento', async () => {
    let oldResolve!: (value: HonorariosCalculateResponse) => void
    const calculate = vi
      .spyOn(honorariosService, 'calculate')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            oldResolve = resolve
          }),
      )
      .mockResolvedValue(calculation('900.00'))
    const profile = defaultProfile()
    await render(profile)
    await tick(350)
    const oldSignal = calculate.mock.calls[0][1]!
    await render({ ...profile, funcionarios: 10 })
    expect(oldSignal.aborted).toBe(true)
    expect(host.textContent).toBe('Atualizando')
    await tick(350)
    expect(host.textContent).toBe('900.00')
    await act(async () => oldResolve(calculation('450.00')))
    expect(host.textContent).toBe('900.00')
  })
  it('retira da tela o cálculo anterior até obter a nova versão da tabela', async () => {
    vi.spyOn(honorariosService, 'calculate').mockResolvedValue(
      calculation('450.00'),
    )
    const profile = defaultProfile()
    await render(profile)
    await tick(350)
    expect(latest.data?.calculation.total).toBe('450.00')
    await render(profile, 2)
    expect(latest.data).toBeUndefined()
    expect(latest.isPending).toBe(true)
  })
})
