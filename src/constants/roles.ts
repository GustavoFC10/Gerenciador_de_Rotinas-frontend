import type { AppUser, UserRole } from '../types/domain'

export const USER_ROLE = {
  EMPLOYEE: 'employee',
  LEADER: 'leader',
  MANAGER: 'manager',
} as const satisfies Record<string, UserRole>

export const currentUserMock: AppUser = {
  id: 'user-001',
  employeeId: 'employee-001',
  name: 'Ana Souza',
  email: 'ana.souza@example.com',
  role: USER_ROLE.EMPLOYEE,
  departmentIds: ['dept-fiscal'],
  avatarUrl: '',
}
