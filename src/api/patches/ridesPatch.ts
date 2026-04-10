import type { ApiTrip, RideRow } from '../../types/models';

function formatDateLabel(value: unknown): string {
  const dt = new Date(value as string || Date.now());
  if (Number.isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatTimeLabel(value: unknown): string {
  const dt = new Date(value as string || Date.now());
  if (Number.isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function durationLabel(durationMinutes: unknown): string {
  const mins = Math.round(Number(durationMinutes || 0));
  if (mins <= 0) return '0 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function extractRows(payload: unknown): ApiTrip[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiTrip[];
  if (Array.isArray(p?.items)) return p!.items as ApiTrip[];
  if (Array.isArray((p?.data as Record<string, unknown>)?.items)) return (p!.data as Record<string, unknown>).items as ApiTrip[];
  return [];
}

function titleStatus(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  if (raw === 'active' || raw === 'in_progress') return 'Active';
  if (raw === 'completed') return 'Completed';
  if (raw === 'cancelled') return 'Cancelled';
  return 'Completed';
}

export const RIDES_PATCH = {
  endpoints: {
    list: '/v1/admin/trips',
    userTrips: (userId: string) => `/v1/trips/user/${encodeURIComponent(userId)}`,
    summary: (tripId: string) => `/v1/trips/summary/${encodeURIComponent(tripId)}`,
    locations: (tripId: string) => `/v1/trips/${encodeURIComponent(tripId)}/locations`,
    forceEnd: (tripId: string) => `/v1/trips/end/${encodeURIComponent(tripId)}`,
  },

  fromListPayload(payload: unknown): RideRow[] {
    return extractRows(payload).map((raw) => this.fromApiRide(raw));
  },

  fromApiRide(raw: ApiTrip): RideRow {
    const start = raw.start_timestamp || '';
    const end = raw.end_timestamp || '';
    const distKm = Number(raw.distance || 0);

    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      user: raw.user_id || 'Unknown',
      vehicle: raw.bike_id || 'N/A',
      start: formatTimeLabel(start),
      duration: durationLabel(raw.duration),
      org: 'Global Pool',
      status: titleStatus(raw.status),
      rideDate: formatDateLabel(start),
      pickupLoc: raw.station_id || 'N/A',
      dropoffLoc: '',
      distance: `${distKm.toFixed(1)} km`,
      fare: '₹0',
      paymentMethod: raw.access_mode || 'subscription',
      startTime: formatTimeLabel(start),
      endTime: end ? formatTimeLabel(end) : '',
      estimatedEnd: '',
      temperature: '',
      co2Saved: `${Math.max(0.1, distKm * 0.3).toFixed(1)}kg`,
      rating: 0,
      vehicleType: 'E-Bike',
      licensePlate: '',
      driverName: '',
      driverRating: null,
      route: 'Direct Route',
      stops: 0,
      notes: '',
      feedback: '',
      averageSpeed: Number(raw.average_speed || 0),
      maxElevation: Number(raw.max_elevation || 0),
      kcal: Number(raw.kcal || 0),
      userId: raw.user_id || '',
      bikeId: raw.bike_id || '',
      stationId: raw.station_id || '',
      subscriptionId: raw.subscription_id || '',
    };
  },
};
