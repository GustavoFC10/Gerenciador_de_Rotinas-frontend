import { describe, expect, it } from 'vitest'
import {
  changedProcessFields,
  normalizeProcessInput,
  normalizeProcessMoney,
  processInputFromResource,
} from './processFormUtils'
import {
  makeProcessTestResource,
  processTestCatalog,
} from './processTestFixtures'

describe('process form contract', () => {
  it('normalizes BRL without dropping cents, undefined values or defined zero', () => {
    expect(normalizeProcessMoney('1.234,56')).toBe('1234.56')
    expect(normalizeProcessMoney('1234.5')).toBe('1234.50')
    expect(normalizeProcessMoney('0')).toBe('0.00')
    expect(normalizeProcessMoney('')).toBeNull()
    expect(normalizeProcessMoney('999999999999.99')).toBe('999999999999.99')
    expect(() => normalizeProcessMoney('-10')).toThrow()
    expect(() => normalizeProcessMoney('10.999')).toThrow()
    expect(() => normalizeProcessMoney('abc')).toThrow()
  })

  it('sends only applicable fields when changing a new process type', () => {
    const type = processTestCatalog.types.find(
      (type) => type.id === 'inatividade',
    )!
    expect(
      normalizeProcessInput(
        {
          tipo: 'inatividade',
          empresa: ' Empresa ',
          prazo: '2026-11-01',
          inicioInat: '2026-10-01',
          honorario: '500',
          regime: 'simples',
          honPerdido: '0',
        },
        type,
      ),
    ).toEqual({
      tipo: 'inatividade',
      empresa: 'Empresa',
      cnpj: '',
      protocolo: '',
      obs: '',
      inicioInat: '2026-10-01',
      honPerdido: '0.00',
      motivo: null,
      motivoObs: '',
    })
  })

  it('requires alteration definitions and the amount lost for departures', () => {
    const alteration = processTestCatalog.types.find(
      (type) => type.id === 'alteracao',
    )!
    expect(() =>
      normalizeProcessInput(
        { tipo: 'alteracao', empresa: 'Empresa' },
        alteration,
      ),
    ).toThrow('Selecione')
    expect(() =>
      normalizeProcessInput(
        {
          tipo: 'alteracao',
          empresa: 'Empresa',
          altItens: ['capital'],
          altDesc: 'Novo capital',
        },
        alteration,
      ),
    ).toThrow('custo')
    const departure = processTestCatalog.types.find(
      (type) => type.id === 'saida',
    )!
    expect(() =>
      normalizeProcessInput({ tipo: 'saida', empresa: 'Empresa' }, departure),
    ).toThrow('honorário')
    expect(() =>
      normalizeProcessInput(
        {
          tipo: 'saida',
          empresa: 'Empresa',
          honPerdido: '100',
          novoContador: true,
        },
        departure,
      ),
    ).toThrow('contador')
  })

  it('keeps API snapshots out of PATCH payloads and sends only edited data', () => {
    const process = makeProcessTestResource({
      custo: '500.00',
      obs: 'Original',
    })
    const input = processInputFromResource(process)
    expect(
      changedProcessFields(
        {
          tipo: input.tipo,
          empresa: input.empresa,
          custo: '500.00',
          obs: 'Alterada',
        },
        process,
      ),
    ).toEqual({ obs: 'Alterada' })
    expect(
      normalizeProcessInput(
        {
          tipo: 'reativacao',
          empresa: 'Empresa',
          reatJunta: false,
          reunAlinh: false,
          reunAcomp: false,
          trab: true,
          trabQtd: 2,
          trabValor: '10,50',
          honorario: '100,50',
        },
        processTestCatalog.types.find((type) => type.id === 'reativacao')!,
      ),
    ).toMatchObject({
      reatJunta: false,
      reunAlinh: false,
      reunAcomp: false,
      trab: true,
      trabQtd: 2,
      trabValor: '10.50',
      honorario: '100.50',
    })
  })
})
