import { describe, expect, it } from 'vitest'

import { routineControlMock } from './routineControl.mock'

const fiscalDivisionIds = {
  MEI: 'division-fiscal-mei',
  SIMPLES_NACIONAL: 'division-fiscal-simples-nacional',
  LUCRO_PRESUMIDO: 'division-fiscal-lucro-presumido',
} as const

describe('routineControlMock', () => {
  it('provides complete company and routine metadata for detail pages', () => {
    const { clients, routines } = routineControlMock.data

    expect(clients).toHaveLength(25)
    expect(
      clients.every(
        (client) =>
          /^\d{4}$/.test(client.code) &&
          /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(client.document ?? '') &&
          client.email?.endsWith('@example.com') &&
          Boolean(client.phone),
      ),
    ).toBe(true)
    expect(routines).toHaveLength(15)
    expect(routines.every((routine) => Boolean(routine.recurrence))).toBe(true)
    expect(
      routines.find((routine) => routine.id === 'routine-dasn-simei')
        ?.recurrence,
    ).toBe('annual')
    expect(
      routines.find((routine) => routine.id === 'routine-apurar-irpj-csll')
        ?.recurrence,
    ).toBe('quarterly')
  })

  it('assigns every company to exactly one of the three fiscal divisions', () => {
    const { clients, divisions = [] } = routineControlMock.data

    expect(divisions).toEqual([
      expect.objectContaining({
        id: fiscalDivisionIds.MEI,
        departmentId: 'dept-fiscal',
        name: 'MEI',
        position: 1,
      }),
      expect.objectContaining({
        id: fiscalDivisionIds.SIMPLES_NACIONAL,
        departmentId: 'dept-fiscal',
        name: 'Simples Nacional',
        position: 2,
      }),
      expect.objectContaining({
        id: fiscalDivisionIds.LUCRO_PRESUMIDO,
        departmentId: 'dept-fiscal',
        name: 'Lucro Presumido',
        position: 3,
      }),
    ])

    const assignmentCounts = new Map<string, number>()

    clients.forEach((client) => {
      const fiscalAssignments = (client.divisionAssignments ?? []).filter(
        (assignment) => assignment.departmentId === 'dept-fiscal',
      )

      expect(fiscalAssignments).toHaveLength(1)
      const divisionId = fiscalAssignments[0]!.divisionId
      expect(divisions.some((division) => division.id === divisionId)).toBe(
        true,
      )
      assignmentCounts.set(
        divisionId,
        (assignmentCounts.get(divisionId) ?? 0) + 1,
      )
    })

    expect(Object.fromEntries(assignmentCounts)).toEqual({
      [fiscalDivisionIds.MEI]: 7,
      [fiscalDivisionIds.SIMPLES_NACIONAL]: 10,
      [fiscalDivisionIds.LUCRO_PRESUMIDO]: 8,
    })
  })

  it('shares canonical routines through ordered division links', () => {
    const {
      divisions = [],
      divisionRoutineLinks = [],
      routines,
    } = routineControlMock.data
    const routineIds = new Set(routines.map((routine) => routine.id))

    expect(divisionRoutineLinks).toHaveLength(22)
    expect(new Set(divisionRoutineLinks.map((link) => link.id)).size).toBe(
      divisionRoutineLinks.length,
    )
    expect(
      divisionRoutineLinks.every((link) => routineIds.has(link.routineId)),
    ).toBe(true)

    const expectedRoutineCounts: Record<string, number> = {
      [fiscalDivisionIds.MEI]: 5,
      [fiscalDivisionIds.SIMPLES_NACIONAL]: 8,
      [fiscalDivisionIds.LUCRO_PRESUMIDO]: 9,
    }

    divisions.forEach((division) => {
      const links = divisionRoutineLinks
        .filter((link) => link.divisionId === division.id)
        .sort((left, right) => left.position - right.position)

      expect(links).toHaveLength(expectedRoutineCounts[division.id] ?? 0)
      expect(links.map((link) => link.position)).toEqual(
        Array.from({ length: links.length }, (_, index) => index + 1),
      )
    })

    expect(
      divisionRoutineLinks
        .filter((link) => link.routineId === 'routine-importar-notas-entrada')
        .map((link) => link.divisionId),
    ).toEqual([
      fiscalDivisionIds.MEI,
      fiscalDivisionIds.SIMPLES_NACIONAL,
      fiscalDivisionIds.LUCRO_PRESUMIDO,
    ])
    expect(
      divisionRoutineLinks
        .filter((link) => link.routineId === 'routine-efd-reinf')
        .map((link) => link.divisionId),
    ).toEqual([
      fiscalDivisionIds.SIMPLES_NACIONAL,
      fiscalDivisionIds.LUCRO_PRESUMIDO,
    ])
  })

  it('creates one isolated execution per active company-routine link', () => {
    const {
      clients,
      routines,
      divisionRoutineLinks = [],
      clientRoutineLinks,
      tasks,
    } = routineControlMock.data
    const operationalTasks = tasks.filter((task) => !task.isLoose)
    const clientsById = new Map(
      clients.map((client) => [client.id, client] as const),
    )
    const routineIds = new Set(routines.map((routine) => routine.id))

    expect(clientRoutineLinks).toHaveLength(185)
    expect(operationalTasks).toHaveLength(clientRoutineLinks.length)
    expect(new Set(clientRoutineLinks.map((link) => link.id)).size).toBe(
      clientRoutineLinks.length,
    )
    expect(new Set(operationalTasks.map((task) => task.id)).size).toBe(
      operationalTasks.length,
    )

    clientRoutineLinks.forEach((link) => {
      const client = clientsById.get(link.clientId)
      const divisionId = client?.divisionAssignments?.find(
        (assignment) => assignment.departmentId === 'dept-fiscal',
      )?.divisionId

      expect(client).toBeDefined()
      expect(routineIds.has(link.routineId)).toBe(true)
      expect(
        divisionRoutineLinks.some(
          (divisionRoutineLink) =>
            divisionRoutineLink.divisionId === divisionId &&
            divisionRoutineLink.routineId === link.routineId,
        ),
      ).toBe(true)
      expect(
        operationalTasks.some(
          (task) =>
            task.clientId === link.clientId &&
            task.routineId === link.routineId &&
            task.divisionId === divisionId &&
            task.period === routineControlMock.meta.period,
        ),
      ).toBe(true)
    })

    expect(
      tasks
        .filter((task) => task.isLoose)
        .every((task) => task.divisionId === null),
    ).toBe(true)
  })

  it('models progress by routine columns instead of random company rows', () => {
    const {
      divisions = [],
      divisionRoutineLinks = [],
      tasks,
    } = routineControlMock.data
    const operationalTasks = tasks.filter((task) => !task.isLoose)
    let firstColumnExceptions = 0
    let lastColumnExceptions = 0

    divisions.forEach((division) => {
      const orderedLinks = divisionRoutineLinks
        .filter((link) => link.divisionId === division.id)
        .sort((left, right) => left.position - right.position)
      const firstRoutineId = orderedLinks[0]?.routineId
      const lastRoutineId = orderedLinks.at(-1)?.routineId
      const firstColumnTasks = operationalTasks.filter(
        (task) =>
          task.divisionId === division.id && task.routineId === firstRoutineId,
      )
      const lastColumnTasks = operationalTasks.filter(
        (task) =>
          task.divisionId === division.id && task.routineId === lastRoutineId,
      )
      const firstColumnCompletedCount = firstColumnTasks.filter(
        (task) => task.status === 'completed',
      ).length
      const lastColumnPendingCount = lastColumnTasks.filter(
        (task) => task.status === 'pending',
      ).length
      firstColumnExceptions +=
        firstColumnTasks.length - firstColumnCompletedCount
      lastColumnExceptions += lastColumnTasks.length - lastColumnPendingCount

      expect(firstColumnTasks.length).toBeGreaterThan(0)
      expect(
        firstColumnCompletedCount / firstColumnTasks.length,
      ).toBeGreaterThanOrEqual(0.8)
      expect(lastColumnTasks.length).toBeGreaterThan(0)
      expect(
        lastColumnPendingCount / lastColumnTasks.length,
      ).toBeGreaterThanOrEqual(0.8)
    })

    expect(firstColumnExceptions).toBeGreaterThan(0)
    expect(lastColumnExceptions).toBeGreaterThan(0)
  })

  it('stores typed support links in operational tasks', () => {
    const links = routineControlMock.data.tasks.flatMap(
      (task) => task.links ?? [],
    )

    expect(links.length).toBeGreaterThan(0)
    expect(
      links.every(
        (link) =>
          link.id &&
          link.label &&
          link.url.startsWith('https://') &&
          link.createdAt,
      ),
    ).toBe(true)
  })

  it('stores varied files with metadata instead of attachment counts only', () => {
    const tasks = routineControlMock.data.tasks
    const attachments = tasks.flatMap((task) => task.attachments ?? [])
    const previewTypes = new Set(
      attachments.map((attachment) => attachment.previewType),
    )

    expect(attachments.length).toBeGreaterThan(0)
    expect(previewTypes).toEqual(
      new Set(['spreadsheet', 'xml', 'pdf', 'image', 'document']),
    )
    expect(
      attachments.every(
        (attachment) =>
          attachment.id &&
          attachment.name &&
          attachment.mimeType &&
          attachment.sizeLabel,
      ),
    ).toBe(true)
    expect(
      tasks.every(
        (task) =>
          (task.attachments?.length ?? 0) ===
          (Number(task.indicators?.attachments) || 0),
      ),
    ).toBe(true)
  })

  it('models non-applicability as an absent link and task, not a status', () => {
    const { clientRoutineLinks, tasks } = routineControlMock.data
    const absentPairs = [
      ['client-007', 'routine-efd-reinf'],
      ['client-018', 'routine-efd-reinf'],
    ]

    expect(
      tasks.every((task) => String(task.status) !== 'not_applicable'),
    ).toBe(true)

    absentPairs.forEach(([clientId, routineId]) => {
      expect(
        clientRoutineLinks.some(
          (link) => link.clientId === clientId && link.routineId === routineId,
        ),
      ).toBe(false)
      expect(
        tasks.some(
          (task) => task.clientId === clientId && task.routineId === routineId,
        ),
      ).toBe(false)
    })
  })
})
