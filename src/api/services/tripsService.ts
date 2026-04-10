import type { TripRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { TRIPS_PATCH } from '../patches/tripsPatch';

export async function listTrips(query: Record<string, string> = {}): Promise<TripRow[]> {
  const payload = await httpRequest({ method: 'GET', path: TRIPS_PATCH.endpoints.list, query });
  return TRIPS_PATCH.fromListPayload(payload);
}

export async function getTripSummary(tripId: string): Promise<TripRow> {
  const payload = await httpRequest({ method: 'GET', path: TRIPS_PATCH.endpoints.summary(tripId) });
  const row = (payload as Record<string, unknown>)?.data || payload;
  return TRIPS_PATCH.fromApiTrip(row as Parameters<typeof TRIPS_PATCH.fromApiTrip>[0]);
}

export async function getUserTrips(userId: string, query: Record<string, string> = {}): Promise<TripRow[]> {
  const payload = await httpRequest({ method: 'GET', path: TRIPS_PATCH.endpoints.userTrips(userId), query });
  return TRIPS_PATCH.fromListPayload(payload);
}

export async function getTripLocations(tripId: string): Promise<unknown[]> {
  const payload = await httpRequest({ method: 'GET', path: TRIPS_PATCH.endpoints.locations(tripId) });
  return ((payload as Record<string, unknown>)?.data || []) as unknown[];
}
