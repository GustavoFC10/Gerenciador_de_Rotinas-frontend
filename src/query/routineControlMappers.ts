import type { ClientCompanyResource } from '../services/companyService'
import type { DepartmentResource } from '../services/departmentService'
import type { RoutineResource } from '../services/routineService'
import type { TaskResource } from '../services/taskService'
import type {
  Client,
  Department,
  Employee,
  ScheduledOccurrence,
  Task,
  TaskLink,
  TaskLinkInput,
} from '../types/domain'

export function toClientFromResource(resource: ClientCompanyResource): Client {
  return {
    id: resource.id,
    code: resource.code,
    name: resource.name,
    legalName: resource.legalName || undefined,
    document: resource.cnpj || undefined,
    email: resource.email || undefined,
    phone: resource.mobilePhone || undefined,
    taxRegime: resource.taxRegime || undefined,
    createdAt: resource.createdAt,
    active: !resource.archivedAt,
  }
}

export function toRoutineFromResource(resource: RoutineResource) {
  return {
    id: resource.id,
    departmentId: resource.departmentId,
    name: resource.name,
    shortName: resource.shotname,
    description: resource.currentVersion.description || undefined,
    recurrence: resource.currentVersion.recurrence,
    defaultDueDays: resource.currentVersion.defaultDueDays,
    defaultAssigneeMemberId:
      resource.currentVersion.defaultAssigneeMemberId ?? undefined,
    recurrenceMonths: resource.currentVersion.recurrenceMonths,
    createdAt: resource.createdAt,
    active: !resource.archivedAt,
  }
}

export function toDepartmentFromResource(
  resource: DepartmentResource,
): Department {
  return {
    id: resource.id,
    name: resource.name,
    description: resource.description || undefined,
  }
}

export function toTaskFromScheduledOccurrence(
  occurrence: ScheduledOccurrence,
  etag: string | null,
  competenceId: string | null,
): Task {
  return {
    id: occurrence.occurrenceKey,
    occurrenceKey: occurrence.occurrenceKey,
    taskId: occurrence.taskId,
    competenceId,
    etag: etag ?? occurrence.etag,
    persistence: occurrence.persistence,
    kind: occurrence.kind,
    title: occurrence.title,
    description: occurrence.description,
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
    notes: occurrence.observation || undefined,
    links: toTaskLinks(occurrence.occurrenceKey, occurrence.links),
    createdAt: occurrence.createdAt ?? undefined,
    updatedAt: occurrence.updatedAt,
    indicators: { attachments: 0 },
  }
}

export function toTaskFromResource(
  resource: TaskResource,
  etag: string | null,
): Task {
  const stableId = resource.occurrenceKey ?? resource.id

  return {
    id: stableId,
    occurrenceKey: resource.occurrenceKey ?? undefined,
    taskId: resource.id,
    competenceId: resource.competenceId,
    etag: etag ?? undefined,
    persistence: resource.occurrenceKey ? 'materialized' : undefined,
    kind: resource.kind,
    title: resource.title,
    description: resource.description,
    clientId: resource.clientCompanyId,
    routineId: resource.routineId,
    departmentId: resource.departmentId,
    assigneeId: resource.assignee?.id ?? null,
    status: resource.status,
    period: resource.competence.slice(0, 7),
    referenceMonth: resource.competence,
    dueDate: resource.dueDate,
    completedAt: resource.status === 'completed' ? resource.updatedAt : null,
    notes: resource.observation || undefined,
    links: toTaskLinks(stableId, resource.links),
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
    indicators: { attachments: 0 },
  }
}

export function toTaskAssignee(
  assignee: TaskResource['assignee'] | ScheduledOccurrence['assignee'],
): Employee | null {
  return assignee
    ? {
        id: assignee.id,
        name: assignee.displayName,
        active: true,
      }
    : null
}

function toTaskLinks(taskId: string, links: TaskLinkInput[]): TaskLink[] {
  return links.map((link, index) => ({
    id: `${taskId}:link:${index}`,
    label: link.label,
    url: link.url,
  }))
}
