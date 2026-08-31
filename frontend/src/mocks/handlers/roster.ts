import { HttpResponse, http } from 'msw'

import { ACTIVE_ROSTER_YEAR, ROSTER_BY_YEAR, ROSTER_YEARS } from '@/mocks/fixtures/roster'
import { applyMockSwitches } from '@/mocks/switches'

/**
 * 블루프린트 §5.7. 전부 공개 조회다.
 * 경로를 `*` 로 시작해 API_BASE 의 origin 이 무엇이든 가로챈다.
 */
export const rosterHandlers = [
  http.get('*/api/roster/years', async () => {
    const override = await applyMockSwitches('roster')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(ROSTER_YEARS)
  }),

  http.get('*/api/roster/active-year', async () => {
    const override = await applyMockSwitches('roster')
    if (override && 'response' in override) return override.response
    return HttpResponse.json({ year: ACTIVE_ROSTER_YEAR })
  }),

  http.get('*/api/roster', async ({ request }) => {
    const override = await applyMockSwitches('roster')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])

    const yearParam = new URL(request.url).searchParams.get('year')
    const year = yearParam ? Number(yearParam) : ACTIVE_ROSTER_YEAR

    // 데이터가 없는 연도는 빈 배열이다. 404 가 아니다 —
    // "그 해에 명단이 없다"는 정상적인 결과이며 화면은 빈 상태를 보여준다.
    return HttpResponse.json(ROSTER_BY_YEAR[year] ?? [])
  }),
]
