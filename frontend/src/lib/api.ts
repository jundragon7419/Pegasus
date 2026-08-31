/**
 * API 호출 계층. 블루프린트 §5 의 공통 규약을 구현한다.
 *
 * **이 모듈은 화면을 이동시키지 않는다.** 컴포넌트가 아니라 useNavigate 를 쓸 수 없고,
 * navigate 함수를 전역에 등록하면 테스트가 어려워지기 때문이다.
 * 대신 "어디로 가야 하는가"라는 정책만 errorRoute() 로 정하고,
 * 실제 이동은 hooks/useApiErrorHandler 가 맡는다.
 */

import { ROUTES } from '@/lib/routes'
import { getToken } from '@/lib/token'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'

/** 서버가 4xx·5xx 를 반환했을 때 던져지는 예외. status 를 보존한다. */
export class ApiError extends Error {
  status: number
  /** 서버가 내려준 응답 본문. { message } 가 표준이지만 그 외도 있을 수 있다 */
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** 네트워크 자체가 실패한 경우(서버 다운·오프라인). status 가 없다. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * status → 이동할 에러 화면. 정책만 정하고 이동은 하지 않는다.
 *
 * null 을 반환하면 **화면을 옮기지 말고 호출부가 인라인으로 처리하라**는 뜻이다.
 * 400(검증 실패)·409(중복)가 여기 해당한다 — 페이지를 갈아치우면 입력 내용을 잃는다.
 * 자세한 규칙은 docs/error-screens.md 참고.
 */
export function errorRoute(status: number): string | null {
  if (status === 401) return ROUTES.error401
  if (status === 403) return ROUTES.error403
  if (status === 404) return ROUTES.error404
  if (status >= 500) return ROUTES.error500
  return null
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** 언마운트·경로 변경 시 요청을 취소한다 */
  signal?: AbortSignal
  /** 토큰을 붙이지 않는다. 로그인·회원가입 등 */
  skipAuth?: boolean
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, skipAuth = false } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (!skipAuth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    // AbortError 는 정상적인 취소이므로 그대로 흘려보낸다.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new NetworkError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.')
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : '요청을 처리하지 못했습니다.'
    throw new ApiError(response.status, message, parsed)
  }

  return parsed as T
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
}
