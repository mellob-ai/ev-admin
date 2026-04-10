import { useQuery } from '@tanstack/react-query';
import { listGroups } from '../services/groupsService';

export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
};

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: () => listGroups(),
  });
}
