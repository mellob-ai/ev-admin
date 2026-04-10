import type { ApiStation, StationRow } from '../../types/models';

function extractRows(payload: unknown): ApiStation[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiStation[];
  if (Array.isArray(p?.items)) return p!.items as ApiStation[];
  if (Array.isArray((p?.data as Record<string, unknown>)?.items)) return (p!.data as Record<string, unknown>).items as ApiStation[];
  return [];
}

export const LOCATIONS_PATCH = {
  endpoints: {
    list: '/v1/admin/stations',
    create: '/v1/admin/stations',
    get: (id: string) => `/v1/admin/stations/${encodeURIComponent(id)}`,
    update: (id: string) => `/v1/admin/stations/${encodeURIComponent(id)}`,
    remove: (id: string) => `/v1/admin/stations/${encodeURIComponent(id)}`,
  },

  fromListPayload(payload: unknown): StationRow[] {
    return extractRows(payload).map((raw) => this.fromApiStation(raw));
  },

  fromApiStation(raw: ApiStation): StationRow {
    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      name: raw.name || 'Unnamed Station',
      latitude: raw.location_latitude || '',
      longitude: raw.location_longitude || '',
      coordinates: `${raw.location_latitude || '0'},${raw.location_longitude || '0'}`,
      capacity: Number(raw.capacity || 0),
      currentCapacity: Number(raw.current_capacity || 0),
      subscriptionIds: raw.subscription_ids || {},
    };
  },

  toPayload(station: Partial<StationRow>): Record<string, unknown> {
    return {
      id: station.apiId || station.id || undefined,
      name: station.name,
      location_latitude: station.latitude || station.coordinates?.split(',')[0] || '0',
      location_longitude: station.longitude || station.coordinates?.split(',')[1] || '0',
      capacity: Number(station.capacity) || 0,
      current_capacity: Number(station.currentCapacity) || 0,
    };
  },
};
