export type EntityId = string

export type RoutineStatus =
  | 'pending'
  | 'in_progress'
  | 'error'
  | 'completed'
  | 'no_movement'

export interface Department {
  id: EntityId
  name: string
}

export interface Client {
  id: EntityId
  code: string
  name: string
}

export interface Routine {
  id: EntityId
  departmentId: EntityId
  name: string
  shortName: string
  description?: string
}

export interface ClientRoutineLink {
  id: EntityId
  clientId: EntityId
  routineId: EntityId
}

export interface Employee {
  id: EntityId
  name: string
  departmentIds?: EntityId[]
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
  assigneeId: EntityId | null
  status: RoutineStatus
  statusDetail?: string | null
  period: string
  dueDate: string
  completedAt: string | null
  notes?: string
  attachments?: TaskAttachment[]
  indicators: TaskIndicators
}

export interface RoutineControlData {
  departments: Department[]
  clients: Client[]
  routines: Routine[]
  clientRoutineLinks: ClientRoutineLink[]
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
}

export type UserRole = 'employee' | 'leader' | 'manager'

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
