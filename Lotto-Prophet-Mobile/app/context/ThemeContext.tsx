import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ─── Color palettes ──────────────────────────────────────────────────

export const LightColors = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  accent: '#FF6B6B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F8F9FE',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F8F9FE',
};

export const DarkColors = {
  primary: '#8B83FF',
  primaryDark: '#6C63FF',
  accent: '#FF6B6B',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  background: '#0F1117',
  card: '#1A1D2E',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#2D3348',
  inputBg: '#1E2233',
};

export type AppColors = typeof LightColors;

// ─── Context ─────────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColors;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = 'theme_mode';

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  isDark: false,
  colors: LightColors,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(STORAGE_KEY, m).catch(() => {});
  };

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  if (!loaded) return null; // prevent flash

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Placeholder default export so Expo Router ignores this file
export default function _ThemeContextRoute() {
  return null;
}
