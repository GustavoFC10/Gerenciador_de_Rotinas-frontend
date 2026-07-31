import { describe, expect, it } from 'vitest'

import type { RoutineControlData } from '../types/domain'
import {
  buildSpreadsheetContextQuery,
  buildSpreadsheetNavigationItems,
  resolveSpreadsheetSelection,
} from './spreadsheetNavigation'

const navigationData = {
  departments: [
    { id: 'dept-fiscal', name: 'Fiscal' },
    { id: 'dept-contabil', name: 'Contábil' },
  ],
  divisions: [
    {
      id: 'division-fiscal-mei',
      departmentId: 'dept-fiscal',
      name: 'MEI',
      slug: 'mei',
      position: 2,
    },
    {
      id: 'division-fiscal-simples',
      departmentId: 'dept-fiscal',
      name: 'Simples Nacional',
      slug: 'simples-nacional',
      description: 'Empresas do Simples',
      position: 1,
    },
    {
      id: 'division-fiscal-inactive',
      departmentId: 'dept-fiscal',
      name: 'Inativa',
      slug: 'inativa',
      position: 0,
      active: false,
    },
  ],
} satisfies Pick<RoutineControlData, 'departments' | 'divisions'>

describe('spreadsheet navigation', () => {
  it('creates one parent item per department with ordered active divisions', () => {
    const items = buildSpreadsheetNavigationItems(navigationData)

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      id: 'fiscal',
      departmentId: 'dept-fiscal',
      name: 'Fiscal',
      description: '2 planilhas',
      to: '/planilha?sheetId=fiscal&divisionId=division-fiscal-simples',
    })
    expect(items[0]?.divisions?.map((division) => division.id)).toEqual([
      'division-fiscal-simples',
      'division-fiscal-mei',
    ])
    expect(items[0]?.divisions?.[0]).toMatchObject({
      description: 'Empresas do Simples',
      to: '/planilha?sheetId=fiscal&divisionId=division-fiscal-simples',
    })
    expect(items[1]).toMatchObject({
      id: 'contabil',
      to: '/planilha?sheetId=contabil',
      divisions: [],
    })
  })

  it('accepts only a division that belongs to the requested spreadsheet', () => {
    const items = buildSpreadsheetNavigationItems(navigationData)
    const valid = resolveSpreadsheetSelection(
      items,
      '?sheetId=fiscal&divisionId=division-fiscal-mei',
    )
    const invalidDivision = resolveSpreadsheetSelection(
      items,
      '?sheetId=fiscal&divisionId=division-contabil',
    )

    expect(valid).toMatchObject({
      spreadsheetId: 'fiscal',
      departmentId: 'dept-fiscal',
      divisionId: 'division-fiscal-mei',
      isFallback: false,
    })
    expect(invalidDivision).toMatchObject({
      spreadsheetId: 'fiscal',
      divisionId: 'division-fiscal-simples',
      isFallback: true,
    })
  })

  it('falls back to the first available parent and its default division', () => {
    const items = buildSpreadsheetNavigationItems(navigationData)
    const selection = resolveSpreadsheetSelection(
      items,
      '?sheetId=unknown&divisionId=division-fiscal-mei',
    )

    expect(selection).toMatchObject({
      spreadsheetId: 'fiscal',
      departmentId: 'dept-fiscal',
      divisionId: 'division-fiscal-simples',
      isFallback: true,
    })
  })

  it('builds a contextual query while preserving unrelated parameters', () => {
    expect(
      buildSpreadsheetContextQuery(
        {
          spreadsheetId: 'fiscal',
          divisionId: 'division-fiscal-mei',
        },
        '?type=client&id=client-1&divisionId=old',
      ),
    ).toBe(
      '?type=client&id=client-1&divisionId=division-fiscal-mei&sheetId=fiscal',
    )

    expect(
      buildSpreadsheetContextQuery(
        { spreadsheetId: 'contabil', divisionId: null },
        '?divisionId=old',
      ),
    ).toBe('?sheetId=contabil')
  })
})
