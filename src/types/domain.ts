export type EntityId = string

export type UserRole = 'employee' | 'leader' | 'manager'

export type RoutineStatus =
  'pending' | 'in_progress' | 'error' | 'completed' | 'no_movement'

export interface Department {
  id: EntityId
  name: string
}

export interface DepartmentDivision {
  id: EntityId
  departmentId: EntityId
  name: string
  slug: string
  description?: string
  position: number
  active?: boolean
}

export interface ClientDivisionAssignment {
  id: EntityId
  departmentId: EntityId
  divisionId: EntityId
}

export interface Client {
  id: EntityId
  code: string
  name: string
  legalName?: string
  document?: string
  email?: string
  phone?: string
  taxRegime?: ClientTaxRegime
  divisionAssignments?: ClientDivisionAssignment[]
  createdAt?: string
  active?: boolean
}

export type ClientTaxRegime =
  'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei' | 'other'

export interface UpdateClientInput {
  name: string
  code: string
  legalName?: string
  document?: string
  email?: string
  phone?: string
  taxRegime?: ClientTaxRegime
  divisionAssignments: ClientDivisionAssignment[]
  routineIds?: EntityId[]
  active: boolean
}

export interface CreateClientInput {
  name: string
  code: string
  document: string
  legalName?: string
  email?: string
  phone?: string
  taxRegime?: ClientTaxRegime
  departmentId: EntityId
  divisionId: EntityId
  routineIds: EntityId[]
}

export interface Routine {
  id: EntityId
  departmentId: EntityId
  name: string
  shortName: string
  description?: string
  recurrence?: RoutineRecurrence
  defaultDueDate?: string
  defaultDueDay?: number
  recurrenceMonths?: number[]
  defaultDueDays?: number
  defaultAssigneeId?: EntityId | null
  recurrenceAnchorPeriod?: string
  isTemplate?: boolean
  createdAt?: string
  active?: boolean
}

export type RoutineRecurrence =
  'on_demand' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom'

export interface CreateRoutineInput {
  departmentId: EntityId
  name: string
  description: string
  recurrence: RoutineRecurrence
  defaultAssigneeId?: EntityId | null
  defaultDueDate?: string
  defaultDueDay?: number
  recurrenceMonths?: number[]
}

export interface UpdateRoutineInput {
  name: string
  shortName: string
  description?: string
  recurrence: RoutineRecurrence
  defaultDueDate?: string
  defaultDueDay?: number
  recurrenceMonths?: number[]
  active: boolean
}

export interface ClientRoutineLink {
  id: EntityId
  clientId: EntityId
  routineId: EntityId
  divisionId?: EntityId
  source?: ClientRoutineSource
  createdAt?: string
}

export type ClientRoutineSource = 'preset' | 'manual'

export interface ClientRoutineExclusion {
  id: EntityId
  clientId: EntityId
  divisionId: EntityId
  routineId: EntityId
  createdAt: string
}

export interface DivisionRoutineLink {
  id: EntityId
  divisionId: EntityId
  routineId: EntityId
  position: number
}

export interface Employee {
  id: EntityId
  name: string
  departmentIds?: EntityId[]
  login?: string
  role?: UserRole
  credentialConfigured?: boolean
  active?: boolean
}

export interface CreateEmployeeInput {
  name: string
  login: string
  password: string
  role: UserRole
  departmentIds: EntityId[]
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

export interface CreateTaskLinkInput {
  label: string
  url: string
}

export interface TaskIndicators {
  attachments: number
  comments?: number
  alerts?: number
}

export interface Task {
  id: EntityId
  isLoose?: boolean
  title?: string
  description?: string
  clientId: EntityId | null
  routineId: EntityId | null
  departmentId: EntityId
  divisionId?: EntityId | null
  assigneeId: EntityId | null
  status: RoutineStatus
  statusDetail?: string | null
  period: string
  dueDate: string
  completedAt: string | null
  notes?: string
  attachments?: TaskAttachment[]
  links?: TaskLink[]
  createdAt?: string
  indicators: TaskIndicators
}

export interface RoutineControlData {
  departments: Department[]
  divisions?: DepartmentDivision[]
  clients: Client[]
  routines: Routine[]
  divisionRoutineLinks?: DivisionRoutineLink[]
  clientRoutineLinks: ClientRoutineLink[]
  clientRoutineExclusions?: ClientRoutineExclusion[]
  employees: Employee[]
  tasks: Task[]
}

export interface RoutineControlMeta {
  period: string
  generatedAt: string
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
  divisionsById: Map<EntityId, DepartmentDivision>
}

export interface AppUser {
  id: EntityId
  employeeId: EntityId
  name: string
  email: string
  role: UserRole
  departmentIds: EntityId[]
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
}
