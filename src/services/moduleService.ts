import type {
  ModuleAccess,
  ModuleAccessInput,
  ModulePermissions,
} from '../types/modules'
import { HttpClient, httpClient } from './httpClient'

export class ModuleService {
  constructor(private readonly client: HttpClient) {}

  async permissions(signal?: AbortSignal): Promise<ModulePermissions> {
    return (
      await this.client.get<ModulePermissions>('/api/v1/module-permissions/', {
        signal,
      })
    ).data
  }

  async accesses(
    memberId: string,
    signal?: AbortSignal,
  ): Promise<ModuleAccess[]> {
    return (
      await this.client.get<ModuleAccess[]>(accessPath(memberId), { signal })
    ).data
  }

  async grant(
    memberId: string,
    input: ModuleAccessInput,
  ): Promise<ModuleAccess[]> {
    return (await this.client.put<ModuleAccess[]>(accessPath(memberId), input))
      .data
  }

  async revoke(
    memberId: string,
    input: Pick<ModuleAccessInput, 'module' | 'sector'>,
  ): Promise<void> {
    await this.client.request<void>(accessPath(memberId), {
      method: 'DELETE',
      json: input,
    })
  }
}

function accessPath(memberId: string): string {
  return `/api/v1/organization-members/${encodeURIComponent(memberId)}/module-accesses/`
}

export const moduleService = new ModuleService(httpClient)
