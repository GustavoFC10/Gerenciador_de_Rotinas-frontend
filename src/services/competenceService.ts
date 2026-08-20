import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'

export type CompetenceStatus =
  'draft' | 'open' | 'finalized' | 'closed' | 'locked'

export interface CompetenceProjection {
  id: string | null
  period: string
  status: CompetenceStatus | 'projected'
  persistence: 'projected' | 'persisted'
  version: number | null
  taskOccurrenceCount: number | null
  scheduleRevision: number
  warning: string | null
}

export interface CompetenceResource {
  id: string
  period: string
  status: CompetenceStatus
  version: number
  createdAt: string
  updatedAt: string
}

export class CompetenceService {
  constructor(private readonly client: HttpClient) {}

  getByPeriod(period: string): Promise<ApiResponse<CompetenceProjection>> {
    return this.client.get<CompetenceProjection>(byPeriodPath(period))
  }

  openByPeriod(
    period: string,
    etag?: string,
  ): Promise<ApiResponse<CompetenceResource>> {
    return this.client.post<CompetenceResource>(
      `${byPeriodPath(period)}open/`,
      {},
      etag ? { ifMatch: etag } : {},
    )
  }
}

export const competenceService = new CompetenceService(httpClient)

function byPeriodPath(period: string): string {
  return `/api/v1/competences/by-period/${encodeURIComponent(period)}/`
}
