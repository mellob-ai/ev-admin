import type { StationRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { LOCATIONS_PATCH } from '../patches/locationsPatch';

export async function listLocations(query: Record<string, string> = {}): Promise<StationRow[]> {
  const payload = await httpRequest({ method: 'GET', path: LOCATIONS_PATCH.endpoints.list, query });
  return LOCATIONS_PATCH.fromListPayload(payload);
}

export async function createLocation(station: Partial<StationRow>): Promise<unknown> {
  return httpRequest({ method: 'POST', path: LOCATIONS_PATCH.endpoints.create, body: LOCATIONS_PATCH.toPayload(station) });
}

export async function updateLocation(station: Partial<StationRow>): Promise<unknown> {
  const id = String(station.apiId || station.id || '');
  return httpRequest({ method: 'PUT', path: LOCATIONS_PATCH.endpoints.update(id), body: LOCATIONS_PATCH.toPayload(station) });
}

export async function deleteLocation(station: Partial<StationRow>): Promise<unknown> {
  const id = String(station.apiId || station.id || '');
  return httpRequest({ method: 'DELETE', path: LOCATIONS_PATCH.endpoints.remove(id) });
}
