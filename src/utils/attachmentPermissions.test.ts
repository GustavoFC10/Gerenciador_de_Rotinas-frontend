import { describe, expect, it } from 'vitest'
import { canAddTaskAttachment, canRemoveTaskAttachment } from './permissions'
import type { AppUser, Task } from '../types/domain'

const user: AppUser = {
  id: 'user-1',
  membershipId: 'member-1',
  name: 'Pessoa',
  email: 'p@example.com',
  role: 'member',
  departmentAccesses: [{ departmentId: 'dept-1', role: 'contributor' }],
  avatarUrl: '',
}
const task: Task = {
  id: 'task-1',
  taskId: 'task-1',
  competenceId: 'competence-1',
  kind: 'ad_hoc',
  clientId: null,
  routineId: null,
  departmentId: 'dept-1',
  assigneeId: 'member-1',
  status: 'pending',
  period: '2026-10',
  dueDate: '2026-10-15',
  completedAt: null,
  indicators: { attachments: 0 },
}
describe('permissões de anexos', () => {
  it('contributor atribuído adiciona e remove apenas seus anexos em tarefas abertas', () => {
    expect(canAddTaskAttachment(user, task, 'projected')).toBe(true)
    expect(canRemoveTaskAttachment(user, task, 'member-1', 'projected')).toBe(
      true,
    )
    expect(
      canRemoveTaskAttachment(user, task, 'other-member', 'projected'),
    ).toBe(false)
    expect(
      canAddTaskAttachment(
        user,
        { ...task, assigneeId: 'other-member' },
        'projected',
      ),
    ).toBe(false)
    expect(
      canAddTaskAttachment(user, { ...task, status: 'completed' }, 'projected'),
    ).toBe(false)
    expect(
      canAddTaskAttachment(
        user,
        { ...task, taskId: null, persistence: 'virtual' },
        'projected',
      ),
    ).toBe(false)
  })
  it('lead pode materializar e remover anexos de outro membro', () => {
    const lead: AppUser = {
      ...user,
      departmentAccesses: [{ departmentId: 'dept-1', role: 'lead' }],
    }
    expect(
      canAddTaskAttachment(
        lead,
        { ...task, taskId: null, persistence: 'virtual' },
        'projected',
      ),
    ).toBe(true)
    expect(
      canRemoveTaskAttachment(
        lead,
        { ...task, status: 'completed' },
        'other-member',
        'projected',
      ),
    ).toBe(true)
    expect(
      canAddTaskAttachment(
        {
          ...lead,
          departmentAccesses: [{ departmentId: 'other-dept', role: 'lead' }],
        },
        task,
        'projected',
      ),
    ).toBe(false)
  })
  it('bloqueia viewer, competência finalizada e tarefa arquivada mesmo para admin', () => {
    expect(
      canAddTaskAttachment(
        {
          ...user,
          departmentAccesses: [{ departmentId: 'dept-1', role: 'viewer' }],
        },
        task,
        'projected',
      ),
    ).toBe(false)
    expect(
      canAddTaskAttachment({ ...user, role: 'admin' }, task, 'finalized'),
    ).toBe(false)
    expect(
      canAddTaskAttachment(
        { ...user, role: 'owner' },
        { ...task, archivedAt: '2026-10-14T10:00:00Z' },
        'projected',
      ),
    ).toBe(false)
    expect(canAddTaskAttachment({ ...user, role: 'admin' }, task)).toBe(false)
  })
})
