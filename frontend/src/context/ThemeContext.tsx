import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AgriTheme = 'farm-green' | 'harvest-gold' | 'earth-natural' | 'night-farm';

export interface ThemeOption {
  id: AgriTheme;
  labelKey: string;
  defaultLabel: string;
  emoji: string;
  accentColor: string;
  descriptionKey: string;
  defaultDesc: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'farm-green',
    labelKey: 'themes.farm_green',
    defaultLabel: 'Farm Green',
    emoji: '🌿',
    accentColor: '#183D2B',
    descriptionKey: 'themes.farm_green_desc',
    defaultDesc: 'Lush crops, organic & fresh fields',
  },
  {
    id: 'harvest-gold',
    labelKey: 'themes.harvest_gold',
    defaultLabel: 'Harvest Gold',
    emoji: '🌾',
    accentColor: '#B87A04',
    descriptionKey: 'themes.harvest_gold_desc',
    defaultDesc: 'Ripe wheat & mustard, golden prosperity',
  },
  {
    id: 'earth-natural',
    labelKey: 'themes.earth_natural',
    defaultLabel: 'Earth Natural',
    emoji: '🪵',
    accentColor: '#4E342E',
    descriptionKey: 'themes.earth_natural_desc',
    defaultDesc: 'Rich fertile soil & natural clay',
  },
  {
    id: 'night-farm',
    labelKey: 'themes.night_farm',
    defaultLabel: 'Night Farm',
    emoji: '🌙',
    accentColor: '#10B981',
    descriptionKey: 'themes.night_farm_desc',
    defaultDesc: 'High contrast night mode for field monitoring',
  },
];

interface ThemeContextType {
  theme: AgriTheme;
  setTheme: (theme: AgriTheme) => void;
  cycleTheme: () => void;
  themeOptions: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'kisaniq_agri_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AgriTheme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as AgriTheme;
      if (stored && ['farm-green', 'harvest-gold', 'earth-natural', 'night-farm'].includes(stored)) {
        return stored;
      }
    } catch {
      // Ignore storage errors
    }
    return 'farm-green';
  });

  const setTheme = (newTheme: AgriTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors
    }
  };

  const cycleTheme = () => {
    const order: AgriTheme[] = ['farm-green', 'harvest-gold', 'earth-natural', 'night-farm'];
    const idx = order.indexOf(theme);
    const nextTheme = order[(idx + 1) % order.length];
    setTheme(nextTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'night-farm') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themeOptions: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
