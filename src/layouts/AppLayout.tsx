import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'

import { appThemeClass, focusRing } from '../constants/designTokens'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'routine-manager.sidebar-collapsed'
const desktopMediaQuery = '(min-width: 1024px)'

interface AppLayoutProps {
  spreadsheets: SpreadsheetNavigationItem[]
}

function AppLayout({ spreadsheets }: AppLayoutProps) {
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    readStoredSidebarState,
  )
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const navigationRef = useRef<HTMLElement | null>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const mobileCloseButtonRef = useRef<HTMLButtonElement | null>(null)

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

  useEffect(() => {
    const mediaQuery = window.matchMedia(desktopMediaQuery)

    function closeDrawerOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) setIsMobileSidebarOpen(false)
    }

    mediaQuery.addEventListener('change', closeDrawerOnDesktop)
    return () => mediaQuery.removeEventListener('change', closeDrawerOnDesktop)
  }, [])

  useEffect(() => {
    if (!isMobileSidebarOpen) return undefined

    const navigation = navigationRef.current
    const returnFocusTarget = mobileMenuButtonRef.current
    const previousOverflow = document.body.style.overflow
    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    function getFocusableElements(): HTMLElement[] {
      if (!navigation) return []

      return [
        ...navigation.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter((element) => element.getClientRects().length > 0)
    }

    function handleNavigationKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMobileSidebarOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        navigation?.focus()
        return
      }

      const firstElement = focusableElements[0]!
      const lastElement = focusableElements.at(-1)!

      if (!navigation?.contains(document.activeElement)) {
        event.preventDefault()
        const nextElement = event.shiftKey ? lastElement : firstElement
        nextElement.focus()
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    mobileCloseButtonRef.current?.focus()
    document.addEventListener('keydown', handleNavigationKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleNavigationKeyDown)
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus()
    }
  }, [isMobileSidebarOpen])

  return (
    <div className={`min-h-screen ${appThemeClass.shell}`}>
      <a
        href="#main-content"
        className={`fixed left-3 top-3 z-[80] -translate-y-20 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-4 py-2 text-sm font-bold text-[var(--color-button-primary-text)] transition-transform focus:translate-y-0 ${focusRing}`}
      >
        Pular para o conteúdo
      </a>

      <div className="flex min-h-screen">
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-[var(--color-overlay-bg)] backdrop-blur-[2px] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <Sidebar
          spreadsheets={spreadsheets}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCollapseToggle={() =>
            setIsSidebarCollapsed((isCollapsed) => !isCollapsed)
          }
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          navigationRef={navigationRef}
          closeButtonRef={mobileCloseButtonRef}
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
            className="flex flex-1 px-4 py-4 outline-none sm:px-6 sm:py-5 lg:px-8"
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
