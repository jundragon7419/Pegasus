import { HttpResponse, http } from 'msw'

import { getActiveYear, listRoster, listYears } from '@/mocks/rosterState'
import { applyMockSwitches } from '@/mocks/switches'

/**
 * 블루프린트 §5.7. 전부 공개 조회다.
 * 경로를 `*` 로 시작해 API_BASE 의 origin 이 무엇이든 가로챈다.
 *
 * 데이터는 `rosterState` 에서 온다 — 관리자가 편집한 결과가 이 화면에 바로
 * 반영되어야 하기 때문이다(정적 픽스처를 반환하면 편집이 반영되지 않는다).
 */
export const rosterHandlers = [
  http.get('*/api/roster/years', async () => {
    const override = await applyMockSwitches('roster')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(listYears())
  }),

  http.get('*/api/roster/active-year', async () => {
    const override = await applyMockSwitches('roster')
    if (override && 'response' in override) return override.response
    return HttpResponse.json({ year: getActiveYear() })
  }),

  http.get('*/api/roster', async ({ request }) => {
    const override = await applyMockSwitches('roster')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])

    const yearParam = new URL(request.url).searchParams.get('year')
    const year = yearParam ? Number(yearParam) : getActiveYear()

    // 데이터가 없는 연도는 빈 배열이다. 404 가 아니다 —
    // "그 해에 명단이 없다"는 정상적인 결과이며 화면은 빈 상태를 보여준다.
    return HttpResponse.json(listRoster(year))
  }),
]
