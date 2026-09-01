import { createContext } from 'react'

import type { User } from '@/types/auth'

export type AuthContextValue = {
  /** 로그인하지 않았으면 null */
  user: User | null
  /** 부팅 시 토큰으로 사용자를 확인하는 동안 true. 이때 화면을 그리면 깜빡인다 */
  loading: boolean
  /** 실패하면 ApiError 를 던진다. 화면이 그 자리에서 메시지를 보여준다 */
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
  /** 권한이 바뀐 뒤 최신 상태를 다시 받아온다 */
  refresh: () => Promise<void>
}

/** 컴포넌트 파일과 분리해 둔다 — 함께 export 하면 Fast Refresh 가 깨진다. */
export const AuthContext = createContext<AuthContextValue | null>(null)
