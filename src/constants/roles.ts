import type {
  AppUser,
  DepartmentAccessRole,
  OrganizationRole,
} from '../types/domain'

export const ORGANIZATION_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const satisfies Record<string, OrganizationRole>

export const DEPARTMENT_ACCESS_ROLE = {
  LEAD: 'lead',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer',
} as const satisfies Record<string, DepartmentAccessRole>

export const memberUserMock: AppUser = {
  id: 'user-001',
  membershipId: 'employee-001',
  name: 'Ana Souza',
  email: 'ana.souza@example.com',
  role: ORGANIZATION_ROLE.MEMBER,
  departmentAccesses: [
    {
      departmentId: 'dept-fiscal',
      role: DEPARTMENT_ACCESS_ROLE.CONTRIBUTOR,
    },
  ],
  avatarUrl: '',
}

export const leadUserMock: AppUser = {
  id: 'user-002',
  membershipId: 'employee-002',
  name: 'Bruno Lima',
  email: 'bruno.lima@example.com',
  role: ORGANIZATION_ROLE.MEMBER,
  departmentAccesses: [
    {
      departmentId: 'dept-fiscal',
      role: DEPARTMENT_ACCESS_ROLE.LEAD,
    },
  ],
  avatarUrl: '',
}

export const adminUserMock: AppUser = {
  id: 'user-003',
  membershipId: 'employee-003',
  name: 'Carla Melo',
  email: 'carla.melo@example.com',
  role: ORGANIZATION_ROLE.ADMIN,
  departmentAccesses: [],
  avatarUrl: '',
}

export const appUsersMock: AppUser[] = [
  memberUserMock,
  leadUserMock,
  adminUserMock,
]
