import { HttpResponse, delay } from 'msw'

import { failureStatus, mockDelayMs, shouldBeEmpty, type MockDomain } from './config'

/**
 * 모든 핸들러가 응답 전에 거치는 지점.
 * 지연을 넣고, 실패·빈 응답 스위치가 켜져 있으면 그대로 반영한다.
 *
 * 반환값:
 * - `{ response }` 이 응답을 그대로 내보낸다 (실패 주입)
 * - `{ empty: true }` 빈 결과를 내보낸다
 * - `null` 정상 응답을 만들면 된다
 *
 * `handlers/index.ts` 에 두면 각 핸들러와 순환 참조가 되므로 별도 모듈로 분리했다.
 */
export async function applyMockSwitches(
  domain: MockDomain,
): Promise<{ response: Response } | { empty: true } | null> {
  await delay(mockDelayMs())

  const status = failureStatus(domain)
  if (status !== null) {
    return {
      response: HttpResponse.json(
        // 숫자 뒤에는 조사를 붙이지 않는다 — `withParticle` 은 받침을 한글로만 판단하므로
        // "500를" 가 된다. 숫자 읽는 법 표를 만드는 대신 조사가 없는 문장을 쓴다
        { message: `목 서버가 의도적으로 ${status} 상태로 응답했습니다. (?mockFail)` },
        { status },
      ),
    }
  }

  if (shouldBeEmpty(domain)) return { empty: true }
  return null
}
