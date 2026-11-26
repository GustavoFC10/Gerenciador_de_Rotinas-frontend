export function extendProcessDeadline(
  deadline: string,
  additionalDays: number,
): string | null {
  if (!Number.isSafeInteger(additionalDays) || additionalDays < 1) return null

  // The API uses calendar dates and has no time-of-day component.
  const date = new Date(`${deadline}T00:00:00Z`)
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== deadline
  )
    return null
  date.setUTCDate(date.getUTCDate() + additionalDays)
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() > 9999)
    return null
  return date.toISOString().slice(0, 10)
}
