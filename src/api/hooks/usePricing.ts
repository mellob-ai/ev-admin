import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPricing, createPricing, updatePricing, deletePricing } from '../services/pricingService';
import type { PricingRow } from '../../types/models';

export const pricingKeys = {
  all: ['pricing'] as const,
  list: () => [...pricingKeys.all, 'list'] as const,
};

export function usePricing() {
  return useQuery({
    queryKey: pricingKeys.list(),
    queryFn: () => listPricing(),
  });
}

export function useCreatePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: Partial<PricingRow>) => createPricing(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: pricingKeys.all }),
  });
}

export function useUpdatePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: Partial<PricingRow>) => updatePricing(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: pricingKeys.all }),
  });
}

export function useDeletePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: Partial<PricingRow>) => deletePricing(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: pricingKeys.all }),
  });
}
