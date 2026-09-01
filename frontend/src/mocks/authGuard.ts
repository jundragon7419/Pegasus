import { HttpResponse } from 'msw'

import { userForToken, type MockUser } from '@/mocks/authState'
import { hasAtLeast } from '@/lib/roles'
import type { Role } from '@/types/auth'

/**
 * 목 서버의 인증·권한 검사.
 *
 * **판정에 `lib/roles.ts` 의 `hasAtLeast` 를 그대로 쓴다.** 프론트와 목이 같은
 * 함수를 쓰면 두 판정이 어긋날 수 없다. 백엔드도 이 파일을 import 하게 된다.
 *
 * 블루프린트 §12-1 · §12-2 는 구 사이트가 프론트 가드만 믿고 API 를 열어둔 것을
 * 결함으로 지적한다. 목이 401/403 을 **실제로 반환**해야 그 실수를 반복하지 않는다.
 */

export type AuthResult = { user: MockUser } | { response: Response }

const unauthorized = () =>
  HttpResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })

const forbidden = (message = '권한이 없습니다.') =>
  HttpResponse.json({ message }, { status: 403 })

function tokenFrom(request: Request): string | null {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

/**
 * 로그인 여부만 확인한다.
 *
 * 차단된 계정은 여기서 걸러낸다 — 구 `optionalAuth` 는 차단 여부를 보지 않아
 * 차단 계정이 식별된 사용자로 취급됐다(§12-4).
 */
export function requireAuth(request: Request): AuthResult {
  const user = userForToken(tokenFrom(request))
  if (!user) return { response: unauthorized() }
  if (user.isBanned) {
    return { response: forbidden('차단된 계정입니다. 관리자에게 문의해 주세요.') }
  }
  return { user }
}

/** 로그인 + 최소 권한을 확인한다. */
export function requireRole(request: Request, min: Role): AuthResult {
  const result = requireAuth(request)
  if ('response' in result) return result
  if (!hasAtLeast(result.user.authority, min)) return { response: forbidden() }
  return result
}

/** 로그인했으면 사용자를, 아니면 null 을 준다. 거절하지 않는다. */
export function optionalAuth(request: Request): MockUser | null {
  const user = userForToken(tokenFrom(request))
  if (!user || user.isBanned) return null
  return user
}
