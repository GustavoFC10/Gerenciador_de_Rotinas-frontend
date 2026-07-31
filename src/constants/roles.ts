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

export const leaderUserMock: AppUser = {
  id: 'user-002',
  employeeId: 'employee-002',
  name: 'Bruno Lima',
  email: 'bruno.lima@example.com',
  role: USER_ROLE.LEADER,
  departmentIds: ['dept-fiscal'],
  avatarUrl: '',
}

export const managerUserMock: AppUser = {
  id: 'user-003',
  employeeId: 'employee-003',
  name: 'Carla Melo',
  email: 'carla.melo@example.com',
  role: USER_ROLE.MANAGER,
  departmentIds: ['dept-fiscal'],
  avatarUrl: '',
}

export const appUsersMock: AppUser[] = [
  currentUserMock,
  leaderUserMock,
  managerUserMock,
]
