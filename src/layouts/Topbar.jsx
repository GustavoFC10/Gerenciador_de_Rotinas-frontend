import { Link } from 'react-router-dom'

import { appThemeClass } from '../constants/designTokens.js'
import { ROUTES } from '../constants/routes.js'
import { useAppState } from '../contexts/AppStateContext.jsx'

function Topbar() {
  const {
    formattedCompetence,
    goToNextCompetence,
    goToPreviousCompetence,
    user,
  } = useAppState()

  return (
    <header className={`sticky top-0 z-40 flex min-h-14 items-center justify-between border-b px-4 backdrop-blur ${appThemeClass.topbar}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goToPreviousCompetence}
          className="grid size-8 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]"
          aria-label="Competencia anterior"
        >
          &lt;
        </button>
        <button
          type="button"
          className="min-h-8 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-sm font-bold text-[var(--color-control-text)]"
        >
          {formattedCompetence}
        </button>
        <button
          type="button"
          onClick={goToNextCompetence}
          className="grid size-8 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]"
          aria-label="Proxima competencia"
        >
          &gt;
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
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
      <path
        d="M20 21a8 8 0 0 0-16 0"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export default Topbar
