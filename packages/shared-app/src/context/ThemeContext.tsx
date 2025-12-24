import * as React from 'react';
import type { AppTheme } from '../theme';

interface ThemeContextValue {
  theme: AppTheme;
  otherAppUrl: string;
  idpUrl: string;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  theme: AppTheme;
  otherAppUrl: string;
  idpUrl: string;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, otherAppUrl, idpUrl, children }: ThemeProviderProps) {
  const value = React.useMemo(
    () => ({ theme, otherAppUrl, idpUrl }),
    [theme, otherAppUrl, idpUrl]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
