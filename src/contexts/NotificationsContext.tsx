import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import NotificationViewport from '../components/feedback/NotificationViewport'
import { AuthContext } from './authContextDefinition'
import {
  NotificationsContext,
  type Notification,
  type NotificationInput,
} from './notificationContextDefinition'

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext)
  const scopeKey = auth
    ? `${auth.session?.user.id ?? 'public'}:${auth.activeMembership?.organization.id ?? ''}:${auth.activeMembership?.id ?? ''}`
    : 'standalone'
  const currentScope = useRef(scopeKey)
  const previousScope = useRef(scopeKey)
  currentScope.current = scopeKey
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [history, setHistory] = useState<Notification[]>([])
  const [activities, setActivities] = useState<Record<string, string>>({})
  const [historyOpen, setHistoryOpen] = useState(false)
  const counter = useRef(0)
  const deduplication = useRef(new Map<string, string>())

  const notify = useCallback(
    (input: NotificationInput) => {
      if (currentScope.current !== scopeKey) return ''
      const key =
        input.dedupeKey ?? `${input.tone}:${input.title}:${input.message ?? ''}`
      const id =
        deduplication.current.get(key) ?? `notification-${++counter.current}`
      deduplication.current.set(key, id)
      const notification: Notification = {
        ...input,
        id,
        revision: ++counter.current,
        createdAt: Date.now(),
      }
      setNotifications((current) =>
        [...current.filter((item) => item.id !== id), notification].slice(-20),
      )
      if (input.tone === 'error' || input.tone === 'warning') {
        setHistory((current) =>
          [notification, ...current.filter((item) => item.id !== id)].slice(
            0,
            50,
          ),
        )
      }
      return id
    },
    [scopeKey],
  )
  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
  }, [])
  const removeHistory = useCallback((id: string) => {
    setHistory((current) => current.filter((item) => item.id !== id))
  }, [])
  const openHistory = useCallback(() => setHistoryOpen(true), [])
  const closeHistory = useCallback(() => setHistoryOpen(false), [])
  const setActivity = useCallback(
    (id: string, label: string | null) => {
      if (currentScope.current !== scopeKey) return
      setActivities((current) => {
        if ((current[id] ?? null) === label) return current
        const next = { ...current }
        if (label === null) delete next[id]
        else next[id] = label
        return next
      })
    },
    [scopeKey],
  )
  const reset = useCallback(() => {
    setNotifications([])
    setHistory([])
    setActivities({})
    setHistoryOpen(false)
    deduplication.current.clear()
  }, [])
  useEffect(() => {
    if (previousScope.current === scopeKey) return
    previousScope.current = scopeKey
    reset()
  }, [reset, scopeKey])
  const value = useMemo(
    () => ({
      isAvailable: true,
      notifications,
      history,
      activities,
      historyOpen,
      notify,
      dismiss,
      removeHistory,
      openHistory,
      closeHistory,
      setActivity,
      reset,
    }),
    [
      notifications,
      history,
      activities,
      historyOpen,
      notify,
      dismiss,
      removeHistory,
      openHistory,
      closeHistory,
      setActivity,
      reset,
    ],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationViewport />
    </NotificationsContext.Provider>
  )
}
