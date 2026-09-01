import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { api } from '@/lib/api'
import { clearToken, getToken, setToken } from '@/lib/token'
import type { LoginResponse, User } from '@/types/auth'

/**
 * 인증 상태.
 *
 * **부팅 시 토큰이 있으면 서버에 사용자 정보를 물어본다.**
 * 구 구현은 JWT 를 `atob` 로 디코드해 화면 분기에 썼는데(§2.3), 서명을 검증하지
 * 않는 값이라 "표시용"이라는 단서를 계속 달고 다녀야 했다. 서버에 한 번 물으면
 * 그 애매함이 사라지고, 권한 강등이나 차단이 즉시 반영된다.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => getToken() !== null)

  /** 토큰으로 현재 사용자를 확인한다. 토큰이 없거나 무효면 정리한다. */
  const loadUser = useCallback(async (signal?: AbortSignal) => {
    // 토큰이 없으면 초기 상태가 이미 (user: null, loading: false) 다.
    // 여기서 setState 를 부르면 효과 안의 동기 갱신이라 렌더가 한 번 더 돈다.
    if (!getToken()) return
    try {
      const me = await api.get<User>('/api/auth/me', { signal })
      setUser(me)
      setLoading(false)
    } catch (error) {
      // 요청이 취소된 것뿐이라면 아직 판정할 수 없다.
      // 여기서 loading 을 false 로 내리면 사용자가 없는 상태로 확정되어
      // ProtectedRoute 가 "비로그인" 으로 보고 /401 로 보내버린다.
      // finally 로 처리하면 return 해도 실행되므로 안 된다.
      if (error instanceof DOMException && error.name === 'AbortError') return

      // 만료·폐기된 토큰을 남겨두면 다음 요청도 같은 자리에서 실패한다
      clearToken()
      setUser(null)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // 서버에 사용자를 물어보는 것은 규칙 설명이 말하는 "외부 시스템과의 동기화"이며,
    // 상태 갱신은 전부 await 이후에 일어난다(효과 안의 동기 setState 가 아니다).
    // oxlint-disable-next-line react/set-state-in-effect
    void loadUser(controller.signal)
    return () => controller.abort()
  }, [loadUser])

  const login = useCallback(
    async (username: string, password: string, remember: boolean) => {
      // 실패하면 ApiError 가 그대로 올라간다. 화면이 인라인으로 처리한다
      const result = await api.post<LoginResponse>(
        '/api/auth/login',
        { username, password },
        { skipAuth: true },
      )
      setToken(result.token, remember)
      // 로그인 응답의 user 는 최소 정보다. 전체 프로필을 다시 받아 상태를 하나로 유지한다
      await loadUser()
    },
    [loadUser],
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const refresh = useCallback(() => loadUser(), [loadUser])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
