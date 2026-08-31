/**
 * 목 서버 동작을 URL 쿼리로 조절한다.
 *
 * 화면마다 **로딩 · 빈 · 에러** 세 상태를 만들어야 하는데, 정상 응답만 오면
 * 나머지 둘을 눈으로 볼 방법이 없다. 아래 스위치로 강제로 만들어 확인한다.
 *
 *   ?mockDelay=2000        모든 응답을 2초 지연 (로딩 상태)
 *   ?mockEmpty=roster      해당 도메인을 빈 배열로 (빈 상태)
 *   ?mockFail=records      해당 도메인을 500 으로 (에러 상태)
 *   ?mockFail=records:404  상태 코드 지정
 *   ?mockEmpty=all         전부 비움
 *
 * 도메인 키: posts · roster · schedule · records
 */

export type MockDomain = 'posts' | 'roster' | 'schedule' | 'records'

function params(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

/** 기본 지연. 로딩 상태가 한 프레임 만에 지나가면 스켈레톤을 볼 수 없다. */
const DEFAULT_DELAY_MS = 350

export function mockDelayMs(): number {
  const raw = params().get('mockDelay')
  if (raw === null) return DEFAULT_DELAY_MS
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DELAY_MS
}

export function shouldBeEmpty(domain: MockDomain): boolean {
  const raw = params().get('mockEmpty')
  if (!raw) return false
  return raw === 'all' || raw.split(',').includes(domain)
}

/** 실패시킬 상태 코드. 실패시키지 않으면 null. */
export function failureStatus(domain: MockDomain): number | null {
  const raw = params().get('mockFail')
  if (!raw) return null
  for (const entry of raw.split(',')) {
    const [name, status] = entry.split(':')
    if (name === domain || name === 'all') {
      const parsed = Number(status)
      return Number.isFinite(parsed) && parsed >= 400 ? parsed : 500
    }
  }
  return null
}
