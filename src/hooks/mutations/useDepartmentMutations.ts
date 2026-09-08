import { useMutation, useQueryClient } from '@tanstack/react-query'

import { upsertDepartmentInOperationalContexts } from '../../query/routineControlCache'
import { type OrganizationQueryScope } from '../../query/queryKeys'
import { toDepartmentFromResource } from '../../query/routineControlMappers'
import {
  departmentService,
  type DepartmentInput,
} from '../../services/departmentService'
import type { Department } from '../../types/domain'

export function useDepartmentMutations(scope: OrganizationQueryScope) {
  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: async (input: DepartmentInput): Promise<Department> => {
      const response = await departmentService.create(input)
      const department = toDepartmentFromResource(response.data)
      upsertDepartmentInOperationalContexts(queryClient, scope, department)
      return department
    },
  })

  return { createDepartment: createMutation.mutateAsync }
}
