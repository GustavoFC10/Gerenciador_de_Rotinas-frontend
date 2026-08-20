import { useMemo } from 'react'

import HomePersonalPeriodCard from '../components/home/HomePersonalPeriodCard'
import HomePrioritySection from '../components/home/HomePrioritySection'
import HomeRoleOverviewSection from '../components/home/HomeRoleOverviewSection'
import HomeSpreadsheetSection from '../components/home/HomeSpreadsheetSection'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { RoutineControlData, Task } from '../types/domain'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import { buildHomeOverview } from '../utils/homeOverview'
import { isOrganizationAdmin } from '../utils/permissions'

interface HomePageProps {
  data: RoutineControlData
  spreadsheets: SpreadsheetNavigationItem[]
  generatedAt: string
  onTaskOpen: (task: Task) => void
}

function HomePage({
  data,
  spreadsheets,
  generatedAt,
  onTaskOpen,
}: HomePageProps) {
  const { user, competence, formattedCompetence } = useAppState()
  const referenceDate = getReferenceDate(generatedAt, competence)
  const overview = useMemo(
    () =>
      buildHomeOverview({
        data,
        user,
        competence,
        referenceDate,
        spreadsheets,
      }),
    [competence, data, referenceDate, spreadsheets, user],
  )

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        title="Início"
        meta={
          <span className="whitespace-nowrap">
            {formattedCompetence} · {formatUpdatedAt(generatedAt)}
          </span>
        }
      />

      <HomeSpreadsheetSection summaries={overview.spreadsheets} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.75fr)]">
        <HomePrioritySection
          priorities={overview.personal.priorities}
          openCount={overview.personal.open}
          referenceDate={overview.referenceDate}
          onTaskOpen={onTaskOpen}
        />

        <HomePersonalPeriodCard overview={overview.personal} />
      </div>

      {overview.role && (
        <HomeRoleOverviewSection
          overview={overview.role}
          organizationAdmin={isOrganizationAdmin(user)}
          referenceDate={overview.referenceDate}
          onTaskOpen={onTaskOpen}
        />
      )}
    </div>
  )
}

function getReferenceDate(generatedAt: string, competence: string): string {
  const generatedDate = generatedAt.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(generatedDate)
    ? generatedDate
    : `${competence}-01`
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'dados atualizados'

  return `atualizado ${new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}`
}

export default HomePage
