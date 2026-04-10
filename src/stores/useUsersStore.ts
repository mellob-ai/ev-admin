import { create } from 'zustand';
import type { UserRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/usersService';

interface UsersState {
  users: UserRow[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (form: Record<string, unknown>, context?: Record<string, unknown>) => Promise<void>;
  updateUser: (user: Record<string, unknown>) => Promise<void>;
  deleteUser: (user: Record<string, unknown>) => Promise<void>;
  blockUser: (user: Record<string, unknown>, blocked: boolean) => Promise<void>;
  setUsers: (users: UserRow[]) => void;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const users = await api.listUsers();
      set({ users, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createUser: async (form, context = {}) => {
    await api.createUser(form, context);
    await get().fetchUsers();
  },

  updateUser: async (user) => {
    await api.updateUser(user);
    await get().fetchUsers();
  },

  deleteUser: async (user) => {
    await api.deleteUser(user);
    await get().fetchUsers();
  },

  blockUser: async (user, blocked) => {
    await api.setUserBlocked(user, blocked);
    await get().fetchUsers();
  },

  setUsers: (users) => set({ users }),
}));
