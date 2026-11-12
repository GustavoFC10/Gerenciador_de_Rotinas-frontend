import { describe, expect, it } from 'vitest'
import type { OrganizationMemberResource } from '../services/organizationMemberService'
import {
  initialModuleAccesses,
  moduleAccessError,
  moduleAccessLabels,
  moduleAccessPayload,
} from './memberModuleAccess'

const member: OrganizationMemberResource = {
  id: 'member',
  email: 'pessoa@example.com',
  displayName: 'Pessoa',
  role: 'owner',
  status: 'active',
  joinedAt: null,
  departmentAccesses: [],
  createdAt: '',
  updatedAt: '',
}

describe('Honorários membership access', () => {
  it('defaults new invitations and legacy owners to disabled Honorários', () => {
    for (const target of [undefined, member, { ...member, moduleAccesses: [] }])
      expect(initialModuleAccesses(target)).toContainEqual({
        module: 'honorarios',
        enabled: false,
      })
  })

  it.each(['viewer', 'editor', 'manager'] as const)(
    'preserves the independent %s role without sectors',
    (role) => {
      const access = {
        module: 'honorarios' as const,
        enabled: true,
        role,
        sectors: [{ sector: 'fin', role: 'fin' as const }],
      }
      expect(moduleAccessError([access])).toBeUndefined()
      expect(moduleAccessPayload([access])).toEqual([
        { module: 'honorarios', enabled: true, role },
      ])
      expect(
        initialModuleAccesses({ ...member, moduleAccesses: [access] }),
      ).toContainEqual(access)
      expect(
        moduleAccessLabels({ ...member, moduleAccesses: [access] })[0],
      ).toMatch(/^Honorários: /)
    },
  )

  it('requires an explicit valid module role and removes stale grants on revoke', () => {
    expect(
      moduleAccessError([
        { module: 'honorarios', enabled: true, role: 'admin' },
      ]),
    ).toContain('papel de acesso a Honorários')
    expect(
      moduleAccessPayload([
        { module: 'honorarios', enabled: false, role: 'manager', sectors: [] },
      ]),
    ).toEqual([{ module: 'honorarios', enabled: false }])
  })
})
