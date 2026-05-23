import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, default to dark mode
    const stored = localStorage.getItem('apollo-theme');
    return (stored as Theme) || 'dark';
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('apollo-theme', theme);
    
    // Update CSS custom properties based on theme
    const root = document.documentElement;
    
    if (theme === 'dark') {
      // Dark mode colors (current design)
      root.style.setProperty('--bg-primary', '#0b111f');
      root.style.setProperty('--bg-secondary', '#1a2332');
      root.style.setProperty('--bg-card', '#1a2332');
      root.style.setProperty('--text-primary', '#f8fafc');
      root.style.setProperty('--text-secondary', '#cbd5e1');
      root.style.setProperty('--text-muted', 'rgba(248, 250, 252, 0.7)');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.5)');
      root.style.setProperty('--gold-gradient', 'linear-gradient(135deg, #ffd700 0%, #ffa500 50%, #ff8c00 100%)');
      root.style.setProperty('--gold-default', '#ffd700');
      root.style.setProperty('--gold-light', '#ffed4a');
    } else {
      // Light mode colors
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--text-primary', '#1e293b');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', 'rgba(30, 41, 59, 0.7)');
      root.style.setProperty('--border-color', 'rgba(30, 41, 59, 0.2)');
      root.style.setProperty('--gold-gradient', 'linear-gradient(135deg, #b8860b 0%, #daa520 50%, #cd853f 100%)');
      root.style.setProperty('--gold-default', '#b8860b');
      root.style.setProperty('--gold-light', '#daa520');
    }
    
    // Update body class for background
    document.body.className = theme === 'dark' ? 'bg-dark-blue' : 'bg-white';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}