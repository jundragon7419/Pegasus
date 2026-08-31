import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
  type ThemeContextValue,
} from '@/context/theme-context'

/**
 * index.html 의 인라인 스크립트가 이미 확정해 둔 값을 그대로 읽는다.
 * 여기서 localStorage 를 다시 판단하면 판정 지점이 둘로 늘어나 서로 어긋날 수 있다.
 */
function readInitialTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // 사생활 보호 모드나 저장소 차단 설정에서는 실패할 수 있다.
      // 테마 적용 자체는 위에서 이미 끝났으므로 무시해도 된다.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
