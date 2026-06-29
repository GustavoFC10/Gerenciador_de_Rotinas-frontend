export function formatCompetence(competence) {
  if (!competence) return ''

  const [year, month] = competence.split('-')

  return `${month}/${year}`
}

export function nextCompetence(competence) {
  return shiftCompetence(competence, 1)
}

export function previousCompetence(competence) {
  return shiftCompetence(competence, -1)
}

function shiftCompetence(competence, amount) {
  const [year, month] = competence.split('-').map(Number)
  const date = new Date(year, month - 1 + amount, 1)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
