/**
 * JWT 보관.
 *
 * 자동 로그인을 체크하면 localStorage(브라우저를 닫아도 유지),
 * 체크하지 않으면 sessionStorage(탭을 닫으면 소멸)에 넣는다.
 * 읽을 때는 두 곳을 모두 본다.
 */

const TOKEN_KEY = 'token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  } catch {
    // 저장소가 차단된 환경(사생활 보호 모드 등)
    return null
  }
}

export function setToken(token: string, remember: boolean): void {
  try {
    // 한쪽에만 남도록 반대편을 먼저 지운다.
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    ;(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
  } catch {
    // 저장에 실패해도 이번 세션 동안은 메모리상의 인증 상태로 동작한다.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // 무시
  }
}
