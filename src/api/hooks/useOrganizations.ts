import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listOrganizations, createOrganization, updateOrganization, deleteOrganization } from '../services/organizationsService';
import type { OrganizationRow } from '../../types/models';

export const organizationKeys = {
  all: ['organizations'] as const,
  list: () => [...organizationKeys.all, 'list'] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: () => listOrganizations(),
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (org: Partial<OrganizationRow>) => createOrganization(org),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (org: Partial<OrganizationRow>) => updateOrganization(org),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (org: Partial<OrganizationRow>) => deleteOrganization(org),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}
