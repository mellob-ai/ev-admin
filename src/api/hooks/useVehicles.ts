import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/vehiclesService';
import type { VehicleRow } from '../../types/models';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: () => [...vehicleKeys.all, 'list'] as const,
};

export function useVehicles() {
  return useQuery({
    queryKey: vehicleKeys.list(),
    queryFn: () => listVehicles(),
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Partial<VehicleRow>) => createVehicle(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Partial<VehicleRow>) => updateVehicle(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Partial<VehicleRow>) => deleteVehicle(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}
