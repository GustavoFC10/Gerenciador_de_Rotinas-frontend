import { useNotifications } from '../../hooks/useNotifications'
import Button from '../ui/Button'

function NotificationCenterTrigger() {
  const { history, activities, historyOpen, openHistory, closeHistory } =
    useNotifications()
  const activityLabels = Object.values(activities)
  if (history.length === 0 && activityLabels.length === 0) return null

  return (
    <Button
      size="sm"
      tone="ghost"
      onClick={historyOpen ? closeHistory : openHistory}
      aria-label={
        history.length
          ? `Avisos: ${history.length} registro(s)`
          : activityLabels.join('. ')
      }
      aria-expanded={historyOpen}
      aria-controls={historyOpen ? 'notification-history' : undefined}
      title={activityLabels.join('. ') || 'Consultar avisos'}
      className="relative h-8 min-w-8 gap-1.5 max-xl:w-8 max-xl:px-0"
    >
      {activityLabels.length > 0 ? (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-[var(--color-divider)] border-t-[var(--color-brand)] motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
      )}
      <span className="hidden xl:inline">Avisos</span>
      {history.length > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid min-w-4 place-items-center rounded-full bg-[var(--color-brand)] px-1 text-[9px] leading-4 font-bold text-[var(--color-button-primary-text)] xl:static">
          {history.length}
        </span>
      )}
    </Button>
  )
}

export default NotificationCenterTrigger
