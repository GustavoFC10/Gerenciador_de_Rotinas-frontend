import { describe, expect, it } from 'vitest'
import {
  processInactivityLoss,
  processInstallmentValue,
  processMonthlyTotal,
} from '../components/processes/processFormUtils'
import {
  centsToDecimal,
  decimalToCents,
  formatProcessMoney,
} from './processMoney'
import { formatBRL } from './processPresentation'

describe('exact process monetary values', () => {
  it('preserves the cents of large monthly report totals in the UI and PDF formatter', () => {
    expect(formatBRL('9999999999999999999999.99')).toBe(
      'R$\u00a09.999.999.999.999.999.999.999,99',
    )
    expect(formatProcessMoney('-1000.01')).toBe('− R$\u00a01.000,01')
    expect(centsToDecimal(decimalToCents('0.01'))).toBe('0.01')
    expect(formatBRL(null)).toBe('Não informado')
    expect(formatBRL('0.00')).toBe('R$\u00a00,00')
  })
  it('adds payroll honoraria and installments without floating point rounding', () => {
    expect(
      processMonthlyTotal({
        honorario: '999999999999.99',
        trab: true,
        trabQtd: 100000,
        trabValor: '999999999999.99',
      }),
    ).toBe('100000999999998999.99')
    expect(
      processMonthlyTotal({
        honorario: '0.01',
        trab: true,
        trabQtd: 3,
        trabValor: '0.01',
      }),
    ).toBe('0.04')
    expect(processInstallmentValue('100.00', 3)).toBe('33.33')
    expect(processInstallmentValue('0.01', 2)).toBe('0.01')
    expect(
      processInactivityLoss({ honAnterior: '1000.00', honorario: '999.99' }),
    ).toBe('0.01')
    expect(processInactivityLoss({ honAnterior: '1000.00' })).toBeNull()
    expect(
      processInactivityLoss({ honAnterior: '1000.00', honorario: '1001.00' }),
    ).toBe('0.00')
  })
})
