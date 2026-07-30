import { describe, expect, it } from 'vitest'

import { routineControlMock } from '../mocks/routineControl.mock'
import type {
  CreateClientInput,
  CreateEmployeeInput,
  CreateRoutineInput,
  Routine,
  RoutineControlData,
} from '../types/domain'
import {
  createClientFromPreset,
  createEmployeeProfile,
  createRoutineTemplate,
} from './creationCommands'

const generatedAt = '2026-07-30T10:00:00-03:00'

describe('creation commands', () => {
  describe('createRoutineTemplate', () => {
    it('adds only a deterministic canonical template', () => {
      const data = cloneData()
      const before = structuredClone(data)
      const input: CreateRoutineInput = {
        departmentId: 'dept-fiscal',
        name: '  Conferir ISS  ',
        description: ' Conferência mensal do imposto. ',
        recurrence: 'quarterly',
        defaultAssigneeId: 'employee-001',
        defaultDueDays: 31,
      }

      const result = createRoutineTemplate(data, input, {
        period: '2026-07',
        generatedAt,
      })

      expect(data).toEqual(before)
      expect(result.routine).toMatchObject({
        id: 'routine-conferir-iss',
        departmentId: 'dept-fiscal',
        name: 'Conferir ISS',
        shortName: 'Conferir ISS',
        description: 'Conferência mensal do imposto.',
        recurrence: 'quarterly',
        recurrenceAnchorPeriod: '2026-07',
        defaultDueDays: 31,
        defaultAssigneeId: 'employee-001',
        isTemplate: true,
        createdAt: generatedAt,
        active: true,
      })
      expect(result.routine).not.toHaveProperty('defaultDueDay')
      expect(result.data.routines).toHaveLength(data.routines.length + 1)
      expect(result.data.divisionRoutineLinks).toEqual(
        data.divisionRoutineLinks,
      )
      expect(result.data.clientRoutineLinks).toEqual(data.clientRoutineLinks)
      expect(result.data.tasks).toEqual(data.tasks)
    })

    it('uses a numeric suffix for an occupied slug and rejects duplicates', () => {
      const data = cloneData()
      data.routines.push({
        id: 'routine-revisar-iss',
        departmentId: 'dept-fiscal',
        name: 'Outro processo',
        shortName: 'Outro processo',
      })

      const result = createRoutineTemplate(
        data,
        {
          departmentId: 'dept-fiscal',
          name: 'Revisar ISS',
          description: 'Revisão da apuração.',
          recurrence: 'monthly',
        },
        { period: '2026-07' },
      )

      expect(result.routine.id).toBe('routine-revisar-iss-2')
      expect(() =>
        createRoutineTemplate(
          data,
          {
            departmentId: 'dept-fiscal',
            name: '  EFD REINF ',
            description: 'Duplicada.',
            recurrence: 'monthly',
          },
          { period: '2026-07' },
        ),
      ).toThrow('Já existe uma rotina')
      expect(
        createRoutineTemplate(
          data,
          {
            departmentId: 'dept-fiscal',
            name: 'Regra variável',
            description: 'Sem agenda.',
            recurrence: 'custom',
          },
          { period: '2026-07' },
        ).routine.recurrence,
      ).toBe('custom')
    })
  })

  describe('createClientFromPreset', () => {
    it('creates the company, final links, exclusions and current tasks atomically', () => {
      const data = cloneData()
      const before = structuredClone(data)
      const input = buildClientInput({
        routineIds: [
          'routine-importar-notas-entrada',
          'routine-apurar-pis-cofins',
          'routine-importar-notas-entrada',
        ],
      })

      const result = createClientFromPreset(data, input, {
        period: '2026-06',
        generatedAt,
      })

      expect(data).toEqual(before)
      expect(result.client).toMatchObject({
        id: 'client-0026',
        code: '0026',
        name: 'Nova Empresa',
        legalName: 'Nova Empresa',
        createdAt: generatedAt,
        active: true,
        divisionAssignments: [
          {
            departmentId: 'dept-fiscal',
            divisionId: 'division-fiscal-mei',
          },
        ],
      })
      expect(result.links).toHaveLength(2)
      expect(
        Object.fromEntries(
          result.links.map((link) => [link.routineId, link.source]),
        ),
      ).toEqual({
        'routine-importar-notas-entrada': 'preset',
        'routine-apurar-pis-cofins': 'manual',
      })
      expect(result.exclusions).toHaveLength(4)
      expect(result.tasks).toHaveLength(2)
      expect(
        result.tasks.map((task) => ({
          routineId: task.routineId,
          status: task.status,
          period: task.period,
          divisionId: task.divisionId,
          dueDate: task.dueDate,
        })),
      ).toEqual([
        {
          routineId: 'routine-importar-notas-entrada',
          status: 'pending',
          period: '2026-06',
          divisionId: 'division-fiscal-mei',
          dueDate: '2026-06-08',
        },
        {
          routineId: 'routine-apurar-pis-cofins',
          status: 'pending',
          period: '2026-06',
          divisionId: 'division-fiscal-mei',
          dueDate: '2026-06-20',
        },
      ])
      expect(result.data.divisionRoutineLinks).toEqual(
        data.divisionRoutineLinks,
      )
      expect(
        result.data.divisionRoutineLinks?.some(
          (link) =>
            link.divisionId === 'division-fiscal-mei' &&
            link.routineId === 'routine-apurar-pis-cofins',
        ),
      ).toBe(false)
      expect(new Set(result.tasks.map((task) => task.id)).size).toBe(2)
    })

    it('applies supported recurrence anchors and clamps due dates', () => {
      const data = withRecurrenceFixtures(cloneData())
      const allRoutineIds = [
        'routine-test-monthly',
        'routine-test-quarterly',
        'routine-test-semiannual',
        'routine-test-annual',
        'routine-test-on-demand',
      ]

      const januaryResult = createClientFromPreset(
        data,
        buildClientInput({
          code: '0027',
          document: '12.345.678/0002-70',
          routineIds: allRoutineIds,
        }),
        { period: '2027-01', generatedAt },
      )
      const februaryResult = createClientFromPreset(
        data,
        buildClientInput({
          code: '0028',
          document: '12.345.678/0003-50',
          routineIds: allRoutineIds,
        }),
        { period: '2026-02', generatedAt },
      )

      expect(januaryResult.tasks.map((task) => task.routineId)).toEqual([
        'routine-test-monthly',
        'routine-test-quarterly',
        'routine-test-semiannual',
        'routine-test-annual',
      ])
      expect(
        januaryResult.tasks.some(
          (task) => task.routineId === 'routine-test-on-demand',
        ),
      ).toBe(false)
      expect(februaryResult.tasks).toHaveLength(1)
      expect(februaryResult.tasks[0]).toMatchObject({
        routineId: 'routine-test-monthly',
        dueDate: '2026-02-28',
      })
    })

    it('keeps relative deadlines distinct from a calendar day', () => {
      const data = cloneData()
      data.routines.push({
        id: 'routine-relative-deadline',
        departmentId: 'dept-fiscal',
        name: 'Prazo relativo',
        shortName: 'Prazo relativo',
        recurrence: 'monthly',
        recurrenceAnchorPeriod: '2026-07',
        defaultDueDays: 5,
        active: true,
      })

      const result = createClientFromPreset(
        data,
        buildClientInput({
          code: '0027',
          document: '12.345.678/0002-70',
          routineIds: ['routine-relative-deadline'],
        }),
        {
          period: '2026-07',
          generatedAt: '2026-07-30T10:00:00-03:00',
        },
      )

      expect(result.tasks[0]?.dueDate).toBe('2026-08-04')
    })

    it('validates duplicate companies and invalid references before changing data', () => {
      const data = cloneData()
      const before = structuredClone(data)

      expect(() =>
        createClientFromPreset(data, buildClientInput({ code: '0001' }), {
          period: '2026-06',
          generatedAt,
        }),
      ).toThrow('Já existe uma empresa com esse código')
      expect(() =>
        createClientFromPreset(
          data,
          buildClientInput({ routineIds: ['routine-inexistente'] }),
          { period: '2026-06', generatedAt },
        ),
      ).toThrow('Rotina inválida')
      expect(data).toEqual(before)
    })
  })

  describe('createEmployeeProfile', () => {
    it('creates a deterministic profile without retaining its password', () => {
      const data = cloneData()
      data.employees.push({
        id: 'employee-maria-silva',
        name: 'Outra pessoa',
        login: 'outra@example.com',
      })
      const before = structuredClone(data)
      const input: CreateEmployeeInput = {
        name: '  Maria Silva ',
        login: ' MARIA.SILVA@EXAMPLE.COM ',
        password: 'senha-temporaria',
        role: 'leader',
        departmentIds: ['dept-fiscal', 'dept-fiscal'],
      }

      const result = createEmployeeProfile(data, input)

      expect(data).toEqual(before)
      expect(result.employee).toEqual({
        id: 'employee-maria-silva-2',
        name: 'Maria Silva',
        login: 'maria.silva@example.com',
        role: 'leader',
        departmentIds: ['dept-fiscal'],
        credentialConfigured: true,
        active: true,
      })
      expect(JSON.stringify(result.employee)).not.toContain('senha-temporaria')
      expect(result.data.employees).toHaveLength(data.employees.length + 1)
    })

    it('rejects duplicate credentials, missing passwords and unknown departments', () => {
      const data = cloneData()
      data.employees.push({
        id: 'employee-login-existente',
        name: 'Login existente',
        login: 'existente@example.com',
      })

      expect(() =>
        createEmployeeProfile(data, {
          name: 'Nova pessoa',
          login: ' EXISTENTE@example.com ',
          password: 'senha-segura',
          role: 'employee',
          departmentIds: ['dept-fiscal'],
        }),
      ).toThrow('Já existe um funcionário com esse login')
      expect(() =>
        createEmployeeProfile(data, {
          name: 'Nova pessoa',
          login: 'nova@example.com',
          password: '   ',
          role: 'employee',
          departmentIds: ['dept-fiscal'],
        }),
      ).toThrow('Senha é obrigatório')
      expect(() =>
        createEmployeeProfile(data, {
          name: 'Nova pessoa',
          login: 'nova@example.com',
          password: 'senha-segura',
          role: 'employee',
          departmentIds: ['dept-inexistente'],
        }),
      ).toThrow('Departamento não encontrado')
    })
  })
})

function cloneData(): RoutineControlData {
  return structuredClone(routineControlMock.data)
}

function buildClientInput(
  changes: Partial<CreateClientInput> = {},
): CreateClientInput {
  return {
    name: 'Nova Empresa',
    code: '0026',
    document: '12.345.678/0001-90',
    departmentId: 'dept-fiscal',
    divisionId: 'division-fiscal-mei',
    routineIds: ['routine-importar-notas-entrada'],
    ...changes,
  }
}

function withRecurrenceFixtures(data: RoutineControlData): RoutineControlData {
  const recurrenceFixtures: Routine[] = [
    {
      id: 'routine-test-monthly',
      departmentId: 'dept-fiscal',
      name: 'Mensal de teste',
      shortName: 'Mensal',
      recurrence: 'monthly',
      recurrenceAnchorPeriod: '2026-01',
      defaultDueDay: 31,
      active: true,
    },
    {
      id: 'routine-test-quarterly',
      departmentId: 'dept-fiscal',
      name: 'Trimestral de teste',
      shortName: 'Trimestral',
      recurrence: 'quarterly',
      recurrenceAnchorPeriod: '2026-01',
      defaultDueDay: 31,
      active: true,
    },
    {
      id: 'routine-test-semiannual',
      departmentId: 'dept-fiscal',
      name: 'Semestral de teste',
      shortName: 'Semestral',
      recurrence: 'semiannual',
      recurrenceAnchorPeriod: '2026-01',
      defaultDueDay: 31,
      active: true,
    },
    {
      id: 'routine-test-annual',
      departmentId: 'dept-fiscal',
      name: 'Anual de teste',
      shortName: 'Anual',
      recurrence: 'annual',
      recurrenceAnchorPeriod: '2026-01',
      defaultDueDay: 31,
      active: true,
    },
    {
      id: 'routine-test-on-demand',
      departmentId: 'dept-fiscal',
      name: 'Sob demanda de teste',
      shortName: 'Sob demanda',
      recurrence: 'on_demand',
      recurrenceAnchorPeriod: '2026-01',
      defaultDueDay: 31,
      active: true,
    },
  ]

  return {
    ...data,
    routines: [...data.routines, ...recurrenceFixtures],
  }
}
