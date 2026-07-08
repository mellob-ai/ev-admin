import type { VehicleRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { VEHICLES_PATCH } from '../patches/vehiclesPatch';

export async function listVehicles(query: Record<string, string> = {}): Promise<VehicleRow[]> {
  const payload = await httpRequest({ method: 'GET', path: VEHICLES_PATCH.endpoints.list, query });
  return VEHICLES_PATCH.fromListPayload(payload);
}

export async function createVehicle(row: Partial<VehicleRow>): Promise<VehicleRow | null> {
  const payload = await httpRequest({ method: 'POST', path: VEHICLES_PATCH.endpoints.create, body: VEHICLES_PATCH.toCreatePayload(row) });
  return VEHICLES_PATCH.fromApiResponse(payload);
}

export async function updateVehicle(row: Partial<VehicleRow>): Promise<VehicleRow | null> {
  const payload = await httpRequest({ method: 'PUT', path: VEHICLES_PATCH.endpoints.update, body: VEHICLES_PATCH.toUpdatePayload(row) });
  return VEHICLES_PATCH.fromApiResponse(payload);
}

// Backend DeleteBike reads the id from the query string (?id=...), not the body.
export async function deleteVehicle(idOrRow: string | Partial<VehicleRow>): Promise<unknown> {
  const id = typeof idOrRow === 'string'
    ? idOrRow
    : String(idOrRow?.apiId || idOrRow?.id || '');
  return httpRequest({ method: 'DELETE', path: VEHICLES_PATCH.endpoints.remove, query: { id } });
}

export async function lockVehicle(id: string): Promise<unknown> {
  return httpRequest({ method: 'POST', path: VEHICLES_PATCH.endpoints.block(id) });
}

export async function unlockVehicle(id: string): Promise<unknown> {
  return httpRequest({ method: 'POST', path: VEHICLES_PATCH.endpoints.unblock(id) });
}
