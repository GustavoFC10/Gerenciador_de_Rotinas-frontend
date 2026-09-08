import { describe, expect, it } from 'vitest'

import {
  filterTasksByAssignee,
  filterTasksByClient,
  filterTasksByDepartment,
  filterTasksByRoutine,
  searchTasks,
} from './routineFilters'

const tasks = [
  {
    id: 'task-1',
    clientId: 'client-1',
    routineId: 'routine-1',
    departmentId: 'dept-fiscal',
    assigneeId: 'employee-1',
    notes: 'Conferir xml',
    status: 'pending',
  },
  {
    id: 'task-2',
    clientId: 'client-2',
    routineId: 'routine-1',
    departmentId: 'dept-fiscal',
    assigneeId: 'employee-2',
    notes: 'DAS enviado',
    status: 'completed',
  },
]

const relations = {
  clientsById: new Map([
    ['client-1', { code: '001', name: 'Alpha Ltda' }],
    ['client-2', { code: '002', name: 'Beta Comercio' }],
  ]),
  routinesById: new Map([['routine-1', { name: 'Enviar DAS' }]]),
  employeesById: new Map([
    ['employee-1', { name: 'Ana Souza' }],
    ['employee-2', { name: 'Bruno Lima' }],
  ]),
}

describe('routine filters', () => {
  it('filters by core task relations', () => {
    expect(filterTasksByClient(tasks, 'client-1')).toHaveLength(1)
    expect(filterTasksByRoutine(tasks, 'routine-1')).toHaveLength(2)
    expect(filterTasksByDepartment(tasks, 'dept-fiscal')).toHaveLength(2)
    expect(filterTasksByAssignee(tasks, 'employee-2')).toEqual([tasks[1]])
  })

  it('searches through client, routine, employee and notes', () => {
    expect(searchTasks(tasks, 'alpha', relations)).toEqual([tasks[0]])
    expect(searchTasks(tasks, 'bruno', relations)).toEqual([tasks[1]])
    expect(searchTasks(tasks, 'xml', relations)).toEqual([tasks[0]])
    expect(searchTasks(tasks, 'enviar', relations)).toHaveLength(2)
  })
})
