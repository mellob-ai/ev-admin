import type { RideRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { RIDES_PATCH } from '../patches/ridesPatch';

export async function listRides(query: Record<string, string> = {}): Promise<RideRow[]> {
  const payload = await httpRequest({ method: 'GET', path: RIDES_PATCH.endpoints.list, query });
  return RIDES_PATCH.fromListPayload(payload);
}

export async function getUserTrips(userId: string, query: Record<string, string> = {}): Promise<RideRow[]> {
  const payload = await httpRequest({ method: 'GET', path: RIDES_PATCH.endpoints.userTrips(userId), query });
  return RIDES_PATCH.fromListPayload(payload);
}

export async function getRideSummary(tripId: string): Promise<RideRow> {
  const payload = await httpRequest({ method: 'GET', path: RIDES_PATCH.endpoints.summary(tripId) });
  const row = (payload as Record<string, unknown>)?.data || payload;
  return RIDES_PATCH.fromApiRide(row as Parameters<typeof RIDES_PATCH.fromApiRide>[0]);
}

export async function getRideLocations(tripId: string): Promise<unknown[]> {
  const payload = await httpRequest({ method: 'GET', path: RIDES_PATCH.endpoints.locations(tripId) });
  return ((payload as Record<string, unknown>)?.data || []) as unknown[];
}

export async function forceEndRide(tripId: string): Promise<unknown> {
  return httpRequest({ method: 'POST', path: RIDES_PATCH.endpoints.forceEnd(tripId) });
}
