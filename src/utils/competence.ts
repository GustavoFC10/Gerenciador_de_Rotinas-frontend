export function formatCompetence(competence: string): string {
  if (!competence) return ''

  const [year, month] = competence.split('-')

  return `${month}/${year}`
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
