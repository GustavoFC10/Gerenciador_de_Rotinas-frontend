export const USER_ROLE = {
  EMPLOYEE: 'employee',
  LEADER: 'leader',
  MANAGER: 'manager',
}

export const currentUserMock = {
  id: 'user-001',
  employeeId: 'employee-001',
  name: 'Ana Souza',
  email: 'ana.souza@example.com',
  role: USER_ROLE.EMPLOYEE,
  departmentIds: ['dept-fiscal'],
  avatarUrl: '',
}
