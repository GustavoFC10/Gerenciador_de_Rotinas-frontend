export type EntityId = string

export type OrganizationRole = 'owner' | 'admin' | 'member'

export type DepartmentAccessRole = 'lead' | 'contributor' | 'viewer'

export interface DepartmentAccessAssignment {
  departmentId: EntityId
  role: DepartmentAccessRole
}

export type RoutineStatus =
  'pending' | 'in_progress' | 'error' | 'completed' | 'no_movement'

export type CompetenceStatus =
  | 'projected'
  | 'draft'
  | 'open'
  | 'finalized'
  | 'closed'
  | 'locked'

export interface Department {
  id: EntityId
  name: string
  description?: string
}

export type ScreenType = 'spreadsheet' | 'agenda'

export interface ScreenCompany {
  id: EntityId
  code: string
  name: string
  legalName: string
  position: number
}

export interface ScreenRoutine {
  id: EntityId
  shotname: string
  name: string
  departmentId: EntityId
  position: number
}

export interface ScreenSummary {
  id: EntityId
  name: string
  type: ScreenType
  departmentId: EntityId
  departmentName: string
  position: number
  version: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Screen extends ScreenSummary {
  companies: ScreenCompany[]
  routines: ScreenRoutine[]
}

export interface SpreadsheetProjectionCell {
  companyId: EntityId
  routineId: EntityId
  tasks: ScheduledOccurrence[]
}

export interface ScheduledOccurrence {
  occurrenceKey: EntityId
  taskId: EntityId | null
  etag: string
  persistence: 'virtual' | 'materialized'
  referenceMonth: string
  kind: 'scheduled'
  departmentId: EntityId
  departmentName: string
  clientCompanyId: EntityId
  companyCode: string
  companyName: string
  companyLegalName: string
  routineId: EntityId
  routineVersionId: EntityId
  sourceAssignmentId: EntityId
  routineShotname: string
  routineName: string
  routineVersionNumber: number
  routineDescription: string
  title: string
  description: string
  observation: string
  links: TaskLinkInput[]
  dueDate: string
  status: RoutineStatus
  assignee: { id: EntityId; displayName: string } | null
  sourceRevision: number
  version: number | null
  materializationReason: string | null
  materializedAt: string | null
  archivedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  isOverdue: boolean
}

export interface SpreadsheetProjection {
  type: 'spreadsheet'
  screen: ScreenSummary
  competenceId: EntityId | null
  period: string
  rows: ScreenCompany[]
  columns: ScreenRoutine[]
  cells: SpreadsheetProjectionCell[]
}

export interface Client {
  id: EntityId
  code: string
  name: string
  legalName?: string
  document?: string
  email?: string
  phone?: string
  taxRegime?: string
  createdAt?: string
  active?: boolean
}

export interface Routine {
  id: EntityId
  departmentId: EntityId
  name: string
  shortName: string
  description?: string
  recurrence?: RoutineRecurrence
  defaultDueDays?: number
  recurrenceMonths?: number[]
  defaultAssigneeMemberId?: EntityId | null
  recurrenceAnchorPeriod?: string
  isTemplate?: boolean
  createdAt?: string
  active?: boolean
}

export type RoutineRecurrence =
  'on_demand' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'

export interface Employee {
  id: EntityId
  name: string
  departmentAccesses?: DepartmentAccessAssignment[]
  login?: string
  role?: OrganizationRole
  credentialConfigured?: boolean
  active?: boolean
}

export interface TaskAttachment {
  id: EntityId
  name?: string
  mimeType?: string
  type?: string
  sizeLabel?: string
  previewType?: string
  previewTitle?: string
  uploadedAt?: string
}

export interface TaskLink {
  id: EntityId
  label: string
  url: string
  createdAt?: string
}

export interface TaskLinkInput {
  label: string
  url: string
}

export type CreateTaskLinkInput = TaskLinkInput

export interface TaskIndicators {
  attachments: number
  comments?: number
  alerts?: number
}

export interface Task {
  id: EntityId
  occurrenceKey?: EntityId
  taskId?: EntityId | null
  competenceId?: EntityId | null
  etag?: string
  persistence?: ScheduledOccurrence['persistence']
  kind: ScheduledOccurrence['kind'] | 'ad_hoc'
  title?: string
  description?: string
  clientId: EntityId | null
  routineId: EntityId | null
  departmentId: EntityId
  assigneeId: EntityId | null
  status: RoutineStatus
  statusDetail?: string | null
  period: string
  referenceMonth?: string
  dueDate: string
  completedAt: string | null
  notes?: string
  attachments?: TaskAttachment[]
  links?: TaskLink[]
  createdAt?: string
  updatedAt?: string | null
  indicators: TaskIndicators
}

export interface RoutineControlData {
  departments: Department[]
  clients: Client[]
  routines: Routine[]
  employees: Employee[]
  screens: Screen[]
  spreadsheetProjections: SpreadsheetProjection[]
  tasks: Task[]
}

export interface RoutineControlMeta {
  period: string
  generatedAt: string
  /** Estado do período carregado pela API; ausente apenas em fixtures legadas. */
  competenceStatus?: CompetenceStatus
}

export interface RoutineControlResponse {
  data: RoutineControlData
  meta: RoutineControlMeta
}

export interface TaskRelations {
  client?: Client
  routine?: Routine
  assignee?: Employee
  department?: Department
  employees?: Employee[]
}

export interface NormalizedRoutineData {
  clientsById: Map<EntityId, Client>
  routinesById: Map<EntityId, Routine>
  employeesById: Map<EntityId, Employee>
  departmentsById: Map<EntityId, Department>
}

export interface AppUser {
  id: EntityId
  membershipId: EntityId
  name: string
  email: string
  role: OrganizationRole
  departmentAccesses: DepartmentAccessAssignment[]
  avatarUrl: string
}

export type AppTheme = 'light' | 'dark' | 'jaral'
export type AppDensity = 'compact' | 'comfortable'
export type AppDefaultView = 'spreadsheet' | 'list'

export interface AppPreferences {
  theme: AppTheme
  density: AppDensity
  defaultView: AppDefaultView
}

export type RoutineListMode = 'client' | 'routine' | 'global' | 'my_tasks'

export interface RoutineListFilter {
  type: RoutineListMode
  id?: EntityId | null
  assigneeId?: EntityId
}

export interface PendingStatusChange {
  status: RoutineStatus
  statusDetail: string | null
}

export interface RoutineListItem {
  id: EntityId
  task: Task
  client?: Client
  routine?: Routine
  department?: Department
  originType: RoutineListMode
  primaryLabel: string
  title: string
  companyCode: string
  companyName: string
  routineName: string
  departmentName: string
  period: string
  status: RoutineStatus
  statusDetail?: string | null
  statusDetailLabel: string
  dueDate: string
  assigneeId: EntityId | null
  assigneeName: string
  notes?: string
  indicators: TaskIndicators
  pendingChange?: PendingStatusChange
  displayStatus?: RoutineStatus
}

export interface RoutineListViewData {
  title: string
  description: string
  items: RoutineListItem[]
}

export interface RoutineListGroup {
  key?: string
  status: RoutineStatus
  label: string
  meta?: string
  defaultOpen?: boolean
  items: RoutineListItem[]
}

export interface RoutineStatusConfig {
  label: string
  dotClass: string
  surfaceClass: string
  cardClass: string
  accentClass: string
  borderClass: string
}

export interface RoutineStatusDetailOption {
  id: string
  label: string
}

export interface RoutineListInteractionProps {
  data: RoutineControlData
  onItemOpen?: (item: RoutineListItem) => void
  onItemQuickAction?: (item: RoutineListItem, action: 'attach') => void
  onItemNoteChange?: (item: RoutineListItem, notes: string) => void
  onItemStatusChange?: (
    item: RoutineListItem,
    change: PendingStatusChange,
  ) => void
  getAllowedStatusChanges?: (item: RoutineListItem) => readonly RoutineStatus[]
}
