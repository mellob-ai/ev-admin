import { useQuery } from '@tanstack/react-query';
import { listRides } from '../services/ridesService';

export const rideKeys = {
  all: ['rides'] as const,
  list: () => [...rideKeys.all, 'list'] as const,
};

export function useRides() {
  return useQuery({
    queryKey: rideKeys.list(),
    queryFn: () => listRides(),
  });
}
