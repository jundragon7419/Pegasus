import { HttpResponse, http } from 'msw'

import { POSTS } from '@/mocks/fixtures/posts'
import { applyMockSwitches } from '@/mocks/switches'

/**
 * 블루프린트 §5.2.
 *
 * 구 API 는 목록에 페이지네이션이 없어 전체 행을 매번 반환했다(§12-14).
 * 새 백엔드는 서버 사이드 페이지네이션을 넣을 예정이지만, 홈 위젯과 게시판
 * 목록을 만드는 지금 단계에서는 구 동작대로 전체를 반환한다.
 */
export const postHandlers = [
  http.get('*/api/posts', async () => {
    const override = await applyMockSwitches('posts')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(POSTS)
  }),
]
