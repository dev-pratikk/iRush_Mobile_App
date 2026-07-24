import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { redTheme, greyTheme, ThemeColors } from '../constants/Colors';

type Theme = 'red' | 'grey';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('grey');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'red' ? 'grey' : 'red'));
  };

  const colors = useMemo(() => {
    return theme === 'red' ? redTheme : greyTheme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeColors = (): ThemeColors => {
  return useTheme().colors;
};
