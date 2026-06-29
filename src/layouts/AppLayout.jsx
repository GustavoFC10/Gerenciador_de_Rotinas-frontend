import { Outlet } from 'react-router-dom'

import { appThemeClass } from '../constants/designTokens.js'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

function AppLayout({ pageSurfaceClass = '' }) {
  return (
    <main className={`min-h-screen ${appThemeClass.shell} ${pageSurfaceClass}`}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar />
          <div className="flex flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex w-full min-w-0 flex-1 flex-col">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default AppLayout
