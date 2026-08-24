import { useMemo, useState } from 'react'

import HomePersonalPeriodCard from '../components/home/HomePersonalPeriodCard'
import HomePrioritySection from '../components/home/HomePrioritySection'
import HomeRoleOverviewSection from '../components/home/HomeRoleOverviewSection'
import HomeSpreadsheetSection from '../components/home/HomeSpreadsheetSection'
import Button from '../components/ui/Button'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type {
  CompetenceStatus,
  RoutineControlData,
  Task,
} from '../types/domain'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import { buildHomeOverview } from '../utils/homeOverview'
import { isOrganizationAdmin } from '../utils/permissions'

interface HomePageProps {
  data: RoutineControlData
  spreadsheets: SpreadsheetNavigationItem[]
  generatedAt: string
  onTaskOpen: (task: Task) => void
  competenceStatus?: CompetenceStatus
  onCompetenceFinalize?: () => Promise<void>
}

function HomePage({
  data,
  spreadsheets,
  generatedAt,
  onTaskOpen,
  competenceStatus,
  onCompetenceFinalize,
}: HomePageProps) {
  const { user, competence, formattedCompetence } = useAppState()
  const [isFinalizingCompetence, setIsFinalizingCompetence] = useState(false)
  const [competenceFinalizeError, setCompetenceFinalizeError] = useState('')
  const referenceDate = getReferenceDate(generatedAt, competence)
  const canFinalizeCompetence = Boolean(
    competenceStatus === 'projected' &&
      onCompetenceFinalize &&
      isOrganizationAdmin(user),
  )
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

  async function handleCompetenceFinalize() {
    if (!onCompetenceFinalize || isFinalizingCompetence) return

    const shouldFinalize = window.confirm(
      `Finalizar a competência ${formattedCompetence}? As ocorrências recorrentes serão materializadas e as regras deste mês ficarão congeladas.`,
    )
    if (!shouldFinalize) return

    setIsFinalizingCompetence(true)
    setCompetenceFinalizeError('')

    try {
      await onCompetenceFinalize()
    } catch (error) {
      setCompetenceFinalizeError(
        error instanceof Error
          ? error.message
          : 'Não foi possível finalizar a competência.',
      )
    } finally {
      setIsFinalizingCompetence(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <WorkspaceBar
        title="Início"
        meta={
          <span className="whitespace-nowrap">
            {formattedCompetence} · {formatUpdatedAt(generatedAt)}
          </span>
        }
        actions={
          canFinalizeCompetence ? (
            <Button
              size="sm"
              tone="neutral"
              onClick={() => void handleCompetenceFinalize()}
              disabled={isFinalizingCompetence}
              title="Materializar as rotinas recorrentes e congelar as regras deste mês"
            >
              {isFinalizingCompetence
                ? 'Finalizando…'
                : 'Finalizar competência'}
            </Button>
          ) : undefined
        }
      />

      {competenceFinalizeError && (
        <p
          role="alert"
          className="mb-4 text-sm font-semibold text-[var(--status-error-text)]"
        >
          {competenceFinalizeError}
        </p>
      )}

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
