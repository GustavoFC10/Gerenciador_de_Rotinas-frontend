import { describe, expect, it } from 'vitest'

import { ROUTES } from '../constants/routes'
import { isSpreadsheetContextRoute } from './spreadsheetNavigation'

describe('isSpreadsheetContextRoute', () => {
  it('preserves the context for task and entity views', () => {
    expect(isSpreadsheetContextRoute(ROUTES.TASKS)).toBe(true)
    expect(isSpreadsheetContextRoute('/empresas/company-1')).toBe(true)
    expect(isSpreadsheetContextRoute('/rotinas/routine-1')).toBe(true)
  })

  it('does not add spreadsheet context to catalog or creation flows', () => {
    expect(
      isSpreadsheetContextRoute('/empresas/company-1', '?source=catalog'),
    ).toBe(false)
    expect(isSpreadsheetContextRoute(ROUTES.COMPANY_CREATE)).toBe(false)
    expect(isSpreadsheetContextRoute(ROUTES.EMPLOYEE_CREATE)).toBe(false)
  })
})
