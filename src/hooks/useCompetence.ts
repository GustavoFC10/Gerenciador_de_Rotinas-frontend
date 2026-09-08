import { useAppState } from './useAppState'

export function useCompetence() {
  const {
    competence,
    formattedCompetence,
    setCompetence,
    goToNextCompetence,
    goToPreviousCompetence,
  } = useAppState()

  return {
    competence,
    formattedCompetence,
    setCompetence,
    goToNextCompetence,
    goToPreviousCompetence,
  }
}
