import { HttpClient, httpClient, isApiError } from './httpClient'
import type { TaskResource } from './taskService'
import type {
  Client,
  CompetenceStatus,
  Department,
  Employee,
  Routine,
  RoutineControlResponse,
  RoutineRecurrence,
  Screen,
  ScheduledOccurrence,
  SpreadsheetProjection,
  Task,
  TaskLink,
  TaskLinkInput,
} from '../types/domain'

const ENDPOINTS = {
  clientCompanies: '/api/v1/client-companies/',
  departments: '/api/v1/departments/',
  routines: '/api/v1/routines/',
  screens: '/api/v1/screens/',
  competences: '/api/v1/competences/',
} as const

interface ApiPage<T> {
  next: string | null
  results: T[]
}

interface ApiDepartment {
  id: string
  name: string
  description?: string
}

interface ApiCompany {
  id: string
  code: string
  name: string
  legalName: string
  cnpj: string
  email: string
  mobilePhone: string
  taxRegime: string
  archivedAt: string | null
  createdAt: string
}

interface ApiRoutineVersion {
  description: string
  recurrence: RoutineRecurrence
  defaultDueDays: number
  defaultAssigneeMemberId?: string | null
  recurrenceMonths: number[]
}

interface ApiRoutine {
  id: string
  departmentId: string
  name: string
  shotname: string
  currentVersion: ApiRoutineVersion
  archivedAt: string | null
  createdAt: string
}

interface ApiCompetenceProjection {
  id: string | null
  period: string
  status: string
  persistence: string
  version: number | null
  taskOccurrenceCount: number | null
  scheduleRevision: number
  warning: string | null
}

type ApiScreenSummary = Omit<Screen, 'companies' | 'routines'>

type ApiScreen = Screen

type ApiSpreadsheetProjection = SpreadsheetProjection

export class RoutineControlService {
  constructor(private readonly client: HttpClient) {}

  async get(period: string): Promise<RoutineControlResponse> {
    const [
      departments,
      companies,
      routines,
      screenSummaries,
      competence,
      scheduledOccurrences,
    ] = await Promise.all([
        this.listAll<ApiDepartment>(ENDPOINTS.departments),
        this.listAll<ApiCompany>(ENDPOINTS.clientCompanies),
        this.listAll<ApiRoutine>(ENDPOINTS.routines),
        this.listAll<ApiScreenSummary>(ENDPOINTS.screens),
        this.client
          .get<ApiCompetenceProjection>(
            `${ENDPOINTS.competences}by-period/${encodeURIComponent(period)}/`,
          )
          .then((response) => response.data),
        this.listAll<ScheduledOccurrence>(
          `${ENDPOINTS.competences}by-period/${encodeURIComponent(period)}/task-occurrences/?pageSize=100`,
          true,
        ),
      ])
    const activeScreenSummaries = screenSummaries.filter(
      (screen) => !screen.archivedAt,
    )
    const screens = await Promise.all(
      activeScreenSummaries.map(
        async (screen) =>
          (
            await this.client.get<ApiScreen>(
              `${ENDPOINTS.screens}${screen.id}/`,
            )
          ).data,
      ),
    )
    const projections = await Promise.all(
      screens.map(async (screen) => {
        if (screen.type !== 'spreadsheet') return null

        return (
          await this.client.get<ApiSpreadsheetProjection>(
            `${ENDPOINTS.screens}${screen.id}/projection/`,
            { query: { period } },
          )
        ).data
      }),
    )
    const adHocTasks = competence.id
      ? await this.listAll<TaskResource>(
          `${ENDPOINTS.competences}${encodeURIComponent(competence.id)}/tasks/?kind=ad_hoc&pageSize=100`,
        )
      : []

    return buildRoutineControlResponse({
      departments,
      companies,
      routines,
      screens,
      projections: projections.filter(
        (projection): projection is ApiSpreadsheetProjection =>
          projection !== null,
      ),
      competence,
      scheduledOccurrences,
      adHocTasks,
      period,
    })
  }

  private async listAll<T>(
    initialPath: string,
    retryOnRevisionConflict = false,
  ): Promise<T[]> {
    let restartAttempts = 0

    while (true) {
      const results: T[] = []
      let nextPath: string | null = initialPath

      try {
        while (nextPath) {
          const pageResponse = await this.client.get<ApiPage<T>>(nextPath)
          const page: ApiPage<T> = pageResponse.data
          results.push(...page.results)
          nextPath = page.next
        }

        return results
      } catch (error) {
        if (
          !retryOnRevisionConflict ||
          !isApiError(error) ||
          error.status !== 409 ||
          restartAttempts >= 2
        ) {
          throw error
        }

        restartAttempts += 1
      }
    }
  }
}

export const routineControlService = new RoutineControlService(httpClient)

export async function getRoutineControl({
  period,
}: {
  period: string
}): Promise<RoutineControlResponse> {
  return routineControlService.get(period)
}

function buildRoutineControlResponse({
  departments: apiDepartments,
  companies: apiCompanies,
  routines: apiRoutines,
  screens,
  projections,
  competence,
  scheduledOccurrences,
  adHocTasks,
  period,
}: {
  departments: ApiDepartment[]
  companies: ApiCompany[]
  routines: ApiRoutine[]
  screens: ApiScreen[]
  projections: ApiSpreadsheetProjection[]
  competence: ApiCompetenceProjection
  scheduledOccurrences: ScheduledOccurrence[]
  adHocTasks: TaskResource[]
  period: string
}): RoutineControlResponse {
  const departments: Department[] = apiDepartments.map((department) => ({
    id: department.id,
    name: department.name,
    description: department.description,
  }))
  const clients: Client[] = apiCompanies.map((company) => ({
    id: company.id,
    code: company.code,
    name: company.name,
    legalName: company.legalName || undefined,
    document: company.cnpj || undefined,
    email: company.email || undefined,
    phone: company.mobilePhone || undefined,
    taxRegime: company.taxRegime || undefined,
    createdAt: company.createdAt,
    active: !company.archivedAt,
  }))
  const routines: Routine[] = apiRoutines.map((routine) => ({
    id: routine.id,
    departmentId: routine.departmentId,
    name: routine.name,
    shortName: routine.shotname,
    description: routine.currentVersion.description || undefined,
    recurrence: routine.currentVersion.recurrence,
    defaultDueDays: routine.currentVersion.defaultDueDays,
    defaultAssigneeMemberId:
      routine.currentVersion.defaultAssigneeMemberId ?? undefined,
    recurrenceMonths: routine.currentVersion.recurrenceMonths,
    createdAt: routine.createdAt,
    active: !routine.archivedAt,
  }))
  const operationalScreens: Screen[] = screens.map((screen) => ({
    id: screen.id,
    name: screen.name,
    type: screen.type,
    departmentId: screen.departmentId,
    departmentName: screen.departmentName,
    position: screen.position,
    version: screen.version,
    archivedAt: screen.archivedAt,
    createdAt: screen.createdAt,
    updatedAt: screen.updatedAt,
    companies: screen.companies,
    routines: screen.routines,
  }))
  const spreadsheetProjections: SpreadsheetProjection[] = projections.map(
    (projection) => ({
      type: projection.type,
      period: projection.period,
      screen: projection.screen,
      competenceId: projection.competenceId,
      rows: projection.rows,
      columns: projection.columns,
      cells: projection.cells.map((cell) => ({
        companyId: cell.companyId,
        routineId: cell.routineId,
        tasks: cell.tasks,
      })),
    }),
  )
  const employees = new Map<string, Employee>()
  const taskById = new Map<string, Task>()

  scheduledOccurrences.forEach((occurrence) => {
    if (occurrence.assignee) {
      employees.set(occurrence.assignee.id, {
        id: occurrence.assignee.id,
        name: occurrence.assignee.displayName,
        active: true,
      })
    }

    taskById.set(occurrence.occurrenceKey, toScheduledTask(occurrence))
  })

  // A projeção de tela contém um subconjunto dos cards. Mantemos esse fallback
  // apenas para respostas antigas que ainda não exponham algum card na listagem
  // global de ocorrências; a origem direta segue sendo a fonte completa.
  projections.forEach((projection) => {
    projection.cells.forEach((cell) => {
      cell.tasks.forEach((occurrence) => {
        if (taskById.has(occurrence.occurrenceKey)) return

        if (occurrence.assignee) {
          employees.set(occurrence.assignee.id, {
            id: occurrence.assignee.id,
            name: occurrence.assignee.displayName,
            active: true,
          })
        }

        taskById.set(occurrence.occurrenceKey, toScheduledTask(occurrence))
      })
    })
  })

  adHocTasks.forEach((task) => {
    if (task.assignee) {
      employees.set(task.assignee.id, {
        id: task.assignee.id,
        name: task.assignee.displayName,
        active: true,
      })
    }

    taskById.set(task.id, toAdHocTask(task))
  })

  return {
    data: {
      departments,
      clients,
      routines,
      employees: [...employees.values()],
      screens: operationalScreens,
      spreadsheetProjections,
      tasks: [...taskById.values()],
    },
    meta: {
      period,
      generatedAt: new Date().toISOString(),
      competenceStatus: toCompetenceStatus(competence.status),
    },
  }
}

function toCompetenceStatus(value: string): CompetenceStatus | undefined {
  return ['projected', 'draft', 'open', 'finalized', 'closed', 'locked'].includes(
    value,
  )
    ? (value as CompetenceStatus)
    : undefined
}

function toScheduledTask(occurrence: ScheduledOccurrence): Task {
  return {
    id: occurrence.occurrenceKey,
    occurrenceKey: occurrence.occurrenceKey,
    taskId: occurrence.taskId,
    competenceId: null,
    etag: occurrence.etag,
    persistence: occurrence.persistence,
    kind: occurrence.kind,
    clientId: occurrence.clientCompanyId,
    routineId: occurrence.routineId,
    departmentId: occurrence.departmentId,
    assigneeId: occurrence.assignee?.id ?? null,
    status: occurrence.status,
    period: occurrence.referenceMonth.slice(0, 7),
    referenceMonth: occurrence.referenceMonth,
    dueDate: occurrence.dueDate,
    completedAt:
      occurrence.status === 'completed'
        ? (occurrence.updatedAt ?? occurrence.createdAt)
        : null,
    title: occurrence.title,
    description: occurrence.description,
    notes: occurrence.observation || undefined,
    links: occurrence.links.map((link, index) =>
      toTaskLink(occurrence.occurrenceKey, link, index),
    ),
    createdAt: occurrence.createdAt ?? undefined,
    updatedAt: occurrence.updatedAt,
    indicators: { attachments: 0 },
  }
}

function toAdHocTask(task: TaskResource): Task {
  return {
    id: task.id,
    taskId: task.id,
    competenceId: task.competenceId,
    kind: 'ad_hoc',
    clientId: task.clientCompanyId,
    routineId: task.routineId,
    departmentId: task.departmentId,
    assigneeId: task.assignee?.id ?? null,
    status: task.status,
    period: task.competence.slice(0, 7),
    referenceMonth: task.competence,
    dueDate: task.dueDate,
    completedAt: task.status === 'completed' ? task.updatedAt : null,
    title: task.title,
    description: task.description,
    notes: task.observation || undefined,
    links: task.links.map((link, index) => toTaskLink(task.id, link, index)),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    indicators: { attachments: 0 },
  }
}

function toTaskLink(
  occurrenceKey: string,
  link: TaskLinkInput,
  index: number,
): TaskLink {
  return {
    id: `${occurrenceKey}:link:${index}`,
    label: link.label,
    url: link.url,
  }
}
