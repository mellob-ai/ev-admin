import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../services/subscriptionsService';
import type { SubscriptionRow } from '../../types/models';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  list: () => [...subscriptionKeys.all, 'list'] as const,
};

export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.list(),
    queryFn: () => listSubscriptions(),
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: Partial<SubscriptionRow>) => createSubscription(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: subscriptionKeys.all }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: Partial<SubscriptionRow>) => updateSubscription(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: subscriptionKeys.all }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: Partial<SubscriptionRow>) => deleteSubscription(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: subscriptionKeys.all }),
  });
}
