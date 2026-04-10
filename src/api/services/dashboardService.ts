import type { DashboardStats } from '../../types/models';
import { httpRequest } from '../httpClient';
import { DASHBOARD_PATCH } from '../patches/dashboardPatch';

export async function getDashboardStats(): Promise<DashboardStats> {
  const payload = await httpRequest({ method: 'GET', path: DASHBOARD_PATCH.endpoints.stats });
  return DASHBOARD_PATCH.fromStatsPayload(payload);
}
