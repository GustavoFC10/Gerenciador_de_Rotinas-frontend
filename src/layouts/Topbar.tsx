import type { RefObject } from 'react'
import { Link } from 'react-router'

import { appThemeClass, focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import { useAppState } from '../hooks/useAppState'

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
    formattedCompetence,
    goToNextCompetence,
    goToPreviousCompetence,
    user,
  } = useAppState()

  return (
    <header
      className={`sticky top-0 z-40 flex min-h-14 items-center justify-between border-b px-4 backdrop-blur ${appThemeClass.topbar}`}
    >
      <div className="flex items-center gap-2">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onNavigationOpen}
          className={`mr-1 grid size-9 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] lg:hidden ${focusRing}`}
          aria-label="Abrir navegação"
          aria-controls="app-sidebar"
          aria-expanded={isNavigationOpen}
        >
          <MenuIcon />
        </button>
        <button
          type="button"
          onClick={goToPreviousCompetence}
          className={`grid size-8 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] ${focusRing}`}
          aria-label="Competência anterior"
        >
          <ChevronIcon direction="left" />
        </button>
        <span
          className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-sm font-bold text-[var(--color-control-text)]"
          aria-label={`Competência atual: ${formattedCompetence}`}
        >
          {formattedCompetence}
        </span>
        <button
          type="button"
          onClick={goToNextCompetence}
          className={`grid size-8 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] ${focusRing}`}
          aria-label="Próxima competência"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold text-[var(--color-text-main)]">
            {user.name}
          </p>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">
            {user.role}
          </p>
        </div>
        <Link
          to={ROUTES.PROFILE}
          className="grid size-9 place-items-center rounded-full bg-[var(--color-control-bg)] text-[var(--color-brand)] ring-1 ring-[var(--color-control-border)] transition hover:bg-[var(--color-control-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          aria-label="Abrir perfil"
          title="Perfil"
        >
          <UserIcon />
        </Link>
      </div>
    </header>
  )
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" strokeWidth="1.8" />
    </svg>
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
