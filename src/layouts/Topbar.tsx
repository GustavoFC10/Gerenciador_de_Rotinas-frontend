import type { RefObject } from 'react'

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
          className={`group ml-14 flex min-w-0 items-center justify-self-start px-4 text-sm font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] sm:px-6 lg:ml-0 lg:px-8 ${focusRing}`}
          aria-label="Competência anterior"
        >
          <ChevronIcon direction="left" />
          <span className="ml-2 hidden sm:inline">Anterior</span>
        </button>
        <span
          className="inline-flex items-center justify-center px-4 text-center text-base font-extrabold tracking-tight text-[var(--color-text-strong)] sm:text-lg"
          aria-label={`Competência atual: ${competenceLabel || formattedCompetence}`}
        >
          {competenceLabel || formattedCompetence}
        </span>
        <button
          type="button"
          onClick={goToNextCompetence}
          className={`group flex min-w-0 items-center justify-self-end px-4 text-sm font-bold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] sm:px-6 lg:px-8 ${focusRing}`}
          aria-label="Próxima competência"
        >
          <span className="mr-2 hidden sm:inline">Próxima</span>
          <ChevronIcon direction="right" />
        </button>
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
