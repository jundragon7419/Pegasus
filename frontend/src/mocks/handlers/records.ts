import { HttpResponse, http } from 'msw'

import { BATTING_RECORDS, PITCHING_RECORDS } from '@/mocks/fixtures/records'
import { getActiveYear, listRoster } from '@/mocks/rosterState'
import { applyMockSwitches } from '@/mocks/switches'
import { buildNumberMap, numberOf } from '@/lib/rosterNumber'
import type { BattingRecord, PitchingRecord } from '@/types/records'

/**
 * 블루프린트 §5.11. 실제로는 외부 리그 API 를 프록시하고 wOBA·WAR 등을
 * 서버에서 계산해 `_` 접두 필드로 붙여 내려준다.
 *
 * 목에서는 계산을 재현하지 않는다 — 백엔드가 할 일이다. 대신 픽스처가
 * 안타·타수에서 타율·출루율·OPS 를 실제로 계산해 두어 화면에서 숫자가
 * 서로 어긋나지 않는다.
 *
 * **등번호는 서버가 붙인다(§12-17).** 외부 API 는 이름만 주므로 활성 연도
 * 로스터를 이름으로 뒤지는데, **동명이인이면 붙이지 않는다** — 구 구현은
 * 먼저 찾은 사람의 번호를 그냥 찍어서 화면에 남의 등번호가 나왔다.
 * 판정은 `lib/rosterNumber.ts` 가 하고 백엔드도 같은 함수를 쓴다.
 */

function withNumbers<T extends { user: { name: string }; _number: string | null }>(
  records: readonly T[],
): T[] {
  // 활성 연도 명단이 기준이다(§7.6). 관리자가 연도를 바꾸면 여기도 따라간다
  const map = buildNumberMap(listRoster(getActiveYear()))
  return records.map((record) => ({ ...record, _number: numberOf(map, record.user.name) }))
}

export const recordHandlers = [
  http.get('*/api/records/batting', async () => {
    const override = await applyMockSwitches('records')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(withNumbers<BattingRecord>(BATTING_RECORDS))
  }),

  http.get('*/api/records/pitching', async () => {
    const override = await applyMockSwitches('records')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(withNumbers<PitchingRecord>(PITCHING_RECORDS))
  }),
]
