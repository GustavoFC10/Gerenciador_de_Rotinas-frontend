import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { currentUserMock } from '../constants/roles.js'
import { APP_THEME } from '../constants/designTokens.js'
import {
  formatCompetence,
  nextCompetence,
  previousCompetence,
} from '../utils/competence.js'

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const [user] = useState(currentUserMock)
  const [competence, setCompetence] = useState('2026-06')
  const [preferences, setPreferences] = useState({
    theme: APP_THEME.LIGHT,
    density: 'compact',
    defaultView: 'spreadsheet',
  })

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
  }, [preferences.theme])

  const value = useMemo(
    () => ({
      user,
      competence,
      formattedCompetence: formatCompetence(competence),
      preferences,
      setCompetence,
      setPreferences,
      goToNextCompetence: () =>
        setCompetence((current) => nextCompetence(current)),
      goToPreviousCompetence: () =>
        setCompetence((current) => previousCompetence(current)),
    }),
    [competence, preferences, user],
  )

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider')
  }

  return context
}
