import { HttpResponse, http } from 'msw'

import { BATTING_RECORDS, PITCHING_RECORDS } from '@/mocks/fixtures/records'
import { applyMockSwitches } from '@/mocks/switches'

/**
 * 블루프린트 §5.11. 실제로는 외부 리그 API 를 프록시하고 wOBA·WAR 등을
 * 서버에서 계산해 `_` 접두 필드로 붙여 내려준다.
 *
 * 목에서는 계산을 재현하지 않는다 — 백엔드가 할 일이다. 대신 픽스처가
 * 안타·타수에서 타율·출루율·OPS 를 실제로 계산해 두어 화면에서 숫자가
 * 서로 어긋나지 않는다.
 */
export const recordHandlers = [
  http.get('*/api/records/batting', async () => {
    const override = await applyMockSwitches('records')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(BATTING_RECORDS)
  }),

  http.get('*/api/records/pitching', async () => {
    const override = await applyMockSwitches('records')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(PITCHING_RECORDS)
  }),
]
