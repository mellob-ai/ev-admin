import { create } from 'zustand';
import type { OrganizationRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/organizationsService';

interface OrganizationsState {
  organizations: OrganizationRow[];
  loading: boolean;
  error: string | null;
  fetchOrganizations: () => Promise<void>;
  createOrganization: (org: Partial<OrganizationRow>) => Promise<void>;
  updateOrganization: (org: Partial<OrganizationRow>) => Promise<void>;
  deleteOrganization: (org: Partial<OrganizationRow>) => Promise<void>;
  setOrganizations: (orgs: OrganizationRow[]) => void;
}

export const useOrganizationsStore = create<OrganizationsState>((set, get) => ({
  organizations: [],
  loading: false,
  error: null,

  fetchOrganizations: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const organizations = await api.listOrganizations();
      set({ organizations, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createOrganization: async (org) => { await api.createOrganization(org); await get().fetchOrganizations(); },
  updateOrganization: async (org) => { await api.updateOrganization(org); await get().fetchOrganizations(); },
  deleteOrganization: async (org) => { await api.deleteOrganization(org); await get().fetchOrganizations(); },
  setOrganizations: (orgs) => set({ organizations: orgs }),
}));
