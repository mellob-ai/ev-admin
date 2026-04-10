import type { ApiTrip, TripRow } from '../../types/models';

function formatDate(value: unknown): string {
  const dt = new Date(value as string || Date.now());
  if (Number.isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatTime(value: unknown): string {
  const dt = new Date(value as string || Date.now());
  if (Number.isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function durationLabel(hours: unknown): string {
  const mins = Math.round(Number(hours || 0) * 60);
  if (mins <= 0) return '0 min';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function extractRows(payload: unknown): ApiTrip[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiTrip[];
  if (Array.isArray(p?.items)) return p!.items as ApiTrip[];
  return [];
}

export const TRIPS_PATCH = {
  endpoints: {
    list: '/v1/admin/trips',
    summary: (tripId: string) => `/v1/trips/summary/${encodeURIComponent(tripId)}`,
    userTrips: (userId: string) => `/v1/trips/user/${encodeURIComponent(userId)}`,
    locations: (tripId: string) => `/v1/trips/${encodeURIComponent(tripId)}/locations`,
  },

  fromListPayload(payload: unknown): TripRow[] {
    return extractRows(payload).map((raw) => this.fromApiTrip(raw));
  },

  fromApiTrip(raw: ApiTrip): TripRow {
    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      userId: raw.user_id || '',
      bikeId: raw.bike_id || '',
      stationId: raw.station_id || '',
      status: raw.status || 'completed',
      date: formatDate(raw.start_timestamp),
      startTime: formatTime(raw.start_timestamp),
      endTime: raw.end_timestamp ? formatTime(raw.end_timestamp) : '',
      duration: durationLabel(raw.duration),
      durationHrs: Number(raw.duration || 0),
      distance: `${Number(raw.distance || 0).toFixed(1)} km`,
      distanceKm: Number(raw.distance || 0),
      averageSpeed: Number(raw.average_speed || 0),
      maxElevation: Number(raw.max_elevation || 0),
      kcal: Number(raw.kcal || 0),
      accessMode: raw.access_mode || 'wallet',
      subscriptionId: raw.subscription_id || '',
    };
  },
};
