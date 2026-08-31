import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/**
 * 컨텍스트 객체를 컴포넌트 파일과 분리해 둔다.
 * 한 파일이 컴포넌트와 컴포넌트 아닌 것을 함께 export 하면 Fast Refresh 가 깨진다.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null)

export const THEME_STORAGE_KEY = 'theme'
