import { useContext } from 'react'

import {
  NotificationsContext,
  type NotificationsContextValue,
} from '../contexts/notificationContextDefinition'

// Embedded components and isolated previews may not include the application shell.
const fallback: NotificationsContextValue = {
  isAvailable: false,
  notifications: [],
  history: [],
  activities: {},
  historyOpen: false,
  notify: () => '',
  dismiss: () => undefined,
  removeHistory: () => undefined,
  openHistory: () => undefined,
  closeHistory: () => undefined,
  setActivity: () => undefined,
  reset: () => undefined,
}

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext) ?? fallback
}
