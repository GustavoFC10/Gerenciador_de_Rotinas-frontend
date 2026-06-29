import { useAppState } from '../contexts/AppStateContext.jsx'

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
