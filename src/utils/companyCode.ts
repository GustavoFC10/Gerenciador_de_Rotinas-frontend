/** Label used whenever a company does not have an internal code. */
export const COMPANY_CODE_NOT_PROVIDED = '--'

export function getCompanyCodeLabel(code?: string | null): string {
  return code?.trim() || COMPANY_CODE_NOT_PROVIDED
}

/**
 * Sorts companies with an internal code first and companies without one last.
 * Keeping this rule here prevents direct localeCompare calls on nullable API data.
 */
export function compareCompanyCodes(
  left?: string | null,
  right?: string | null,
): number {
  const leftCode = left?.trim()
  const rightCode = right?.trim()

  if (!leftCode && !rightCode) return 0
  if (!leftCode) return 1
  if (!rightCode) return -1

  return leftCode.localeCompare(rightCode, 'pt-BR', { numeric: true })
}
