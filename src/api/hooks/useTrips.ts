import { useQuery } from '@tanstack/react-query';
import { listTrips } from '../services/tripsService';

export const tripKeys = {
  all: ['trips'] as const,
  list: () => [...tripKeys.all, 'list'] as const,
};

export function useTrips() {
  return useQuery({
    queryKey: tripKeys.list(),
    queryFn: () => listTrips(),
  });
}
