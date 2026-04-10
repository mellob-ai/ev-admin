import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, createUser, updateUser, deleteUser, setUserBlocked, addUserCoins, addUserWalletBalance } from '../services/usersService';
import type { UserRow } from '../../types/models';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => listUsers(),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: Record<string, unknown>) => createUser(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user: Partial<UserRow>) => updateUser(user),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user: Partial<UserRow>) => deleteUser(user),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user, blocked }: { user: Record<string, unknown>; blocked: boolean }) => setUserBlocked(user, blocked),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useAddCoins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user, amount }: { user: Record<string, unknown>; amount: number }) => addUserCoins(user, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useAddWalletBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user, amount }: { user: Record<string, unknown>; amount: number }) => addUserWalletBalance(user, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}
