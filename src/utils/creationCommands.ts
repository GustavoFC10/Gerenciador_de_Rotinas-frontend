import type {
  Client,
  ClientRoutineExclusion,
  ClientRoutineLink,
  CreateClientInput,
  CreateEmployeeInput,
  CreateRoutineInput,
  Employee,
  EntityId,
  Routine,
  RoutineConfigurationUpdateInput,
  RoutineControlData,
  RoutineRecurrence,
  Task,
  UpdateClientInput,
} from '../types/domain'
import {
  buildRoutineDueDate,
  getRoutineScheduleError,
  isRoutineScheduledForPeriod,
  normalizeRoutineSchedule,
} from './routineSchedule'

export interface CreationCommandContext {
  period: string
  generatedAt?: string
}

export interface ClientCreationCommandContext {
  period: string
  generatedAt: string
}

export interface RoutineCreationResult {
  data: RoutineControlData
  routine: Routine
}

export interface ClientCreationResult {
  data: RoutineControlData
  client: Client
  links: ClientRoutineLink[]
  tasks: Task[]
  exclusions: ClientRoutineExclusion[]
}

export interface EmployeeCreationResult {
  data: RoutineControlData
  employee: Employee
}

export interface ClientUpdateResult {
  data: RoutineControlData
  client: Client
  addedLinks: ClientRoutineLink[]
  removedRoutineIds: EntityId[]
  tasks: Task[]
}

export interface RoutineUpdateResult {
  data: RoutineControlData
  routine: Routine
  removedLinks: ClientRoutineLink[]
  preservedTaskCount: number
}

export function createRoutineTemplate(
  data: RoutineControlData,
  input: CreateRoutineInput,
  context: CreationCommandContext,
): RoutineCreationResult {
  const period = parsePeriod(context.period)
  const departmentId = requireText(input.departmentId, 'Departamento')
  const name = requireText(input.name, 'Nome da rotina')
  const description = requireText(input.description, 'Descrição')
  const recurrence = validateRecurrence(input.recurrence)
  const schedule = normalizeRoutineSchedule(recurrence, {
    defaultDueDays: input.defaultDueDays,
    defaultDueDay: input.defaultDueDay,
    recurrenceMonths: input.recurrenceMonths,
  })
  const scheduleError = getRoutineScheduleError(recurrence, schedule)

  if (!data.departments.some((department) => department.id === departmentId)) {
    throw new Error('Departamento não encontrado.')
  }

  if (
    data.routines.some(
      (routine) =>
        routine.departmentId === departmentId &&
        normalizeForComparison(routine.name) === normalizeForComparison(name),
    )
  ) {
    throw new Error('Já existe uma rotina com esse nome no departamento.')
  }

  if (scheduleError) throw new Error(scheduleError)
  validateOptionalAssignee(data, input.defaultAssigneeId ?? null, departmentId)

  const createdAt = validateOptionalTimestamp(context.generatedAt)
  const baseId = `routine-${slugify(name) || 'template'}`
  const routine: Routine = {
    id: createUniqueId(
      baseId,
      data.routines.map((item) => item.id),
    ),
    departmentId,
    name,
    shortName: name,
    description,
    recurrence,
    recurrenceAnchorPeriod: period.value,
    ...schedule,
    defaultAssigneeId: input.defaultAssigneeId ?? null,
    isTemplate: true,
    ...(createdAt ? { createdAt } : {}),
    active: true,
  }

  return {
    routine,
    data: {
      ...data,
      routines: [...data.routines, routine],
    },
  }
}

export function createClientFromPreset(
  data: RoutineControlData,
  input: CreateClientInput,
  context: ClientCreationCommandContext,
): ClientCreationResult {
  const period = parsePeriod(context.period)
  const generatedAt = validateTimestamp(context.generatedAt, 'Data de criação')
  const departmentId = requireText(input.departmentId, 'Departamento')
  const divisionId = requireText(input.divisionId, 'Divisão')
  const name = requireText(input.name, 'Nome da empresa')
  const code = requireText(input.code, 'Código')
  const document = requireText(input.document, 'CNPJ')
  const email = normalizeOptionalText(input.email)

  if (!/^\d{4}$/.test(code)) {
    throw new Error('O código da empresa deve ter quatro dígitos.')
  }

  if (onlyDigits(document).length !== 14) {
    throw new Error('O CNPJ deve ter 14 dígitos.')
  }

  if (!data.departments.some((department) => department.id === departmentId)) {
    throw new Error('Departamento não encontrado.')
  }

  const division = (data.divisions ?? []).find(
    (item) =>
      item.id === divisionId &&
      item.departmentId === departmentId &&
      item.active !== false,
  )

  if (!division) {
    throw new Error('Divisão ativa não encontrada no departamento.')
  }

  if (data.clients.some((client) => client.code === code)) {
    throw new Error('Já existe uma empresa com esse código.')
  }

  if (
    data.clients.some(
      (client) =>
        client.document && onlyDigits(client.document) === onlyDigits(document),
    )
  ) {
    throw new Error('Já existe uma empresa com esse CNPJ.')
  }

  if (email && !isValidEmail(email)) {
    throw new Error('Informe um e-mail válido para a empresa.')
  }

  const selectedRoutineIds = uniqueIds(input.routineIds)
  const selectedRoutines = selectedRoutineIds.map((routineId) => {
    const routine = data.routines.find((item) => item.id === routineId)

    if (
      !routine ||
      routine.departmentId !== departmentId ||
      routine.active === false
    ) {
      throw new Error(`Rotina inválida para o departamento: ${routineId}.`)
    }

    return routine
  })
  const existingClientIds = data.clients.map((client) => client.id)
  const clientId = createUniqueId(`client-${code}`, existingClientIds)
  const assignmentId = createUniqueId(
    `assignment-${clientId}-${divisionId}`,
    data.clients.flatMap((client) =>
      (client.divisionAssignments ?? []).map((assignment) => assignment.id),
    ),
  )
  const client: Client = {
    id: clientId,
    code,
    name,
    legalName: normalizeOptionalText(input.legalName) ?? name,
    document,
    ...(email ? { email } : {}),
    ...(normalizeOptionalText(input.phone)
      ? { phone: normalizeOptionalText(input.phone) }
      : {}),
    ...(input.taxRegime ? { taxRegime: input.taxRegime } : {}),
    divisionAssignments: [
      {
        id: assignmentId,
        departmentId,
        divisionId,
      },
    ],
    createdAt: generatedAt,
    active: true,
  }
  const presetRoutineIds = new Set(
    (data.divisionRoutineLinks ?? [])
      .filter((link) => link.divisionId === divisionId)
      .map((link) => link.routineId),
  )
  const selectedRoutineIdSet = new Set(selectedRoutineIds)
  const linkIds = data.clientRoutineLinks.map((link) => link.id)
  const links = selectedRoutines.map((routine) => {
    const baseId = `link-${clientId}-${divisionId}-${routine.id}`
    const link: ClientRoutineLink = {
      id: createUniqueId(baseId, linkIds),
      clientId,
      routineId: routine.id,
      divisionId,
      source: presetRoutineIds.has(routine.id) ? 'preset' : 'manual',
      createdAt: generatedAt,
    }

    linkIds.push(link.id)
    return link
  })
  const exclusionIds = (data.clientRoutineExclusions ?? []).map(
    (exclusion) => exclusion.id,
  )
  const exclusions = [...presetRoutineIds]
    .filter((routineId) => !selectedRoutineIdSet.has(routineId))
    .map((routineId) => {
      const baseId = `exclusion-${clientId}-${divisionId}-${routineId}`
      const exclusion: ClientRoutineExclusion = {
        id: createUniqueId(baseId, exclusionIds),
        clientId,
        divisionId,
        routineId,
        createdAt: generatedAt,
      }

      exclusionIds.push(exclusion.id)
      return exclusion
    })
  const taskIds = data.tasks.map((task) => task.id)
  const tasks = selectedRoutines.flatMap((routine) => {
    if (!isRoutineScheduledForPeriod(routine, period.value)) return []

    const existingTask = data.tasks.find(
      (task) =>
        task.clientId === clientId &&
        task.routineId === routine.id &&
        task.divisionId === divisionId &&
        task.period === period.value,
    )

    if (existingTask) return []

    const baseId = `task-${period.value}-${clientId}-${divisionId}-${routine.id}`
    const task: Task = {
      id: createUniqueId(baseId, taskIds),
      clientId,
      routineId: routine.id,
      departmentId,
      divisionId,
      assigneeId: resolveDefaultAssignee(data, routine, departmentId),
      status: 'pending',
      period: period.value,
      dueDate: buildRoutineDueDate(routine, period.value, generatedAt),
      completedAt: null,
      notes: '',
      attachments: [],
      links: [],
      createdAt: generatedAt,
      indicators: {
        attachments: 0,
        comments: 0,
        alerts: 0,
      },
    }

    taskIds.push(task.id)
    return [task]
  })

  return {
    client,
    links,
    tasks,
    exclusions,
    data: {
      ...data,
      clients: [...data.clients, client],
      clientRoutineLinks: [...data.clientRoutineLinks, ...links],
      clientRoutineExclusions: [
        ...(data.clientRoutineExclusions ?? []),
        ...exclusions,
      ],
      tasks: [...data.tasks, ...tasks],
    },
  }
}

export function updateClientConfiguration(
  data: RoutineControlData,
  clientId: EntityId,
  input: UpdateClientInput,
  context: ClientCreationCommandContext,
): ClientUpdateResult {
  const period = parsePeriod(context.period)
  const generatedAt = validateTimestamp(
    context.generatedAt,
    'Data de alteração',
  )
  const currentClient = data.clients.find((client) => client.id === clientId)

  if (!currentClient) throw new Error('Empresa não encontrada.')

  const name = requireText(input.name, 'Nome da empresa')
  const code = requireText(input.code, 'Código')
  const document = requireText(input.document ?? '', 'CNPJ')
  const email = normalizeOptionalText(input.email)

  if (!/^\d{4}$/.test(code)) {
    throw new Error('O código da empresa deve ter quatro dígitos.')
  }

  if (onlyDigits(document).length !== 14) {
    throw new Error('O CNPJ deve ter 14 dígitos.')
  }

  if (
    data.clients.some(
      (client) => client.id !== clientId && client.code === code,
    )
  ) {
    throw new Error('Já existe uma empresa com esse código.')
  }

  if (
    data.clients.some(
      (client) =>
        client.id !== clientId &&
        client.document &&
        onlyDigits(client.document) === onlyDigits(document),
    )
  ) {
    throw new Error('Já existe uma empresa com esse CNPJ.')
  }

  if (email && !isValidEmail(email)) {
    throw new Error('Informe um e-mail válido para a empresa.')
  }

  input.divisionAssignments.forEach((assignment) => {
    const division = (data.divisions ?? []).find(
      (item) =>
        item.id === assignment.divisionId &&
        item.departmentId === assignment.departmentId &&
        item.active !== false,
    )
    if (!division) {
      throw new Error('Uma das divisões selecionadas não está disponível.')
    }
  })

  const selectedRoutineIds = uniqueIds(
    input.routineIds ??
      data.clientRoutineLinks
        .filter((link) => link.clientId === clientId)
        .map((link) => link.routineId),
  )
  const selectedRoutines = selectedRoutineIds.map((routineId) => {
    const routine = data.routines.find((item) => item.id === routineId)
    if (!routine) throw new Error(`Rotina não encontrada: ${routineId}.`)
    return routine
  })
  const assignmentsByDepartment = new Map(
    input.divisionAssignments.map((assignment) => [
      assignment.departmentId,
      assignment,
    ]),
  )

  selectedRoutines.forEach((routine) => {
    const departmentHasDivisions = (data.divisions ?? []).some(
      (division) => division.departmentId === routine.departmentId,
    )
    if (
      departmentHasDivisions &&
      !assignmentsByDepartment.has(routine.departmentId)
    ) {
      throw new Error(
        `Selecione uma divisão para vincular a rotina ${routine.name}.`,
      )
    }
  })

  const client: Client = {
    ...currentClient,
    name,
    code,
    legalName: normalizeOptionalText(input.legalName) ?? name,
    document,
    ...(email ? { email } : { email: undefined }),
    ...(normalizeOptionalText(input.phone)
      ? { phone: normalizeOptionalText(input.phone) }
      : { phone: undefined }),
    taxRegime: input.taxRegime,
    divisionAssignments: input.divisionAssignments,
    active: input.active,
  }
  const currentLinks = data.clientRoutineLinks.filter(
    (link) => link.clientId === clientId,
  )
  const currentLinksByRoutineId = new Map(
    currentLinks.map((link) => [link.routineId, link]),
  )
  const occupiedLinkIds = data.clientRoutineLinks.map((link) => link.id)
  const nextLinks = selectedRoutines.map((routine) => {
    const existingLink = currentLinksByRoutineId.get(routine.id)
    const divisionId = assignmentsByDepartment.get(
      routine.departmentId,
    )?.divisionId
    const isPreset = Boolean(
      divisionId &&
      (data.divisionRoutineLinks ?? []).some(
        (link) =>
          link.divisionId === divisionId && link.routineId === routine.id,
      ),
    )

    return {
      id:
        existingLink?.id ??
        createUniqueId(
          `link-${clientId}-${divisionId ?? 'general'}-${routine.id}`,
          occupiedLinkIds,
        ),
      clientId,
      routineId: routine.id,
      ...(divisionId ? { divisionId } : {}),
      source: isPreset ? ('preset' as const) : ('manual' as const),
      createdAt: existingLink?.createdAt ?? generatedAt,
    }
  })
  const addedLinks = nextLinks.filter(
    (link) => !currentLinksByRoutineId.has(link.routineId),
  )
  const selectedRoutineIdSet = new Set(selectedRoutineIds)
  const removedRoutineIds = currentLinks
    .filter((link) => !selectedRoutineIdSet.has(link.routineId))
    .map((link) => link.routineId)
  const otherClientLinks = data.clientRoutineLinks.filter(
    (link) => link.clientId !== clientId,
  )
  const otherClientExclusions = (data.clientRoutineExclusions ?? []).filter(
    (exclusion) => exclusion.clientId !== clientId,
  )
  const exclusionIds = otherClientExclusions.map((exclusion) => exclusion.id)
  const exclusions = input.divisionAssignments.flatMap((assignment) =>
    (data.divisionRoutineLinks ?? [])
      .filter(
        (link) =>
          link.divisionId === assignment.divisionId &&
          !selectedRoutineIdSet.has(link.routineId),
      )
      .map((link) => {
        const exclusion: ClientRoutineExclusion = {
          id: createUniqueId(
            `exclusion-${clientId}-${assignment.divisionId}-${link.routineId}`,
            exclusionIds,
          ),
          clientId,
          divisionId: assignment.divisionId,
          routineId: link.routineId,
          createdAt: generatedAt,
        }
        exclusionIds.push(exclusion.id)
        return exclusion
      }),
  )
  const taskIds = data.tasks.map((task) => task.id)
  const tasks = addedLinks.flatMap((link) => {
    const routine = data.routines.find((item) => item.id === link.routineId)!
    if (!isRoutineScheduledForPeriod(routine, period.value)) return []

    const alreadyExists = data.tasks.some(
      (task) =>
        task.clientId === clientId &&
        task.routineId === routine.id &&
        task.period === period.value,
    )
    if (alreadyExists) return []

    const task: Task = {
      id: createUniqueId(
        `task-${period.value}-${clientId}-${link.divisionId ?? 'general'}-${routine.id}`,
        taskIds,
      ),
      clientId,
      routineId: routine.id,
      departmentId: routine.departmentId,
      divisionId: link.divisionId ?? null,
      assigneeId: resolveDefaultAssignee(data, routine, routine.departmentId),
      status: 'pending',
      period: period.value,
      dueDate: buildRoutineDueDate(routine, period.value, generatedAt),
      completedAt: null,
      notes: '',
      attachments: [],
      links: [],
      createdAt: generatedAt,
      indicators: {
        attachments: 0,
        comments: 0,
        alerts: 0,
      },
    }
    taskIds.push(task.id)
    return [task]
  })

  return {
    client,
    addedLinks,
    removedRoutineIds,
    tasks,
    data: {
      ...data,
      clients: data.clients.map((item) =>
        item.id === clientId ? client : item,
      ),
      clientRoutineLinks: [...otherClientLinks, ...nextLinks],
      clientRoutineExclusions: [...otherClientExclusions, ...exclusions],
      tasks: [...data.tasks, ...tasks],
    },
  }
}

export function updateRoutineConfiguration(
  data: RoutineControlData,
  routineId: EntityId,
  input: RoutineConfigurationUpdateInput,
  context: { generatedAt: string },
): RoutineUpdateResult {
  const currentRoutine = data.routines.find((item) => item.id === routineId)
  if (!currentRoutine) throw new Error('Rotina não encontrada.')

  const generatedAt = validateTimestamp(
    context.generatedAt,
    'Data de alteração',
  )
  const name = requireText(input.routine.name, 'Nome da rotina')
  const shortName = requireText(input.routine.shortName, 'Nome curto')
  const recurrence = validateRecurrence(input.routine.recurrence)
  const schedule = normalizeRoutineSchedule(recurrence, {
    defaultDueDays: input.routine.defaultDueDays,
    defaultDueDay: input.routine.defaultDueDay,
    recurrenceMonths: input.routine.recurrenceMonths,
  })
  const scheduleError = getRoutineScheduleError(recurrence, schedule)
  if (scheduleError) throw new Error(scheduleError)

  validateOptionalAssignee(
    data,
    input.routine.defaultAssigneeId ?? null,
    currentRoutine.departmentId,
  )

  if (
    data.routines.some(
      (routine) =>
        routine.id !== routineId &&
        routine.departmentId === currentRoutine.departmentId &&
        normalizeForComparison(routine.name) === normalizeForComparison(name),
    )
  ) {
    throw new Error('Já existe uma rotina com esse nome no departamento.')
  }

  const unlinkClientIds = uniqueIds(input.unlinkClientIds)
  unlinkClientIds.forEach((clientId) => {
    if (!data.clients.some((client) => client.id === clientId)) {
      throw new Error(`Empresa não encontrada: ${clientId}.`)
    }
    if (
      !data.clientRoutineLinks.some(
        (link) => link.clientId === clientId && link.routineId === routineId,
      )
    ) {
      throw new Error('Um dos vínculos selecionados não está mais disponível.')
    }
  })

  const unlinkClientIdSet = new Set(unlinkClientIds)
  const removedLinks = data.clientRoutineLinks.filter(
    (link) =>
      link.routineId === routineId && unlinkClientIdSet.has(link.clientId),
  )
  const remainingLinks = data.clientRoutineLinks.filter(
    (link) => !removedLinks.some((removed) => removed.id === link.id),
  )
  const nextExclusions = [...(data.clientRoutineExclusions ?? [])]
  const occupiedExclusionIds = nextExclusions.map((item) => item.id)

  removedLinks.forEach((link) => {
    const client = data.clients.find((item) => item.id === link.clientId)!
    const divisionId =
      link.divisionId ??
      client.divisionAssignments?.find(
        (assignment) => assignment.departmentId === currentRoutine.departmentId,
      )?.divisionId
    const belongsToPreset = Boolean(
      divisionId &&
      (link.source === 'preset' ||
        (data.divisionRoutineLinks ?? []).some(
          (presetLink) =>
            presetLink.divisionId === divisionId &&
            presetLink.routineId === routineId,
        )),
    )

    if (
      !belongsToPreset ||
      !divisionId ||
      nextExclusions.some(
        (exclusion) =>
          exclusion.clientId === link.clientId &&
          exclusion.routineId === routineId &&
          exclusion.divisionId === divisionId,
      )
    ) {
      return
    }

    const exclusion: ClientRoutineExclusion = {
      id: createUniqueId(
        `exclusion-${link.clientId}-${divisionId}-${routineId}`,
        occupiedExclusionIds,
      ),
      clientId: link.clientId,
      divisionId,
      routineId,
      createdAt: generatedAt,
    }
    occupiedExclusionIds.push(exclusion.id)
    nextExclusions.push(exclusion)
  })

  const routine: Routine = {
    ...currentRoutine,
    name,
    shortName,
    description: normalizeOptionalText(input.routine.description),
    recurrence,
    ...schedule,
    defaultAssigneeId: input.routine.defaultAssigneeId ?? null,
    active: input.routine.active,
  }
  const preservedTaskCount = data.tasks.filter(
    (task) =>
      task.routineId === routineId &&
      task.clientId !== null &&
      unlinkClientIdSet.has(task.clientId),
  ).length

  return {
    routine,
    removedLinks,
    preservedTaskCount,
    data: {
      ...data,
      routines: data.routines.map((item) =>
        item.id === routineId ? routine : item,
      ),
      clientRoutineLinks: remainingLinks,
      clientRoutineExclusions: nextExclusions,
      tasks: data.tasks,
    },
  }
}

export function createEmployeeProfile(
  data: RoutineControlData,
  input: CreateEmployeeInput,
): EmployeeCreationResult {
  const name = requireText(input.name, 'Nome do funcionário')
  const login = requireText(input.login, 'Login').toLocaleLowerCase('pt-BR')
  const password = requireText(input.password, 'Senha')
  const departmentIds = uniqueIds(input.departmentIds)

  if (!['employee', 'leader', 'manager'].includes(input.role)) {
    throw new Error('Cargo inválido.')
  }

  if (!isValidEmail(login)) {
    throw new Error('Use um endereço de e-mail válido como login.')
  }

  if (password.length < 8) {
    throw new Error('A senha deve ter pelo menos 8 caracteres.')
  }

  if (departmentIds.length === 0) {
    throw new Error('Selecione ao menos um departamento.')
  }

  departmentIds.forEach((departmentId) => {
    if (
      !data.departments.some((department) => department.id === departmentId)
    ) {
      throw new Error(`Departamento não encontrado: ${departmentId}.`)
    }
  })

  if (
    data.employees.some(
      (employee) => employee.login?.trim().toLocaleLowerCase('pt-BR') === login,
    )
  ) {
    throw new Error('Já existe um funcionário com esse login.')
  }

  const employee: Employee = {
    id: createUniqueId(
      `employee-${slugify(name) || 'profile'}`,
      data.employees.map((item) => item.id),
    ),
    name,
    login,
    role: input.role,
    departmentIds,
    credentialConfigured: password.length > 0,
    active: true,
  }

  return {
    employee,
    data: {
      ...data,
      employees: [...data.employees, employee],
    },
  }
}

function validateRecurrence(recurrence: RoutineRecurrence): RoutineRecurrence {
  if (
    !['on_demand', 'monthly', 'quarterly', 'semiannual', 'annual'].includes(
      recurrence,
    )
  ) {
    throw new Error('Recorrência inválida.')
  }

  return recurrence
}

function resolveDefaultAssignee(
  data: RoutineControlData,
  routine: Routine,
  departmentId: EntityId,
): EntityId | null {
  if (!routine.defaultAssigneeId) return null

  const employee = data.employees.find(
    (item) =>
      item.id === routine.defaultAssigneeId &&
      item.active !== false &&
      (!item.departmentIds ||
        item.departmentIds.length === 0 ||
        item.departmentIds.includes(departmentId)),
  )

  return employee?.id ?? null
}

function validateOptionalAssignee(
  data: RoutineControlData,
  employeeId: EntityId | null,
  departmentId: EntityId,
) {
  if (!employeeId) return

  const employee = data.employees.find(
    (item) =>
      item.id === employeeId &&
      item.active !== false &&
      (!item.departmentIds ||
        item.departmentIds.length === 0 ||
        item.departmentIds.includes(departmentId)),
  )

  if (!employee) {
    throw new Error('Responsável padrão inválido para o departamento.')
  }
}

function parsePeriod(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  const year = Number(match?.[1])
  const month = Number(match?.[2])

  if (!match || !Number.isInteger(year) || month < 1 || month > 12) {
    throw new Error('Competência inválida. Use o formato AAAA-MM.')
  }

  return {
    value: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`,
    year,
    month,
    index: year * 12 + month - 1,
  }
}

function validateTimestamp(value: string, label: string): string {
  const normalized = requireText(value, label)

  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${label} inválida.`)
  }

  return normalized
}

function validateOptionalTimestamp(value?: string): string | undefined {
  return value ? validateTimestamp(value, 'Data de criação') : undefined
}

function requireText(value: string, label: string): string {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`${label} é obrigatório.`)
  }

  return normalized
}

function normalizeOptionalText(value?: string): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function uniqueIds(ids: EntityId[]): EntityId[] {
  const normalizedIds = ids.map((id) => requireText(id, 'Identificador'))
  return [...new Set(normalizedIds)]
}

function normalizeForComparison(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
}

function slugify(value: string): string {
  return normalizeForComparison(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createUniqueId(baseId: string, existingIds: EntityId[]): EntityId {
  const occupiedIds = new Set(existingIds)

  if (!occupiedIds.has(baseId)) return baseId

  let suffix = 2
  while (occupiedIds.has(`${baseId}-${suffix}`)) {
    suffix += 1
  }

  return `${baseId}-${suffix}`
}
