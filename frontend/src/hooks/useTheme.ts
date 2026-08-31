import { useContext } from 'react'

import { ThemeContext, type ThemeContextValue } from '@/context/theme-context'

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme 은 ThemeProvider 안에서만 사용할 수 있습니다.')
  }
  return context
}
