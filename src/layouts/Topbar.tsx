import type { RefObject } from 'react'

import NotificationCenterTrigger from '../components/feedback/NotificationCenterTrigger'
import UploadsTrigger from '../components/files/UploadsTrigger'
import { appThemeClass, focusRing } from '../constants/designTokens'
import { useAppState } from '../hooks/useAppState'
import { formatCompetenceLong } from '../utils/competence'

function Topbar({
  isNavigationOpen,
  onNavigationOpen,
  menuButtonRef,
}: {
  isNavigationOpen: boolean
  onNavigationOpen: () => void
  menuButtonRef: RefObject<HTMLButtonElement | null>
}) {
  const {
    competence,
    formattedCompetence,
    goToNextCompetence,
    goToPreviousCompetence,
  } = useAppState()
  const competenceLabel = formatCompetenceLong(competence)

  return (
    <header
      className={`sticky top-0 z-40 flex min-h-[4.5rem] items-stretch border-b backdrop-blur ${appThemeClass.topbar}`}
    >
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onNavigationOpen}
        className={`absolute left-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] lg:hidden ${focusRing}`}
        aria-label="Abrir navegação"
        aria-controls="app-sidebar"
        aria-expanded={isNavigationOpen}
      >
        <MenuIcon />
      </button>

      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch">
        <button
          type="button"
          onClick={goToPreviousCompetence}
          className={`group ml-14 flex min-w-0 items-center justify-self-start px-2 text-sm font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] sm:px-4 lg:ml-0 lg:px-8 ${focusRing}`}
          aria-label="Competência anterior"
        >
          <ChevronIcon direction="left" />
          <span className="ml-2 hidden sm:inline">Anterior</span>
        </button>
        <span
          className="inline-flex items-center justify-center px-1 text-center text-sm font-extrabold tracking-tight text-[var(--color-text-strong)] max-[479px]:max-w-22 sm:px-4 sm:text-lg"
          aria-label={`Competência atual: ${competenceLabel || formattedCompetence}`}
        >
          {competenceLabel || formattedCompetence}
        </span>
        <div className="flex min-w-0 items-stretch justify-self-end gap-1 pr-2 sm:pr-4 lg:pr-6">
          <button
            type="button"
            onClick={goToNextCompetence}
            className={`group flex min-w-0 items-center px-2 text-sm font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] sm:px-4 ${focusRing}`}
            aria-label="Próxima competência"
          >
            <span className="mr-2 hidden sm:inline">Próxima</span>
            <ChevronIcon direction="right" />
          </button>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <UploadsTrigger />
            <NotificationCenterTrigger />
          </div>
        </div>
      </div>
    </header>
  )
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

export default Topbar
