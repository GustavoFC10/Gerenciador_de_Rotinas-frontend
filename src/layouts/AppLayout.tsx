import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'

import { appThemeClass, focusRing } from '../constants/designTokens'
import type {
  ScreenNavigationItem,
  SpreadsheetNavigationItem,
} from '../types/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'routine-manager.sidebar-collapsed'

interface AppLayoutProps {
  spreadsheets: SpreadsheetNavigationItem[]
  agendas: ScreenNavigationItem[]
}

function AppLayout({ spreadsheets, agendas }: AppLayoutProps) {
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    readStoredSidebarState,
  )
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(isSidebarCollapsed),
      )
    } catch {
      // A preferência é apenas uma conveniência; a navegação funciona sem storage.
    }
  }, [isSidebarCollapsed])

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [location.pathname, location.search])

  return (
    <div className={`workspace-shell min-h-screen ${appThemeClass.shell}`}>
      <a
        href="#main-content"
        inert={isMobileSidebarOpen || undefined}
        className={`fixed left-3 top-3 z-[80] -translate-y-20 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-button-primary-text)] transition-transform focus:translate-y-0 ${focusRing}`}
      >
        Pular para o conteúdo
      </a>

      <div className="flex min-h-screen">
        <Sidebar
          spreadsheets={spreadsheets}
          agendas={agendas}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCollapseToggle={() =>
            setIsSidebarCollapsed((isCollapsed) => !isCollapsed)
          }
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          menuButtonRef={mobileMenuButtonRef}
        />

        <div
          className="flex min-h-screen min-w-0 flex-1 flex-col"
          inert={isMobileSidebarOpen || undefined}
          aria-hidden={isMobileSidebarOpen || undefined}
        >
          <Topbar
            isNavigationOpen={isMobileSidebarOpen}
            onNavigationOpen={() => setIsMobileSidebarOpen(true)}
            menuButtonRef={mobileMenuButtonRef}
          />
          <main
            id="main-content"
            tabIndex={-1}
            className="workspace-main flex flex-1 px-4 py-4 outline-none sm:px-6 sm:py-5 lg:px-8"
          >
            <div className="flex w-full min-w-0 flex-1 flex-col">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function readStoredSidebarState(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export default AppLayout
