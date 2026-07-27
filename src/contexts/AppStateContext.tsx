import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { currentUserMock } from '../constants/roles'
import { APP_THEME } from '../constants/designTokens'
import { AppStateContext } from './appStateContextDefinition'
import {
  formatCompetence,
  nextCompetence,
  previousCompetence,
} from '../utils/competence'
import type { AppPreferences } from '../types/domain'

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user] = useState(currentUserMock)
  const [competence, setCompetence] = useState('2026-06')
  const [preferences, setPreferences] = useState<AppPreferences>({
    theme: APP_THEME.LIGHT,
    density: 'compact',
    defaultView: 'spreadsheet',
  })

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.dataset.density = preferences.density
  }, [preferences.density, preferences.theme])

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
