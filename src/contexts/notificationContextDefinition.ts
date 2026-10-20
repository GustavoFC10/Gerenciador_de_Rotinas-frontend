import { createContext } from 'react'

export type NotificationTone = 'success' | 'error' | 'info' | 'warning'

export interface NotificationInput {
  title: string
  message?: string
  tone: NotificationTone
  category?: 'uploads'
  duration?: number
  dedupeKey?: string
  action?: { label: string; onClick: () => void }
}

export interface Notification extends NotificationInput {
  id: string
  revision: number
  createdAt: number
}

export interface NotificationsContextValue {
  isAvailable: boolean
  notifications: Notification[]
  history: Notification[]
  activities: Record<string, string>
  historyOpen: boolean
  notify: (input: NotificationInput) => string
  dismiss: (id: string) => void
  removeHistory: (id: string) => void
  openHistory: () => void
  closeHistory: () => void
  setActivity: (id: string, label: string | null) => void
  reset: () => void
}

export const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined)
