import { HttpResponse, http } from 'msw'

import { requireRole } from '@/mocks/authGuard'
import { findById } from '@/mocks/authState'
import { findPoll, findPost, pollResponse, vote } from '@/mocks/boardState'
import { log } from '@/mocks/logState'
import { applyMockSwitches } from '@/mocks/switches'

/**
 * 블루프린트 §5.4.
 *
 * **투표 생성·수정 엔드포인트가 없다.** 게시글 수정에 딸려 서버가 UPSERT 한다
 * (`PUT /api/posts/:id`). 구 구현은 클라이언트가 `DELETE 투표` → `PUT 글(INSERT)`
 * 순으로 두 번 불렀고, 그래서 옵션을 안 바꿔도 표가 전부 사라졌다(§12-8).
 *
 * **익명 투표는 선택 내용을 사용자와 묶지 않는다(§12-9).** 그 대가로 익명 투표는
 * 다시 던질 수 없다 — 서버가 이전 선택을 모르면 표를 깎을 수 없기 때문이다.
 */

const displayName = (userId: number) => {
  const user = findById(userId)
  if (!user) return '(탈퇴한 회원)'
  return user.name ? `${user.username}(${user.name})` : user.username
}

export const pollHandlers = [
  http.get('*/api/polls/post/:postId', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const override = await applyMockSwitches('posts')
    if (override && 'response' in override) return override.response

    const postId = Number(params.postId)
    if (!findPost(postId)) {
      return HttpResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 })
    }

    // 투표가 없는 글이 정상이다. 404 가 아니라 null 을 준다
    return HttpResponse.json(pollResponse(postId, auth.user, displayName))
  }),

  http.post('*/api/polls/:pollId/vote', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const poll = findPoll(Number(params.pollId))
    if (!poll) return HttpResponse.json({ message: '존재하지 않는 투표입니다.' }, { status: 404 })

    const body = (await request.json()) as { optionIds?: number[] }
    const optionIds = Array.isArray(body.optionIds) ? body.optionIds.map(Number) : []

    const result = vote(poll, auth.user.id, optionIds)

    if (result === 'invalid') {
      return HttpResponse.json({ message: '선택이 올바르지 않습니다.' }, { status: 400 })
    }
    if (result === 'anonymous-locked') {
      return HttpResponse.json(
        { message: '익명 투표는 다시 선택할 수 없습니다.' },
        { status: 409 },
      )
    }

    // **선택한 옵션을 담지 않는다.** 담으면 익명 투표의 선택이 감사 로그로
    // 그대로 새어 나가 §12-9 의 설계가 무의미해진다. 참여 사실까지만 남긴다.
    log(auth.user, 'vote_submit', 'poll', poll.id, {
      pollId: poll.id,
      pollTitle: poll.title,
      postId: poll.postId,
      postTitle: findPost(poll.postId)?.title ?? '(삭제된 게시글)',
    })

    return HttpResponse.json(pollResponse(poll.postId, auth.user, displayName))
  }),
]
