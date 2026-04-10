import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listLocations, createLocation, updateLocation, deleteLocation } from '../services/locationsService';
import type { StationRow } from '../../types/models';

export const locationKeys = {
  all: ['locations'] as const,
  list: () => [...locationKeys.all, 'list'] as const,
};

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.list(),
    queryFn: () => listLocations(),
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (station: Partial<StationRow>) => createLocation(station),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (station: Partial<StationRow>) => updateLocation(station),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (station: Partial<StationRow>) => deleteLocation(station),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  });
}
