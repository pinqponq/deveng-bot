import { createContext, useContext, useEffect } from 'react'

// Uygulama tek koyu temada ('black') sabitlenmiştir. Tema değiştirici yoktur.
type ResolvedTheme = 'dark' | 'light' | 'black'

const RESOLVED_THEME: ResolvedTheme = 'black'

type ThemeProviderState = {
  resolvedTheme: ResolvedTheme
}

const ThemeContext = createContext<ThemeProviderState>({
  resolvedTheme: RESOLVED_THEME,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark', 'black')
    root.classList.add(RESOLVED_THEME)
  }, [])

  return (
    <ThemeContext value={{ resolvedTheme: RESOLVED_THEME }}>
      {children}
    </ThemeContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
