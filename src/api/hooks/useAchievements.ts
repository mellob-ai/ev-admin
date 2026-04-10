import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAchievements, createAchievement, updateAchievement, deleteAchievement } from '../services/achievementsService';
import type { AchievementRow } from '../../types/models';

export const achievementKeys = {
  all: ['achievements'] as const,
  list: () => [...achievementKeys.all, 'list'] as const,
};

export function useAchievements() {
  return useQuery({
    queryKey: achievementKeys.list(),
    queryFn: () => listAchievements(),
  });
}

export function useCreateAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Partial<AchievementRow>) => createAchievement(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: achievementKeys.all }),
  });
}

export function useUpdateAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Partial<AchievementRow>) => updateAchievement(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: achievementKeys.all }),
  });
}

export function useDeleteAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Partial<AchievementRow>) => deleteAchievement(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: achievementKeys.all }),
  });
}
