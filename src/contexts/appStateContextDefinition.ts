import { createContext, type Dispatch, type SetStateAction } from 'react'

import type { AppPreferences, AppUser } from '../types/domain'

export interface AppStateContextValue {
  user: AppUser
  competence: string
  formattedCompetence: string
  preferences: AppPreferences
  setCompetence: Dispatch<SetStateAction<string>>
  setPreferences: Dispatch<SetStateAction<AppPreferences>>
  goToNextCompetence: () => void
  goToPreviousCompetence: () => void
}

export const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined,
)
