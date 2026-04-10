import type { ApiBike, VehicleRow } from '../../types/models';

function normalizedStatus(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  if (raw === 'maintenance') return 'Maintenance';
  if (raw === 'blocked' || raw === 'offline') return 'Offline';
  return 'Active';
}

function extractRows(payload: unknown): ApiBike[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiBike[];
  if (Array.isArray(p?.items)) return p!.items as ApiBike[];
  if (Array.isArray((p?.data as Record<string, unknown>)?.items)) return (p!.data as Record<string, unknown>).items as ApiBike[];
  return [];
}

export const VEHICLES_PATCH = {
  endpoints: {
    list: '/v1/admin/bikes',
    create: '/v1/admin/bikes',
    get: (id: string) => `/v1/admin/bikes/${encodeURIComponent(id)}`,
    update: '/v1/admin/bikes',
    remove: '/v1/admin/bikes',
    block: (id: string) => `/v1/admin/bikes/${encodeURIComponent(id)}/block`,
    unblock: (id: string) => `/v1/admin/bikes/${encodeURIComponent(id)}/unblock`,
  },

  fromListPayload(payload: unknown): VehicleRow[] {
    return extractRows(payload).map((row) => this.fromApiVehicle(row));
  },

  fromApiVehicle(raw: ApiBike): VehicleRow {
    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      qr: raw.frame_number || `FR-${raw.id || '000'}`,
      type: raw.bike_type || 'E-Bike',
      biz: 'General',
      org: 'Global Pool',
      location: raw.station_id || 'Unassigned',
      locationPin: '',
      status: normalizedStatus(raw.status),
      locked: false,
      seats: 1,
      name: raw.name || '',
      frameNumber: raw.frame_number || '',
      topSpeed: Number(raw.top_speed || 0),
      range: Number(raw.range || 0),
      timeToStation: Number(raw.time_to_station || 0),
      stationId: raw.station_id || '',
      images: Array.isArray(raw.images) ? raw.images : [],
    };
  },

  toCreatePayload(row: Partial<VehicleRow>): Record<string, unknown> {
    return {
      id: row.id || undefined,
      frame_number: row.frameNumber || row.qr || '',
      name: row.name || '',
      bike_type: row.type || 'ev',
      station_id: row.stationId || row.location || '',
      top_speed: Number(row.topSpeed) || 0,
      range: Number(row.range) || 0,
      time_to_station: Number(row.timeToStation) || 0,
      images: row.images || [],
    };
  },

  toUpdatePayload(row: Partial<VehicleRow>): Record<string, unknown> {
    return {
      ...this.toCreatePayload(row),
      id: row.apiId || row.id,
    };
  },

  toDeletePayload(row: Partial<VehicleRow>): Record<string, unknown> {
    return { id: row.apiId || row.id };
  },
};
