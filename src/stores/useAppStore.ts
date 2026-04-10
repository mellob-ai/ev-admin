import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface AppState {
  activePage: string;
  themeMode: ThemeMode;
  isSidebarCollapsed: boolean;
  isMobileOpen: boolean;
  isSettingsDrawerOpen: boolean;
  isTopbarScrolled: boolean;
  searchQuery: string;

  setActivePage: (page: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;
  setIsSettingsDrawerOpen: (open: boolean) => void;
  setIsTopbarScrolled: (scrolled: boolean) => void;
  setSearchQuery: (query: string) => void;
  navigate: (page: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePage: 'dashboard',
  themeMode: 'dark',
  isSidebarCollapsed: false,
  isMobileOpen: false,
  isSettingsDrawerOpen: false,
  isTopbarScrolled: false,
  searchQuery: '',

  setActivePage: (page) => set({ activePage: page }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleTheme: () => set((s) => ({ themeMode: s.themeMode === 'dark' ? 'light' : 'dark' })),
  setIsSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setIsMobileOpen: (open) => set({ isMobileOpen: open }),
  toggleMobileOpen: () => set((s) => ({ isMobileOpen: !s.isMobileOpen })),
  setIsSettingsDrawerOpen: (open) => set({ isSettingsDrawerOpen: open }),
  setIsTopbarScrolled: (scrolled) => set({ isTopbarScrolled: scrolled }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  navigate: (page) => {
    set({ activePage: page, isSettingsDrawerOpen: false });
    if (window.matchMedia('(max-width: 900px)').matches) {
      set({ isMobileOpen: false });
    }
  },
}));
