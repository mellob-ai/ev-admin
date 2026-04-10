import type { VehicleRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { VEHICLES_PATCH } from '../patches/vehiclesPatch';

export async function listVehicles(query: Record<string, string> = {}): Promise<VehicleRow[]> {
  const payload = await httpRequest({ method: 'GET', path: VEHICLES_PATCH.endpoints.list, query });
  return VEHICLES_PATCH.fromListPayload(payload);
}

export async function createVehicle(row: Partial<VehicleRow>): Promise<unknown> {
  return httpRequest({ method: 'POST', path: VEHICLES_PATCH.endpoints.create, body: VEHICLES_PATCH.toCreatePayload(row) });
}

export async function updateVehicle(row: Partial<VehicleRow>): Promise<unknown> {
  return httpRequest({ method: 'PUT', path: VEHICLES_PATCH.endpoints.update, body: VEHICLES_PATCH.toUpdatePayload(row) });
}

export async function deleteVehicle(row: Partial<VehicleRow>): Promise<unknown> {
  return httpRequest({ method: 'DELETE', path: VEHICLES_PATCH.endpoints.remove, body: VEHICLES_PATCH.toDeletePayload(row) });
}

export async function lockVehicle(id: string): Promise<unknown> {
  return httpRequest({ method: 'POST', path: VEHICLES_PATCH.endpoints.block(id) });
}

export async function unlockVehicle(id: string): Promise<unknown> {
  return httpRequest({ method: 'POST', path: VEHICLES_PATCH.endpoints.unblock(id) });
}
