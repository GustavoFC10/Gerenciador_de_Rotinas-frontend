import { Link } from 'react-router'

import Card from '../components/ui/Card'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { RoutineControlData } from '../types/domain'

function HomePage({ data }: { data?: RoutineControlData }) {
  const totalTasks = data?.tasks.length ?? 0
  const pendingTasks =
    data?.tasks.filter((task) => task.status === 'pending').length ?? 0
  const errorTasks =
    data?.tasks.filter((task) => task.status === 'error').length ?? 0

  return (
    <>
      <WorkspaceBar title="Visão geral" />

      <div className="grid gap-4 lg:grid-cols-3">
        <HomeCard label="Total de tarefas" value={totalTasks} />
        <HomeCard label="Pendentes" value={pendingTasks} />
        <HomeCard label="Com erro" value={errorTasks} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ActionLink
          to={`${ROUTES.SPREADSHEET}?sheetId=fiscal`}
          title="Planilha Fiscal"
          description="Acesse empresas, rotinas e tarefas no fluxo principal."
        />
        <ActionLink
          to={ROUTES.TASKS}
          title="Todas as tarefas"
          description="Consulte as tarefas da planilha em formato de lista."
        />
      </div>
    </>
  )
}

function HomeCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="metric" className="p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-[var(--color-text-main)]">
        {value}
      </p>
    </Card>
  )
}

function ActionLink({
  to,
  title,
  description,
}: {
  to: string
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="block rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-panel-soft-bg)]"
    >
      <h2 className="text-base font-bold text-[var(--color-text-main)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        {description}
      </p>
    </Link>
  )
}

export default HomePage
