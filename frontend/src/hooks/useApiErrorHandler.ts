import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { ApiError, NetworkError, errorRoute } from '@/lib/api'
import { RETURN_TO_PARAM, ROUTES } from '@/lib/routes'
import { clearToken } from '@/lib/token'

/**
 * API 예외를 에러 화면으로 옮긴다. 정책(errorRoute)의 실행부다.
 *
 * 반환값이 곧 계약이다:
 * - `true`  이동을 처리했다. 호출부는 더 할 일이 없다
 * - `false` **화면을 옮기지 않았다.** 호출부가 인라인으로 표시해야 한다
 *   (400 검증 실패, 409 중복, 로그인 실패 등 — docs/error-screens.md 3절)
 */
export function useApiErrorHandler() {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(
    (error: unknown): boolean => {
      // 요청 취소는 오류가 아니다.
      if (error instanceof DOMException && error.name === 'AbortError') return true

      if (error instanceof NetworkError) {
        navigate(ROUTES.error500)
        return true
      }

      if (!(error instanceof ApiError)) {
        // 예상 못 한 예외. 삼키지 말고 500 으로 보낸다.
        console.error('처리되지 않은 예외입니다.', error)
        navigate(ROUTES.error500)
        return true
      }

      const route = errorRoute(error.status)
      if (!route) return false

      if (error.status === 401) {
        // 만료된 토큰을 그대로 두면 다음 요청도 같은 자리에서 실패한다.
        clearToken()
        const returnTo = encodeURIComponent(location.pathname + location.search)
        navigate(`${route}?${RETURN_TO_PARAM}=${returnTo}`)
        return true
      }

      navigate(route)
      return true
    },
    [navigate, location],
  )
}
