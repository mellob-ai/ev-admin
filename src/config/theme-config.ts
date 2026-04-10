export const THEME_STORAGE_KEY = 'mjollnir-theme';

export const PALETTE = {
  white: '#FFFFFF',
  mint: '#E8F0ED',
  brand: '#00a877',
  black: '#0D1B25'
};

export const THEME_MODES = {
  dark: {
    '--bg-base': '#071311',
    '--bg-surface': 'rgba(10,22,21,0.76)',
    '--bg-card': 'rgba(18,33,31,0.68)',
    '--bg-hover': 'rgba(255,255,255,0.10)',
    '--border': 'rgba(255,255,255,0.18)',
    '--border-hi': 'rgba(255,255,255,0.28)',
    '--bg-elevated': 'rgba(30,47,45,0.78)',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#d7d7d7',
    '--text-1': '#ffffff',
    '--text-2': '#d7d7d7',
    '--text-3': '#bbbbbb',
    '--accent-gold': '#12c08b',
    '--accent-gold-2': '#43f0c1',
    '--accent-soft': 'rgba(0,168,119,0.20)',
    '--accent-ring': 'rgba(0,168,119,0.42)',
    '--accent-green': '#12c08b',
    '--bg-active': 'rgba(0,168,119,0.10)',
    '--border-brand': 'rgba(18,192,139,0.38)'
  },
  light: {
    '--bg-base': '#dfeae4',
    '--bg-surface': 'rgba(255,255,255,0.90)',
    '--bg-card': 'rgba(255,255,255,0.86)',
    '--bg-hover': 'rgba(232,239,235,0.92)',
    '--border': 'rgba(15,23,42,0.16)',
    '--border-hi': 'rgba(15,23,42,0.24)',
    '--bg-elevated': 'rgba(248,252,250,0.96)',
    '--text-primary': '#0a1620',
    '--text-secondary': '#22303b',
    '--text-1': '#0a1620',
    '--text-2': '#22303b',
    '--text-3': '#52606d',
    '--accent-gold': '#12c08b',
    '--accent-gold-2': '#43f0c1',
    '--accent-soft': 'rgba(0,168,119,0.16)',
    '--accent-ring': 'rgba(0,168,119,0.34)',
    '--accent-green': '#12c08b',
    '--bg-active': 'rgba(0,168,119,0.07)',
    '--border-brand': 'rgba(18,192,139,0.30)'
  }
};

export function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeVariables(theme) {
  const target = THEME_MODES[theme] ?? THEME_MODES.dark;
  const root = document.documentElement;

  Object.entries(target).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });
}
