import type { DashboardStats } from '../../types/models';

export const DASHBOARD_PATCH = {
  endpoints: {
    stats: '/v1/admin/dashboard/stats',
  },

  fromStatsPayload(payload: unknown): DashboardStats {
    const data = (payload as Record<string, unknown>)?.data as Record<string, unknown> || payload as Record<string, unknown> || {};
    return {
      totalUsers: Number(data.total_users || 0),
      totalTrips: Number(data.total_trips || 0),
      activeTrips: Number(data.active_trips || 0),
      completedTrips: Number(data.completed_trips || 0),
      totalDistanceKm: Number(data.total_distance_km || 0),
      totalDurationHrs: Number(data.total_duration_hrs || 0),
      totalVehicles: Number(data.total_vehicles || 0),
      totalStations: Number(data.total_stations || 0),
      totalGroups: Number(data.total_groups || 0),
      totalSubscriptions: Number(data.total_subscriptions || 0),
      totalOrganizations: Number(data.total_organizations || 0),
    };
  },
};
