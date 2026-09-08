export function formatCompetence(competence: string): string {
  if (!competence) return ''

  const [year, month] = competence.split('-')

  return `${month}/${year}`
}

export function formatCompetenceLong(competence: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) return ''

  const label = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${competence}-01T12:00:00Z`))

  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1)
}

export function getCurrentCompetence(
  timeZone: string | undefined,
  now: Date = new Date(),
): string {
  const formatter = createCompetenceFormatter(timeZone)
  const parts = formatter.formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value

  if (!year || !month) {
    throw new Error('Não foi possível determinar a competência atual.')
  }

  return `${year}-${month}`
}

export function nextCompetence(competence: string): string {
  return shiftCompetence(competence, 1)
}

export function previousCompetence(competence: string): string {
  return shiftCompetence(competence, -1)
}

function shiftCompetence(competence: string, amount: number): string {
  const [year, month] = competence.split('-').map(Number)
  const date = new Date(year, month - 1 + amount, 1)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function createCompetenceFormatter(timeZone: string | undefined) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
    })
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
    })
  }
}
