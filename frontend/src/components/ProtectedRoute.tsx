import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { useAuth } from '@/hooks/useAuth'
import { hasAtLeast } from '@/lib/roles'
import { RETURN_TO_PARAM, ROUTES } from '@/lib/routes'
import type { Role } from '@/types/auth'

type ProtectedRouteProps = {
  children: ReactNode
  /** 이 권한 이상이어야 한다. 생략하면 로그인만 확인한다 */
  minRole?: Role
}

/**
 * 라우트 가드. 도달 규칙은 `docs/error-screens.md` 2절에 정리되어 있다.
 *
 * **이것은 UX 장치일 뿐이다.** 실제 차단은 항상 서버가 해야 한다 —
 * 블루프린트 §12-1 · §12-2 는 구 사이트가 이 가드만 믿고 API 를 열어둔 탓에
 * 회원 전용 게시글과 활동 로그가 무인증으로 노출됐다고 지적한다.
 */
export function ProtectedRoute({ children, minRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // 확인이 끝나기 전에 그리면 로그인 화면이 번쩍였다 사라진다
  if (loading) return null

  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`${ROUTES.error401}?${RETURN_TO_PARAM}=${returnTo}`} replace />
  }

  if (minRole && !hasAtLeast(user.authority, minRole)) {
    return <Navigate to={ROUTES.error403} replace />
  }

  return <>{children}</>
}
