import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listStaff, createStaff, updateStaff, deleteStaff } from '../services/staffService';
import type { StaffRow } from '../../types/models';

export const staffKeys = {
  all: ['staff'] as const,
  list: () => [...staffKeys.all, 'list'] as const,
};

export function useStaff() {
  return useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => listStaff(),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staff: Partial<StaffRow>) => createStaff(staff),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staff: Partial<StaffRow>) => updateStaff(staff),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staff: Partial<StaffRow>) => deleteStaff(staff),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
