import { HttpResponse, http } from 'msw'

import { requireRole } from '@/mocks/authGuard'
import { findByUsername, toPublicUser } from '@/mocks/authState'
import { listCommentsByUser, listPostsByUser } from '@/mocks/boardState'
import { findLog, listLogs } from '@/mocks/logState'
import { canViewLogsOfUser } from '@/lib/roles'

/**
 * 블루프린트 §5.8 — 타 유저 활동 내역.
 *
 * **§12-2 가 §12 에서 가장 심각한 항목이다.** 구 API 는 이 라우터 전체에 인증이
 * 없었다. "열람자 권한 > 대상 권한" 규칙은 `UserActivity.jsx` 의 탭 표시 조건일
 * 뿐이어서, `curl` 한 번이면 **삭제된 게시글 본문과 승인·차단된 유저의 실명·학번이
 * 담긴 snapshot JSON 을 누구나** 읽을 수 있었다.
 *
 * 여기서는 서버가 `canViewLogsOfUser` 로 판정한다. 화면이 탭을 감추는 것은
 * 편의일 뿐이고, 차단은 이 파일이 한다.
 */

const DEFAULT_SIZE = 15

const notFound = () => HttpResponse.json({ message: '존재하지 않는 사용자입니다.' }, { status: 404 })
const forbidden = () =>
  HttpResponse.json({ message: '이 사용자의 활동 로그를 볼 권한이 없습니다.' }, { status: 403 })

const paging = (request: Request) => {
  const query = new URL(request.url).searchParams
  const page = Math.max(1, Number(query.get('page')) || 1)
  const size = Math.min(Math.max(1, Number(query.get('size')) || DEFAULT_SIZE), 50)
  return { page, size }
}

export const userHandlers = [
  /**
   * 프로필 요약. **member+ 다.**
   * §5.8 은 공개였지만 §12-1 로 게시글 본문을 member+ 로 옮긴 이상, 누가 무엇을
   * 썼는지 훑을 수 있는 이 화면만 공개로 두는 것은 앞뒤가 맞지 않는다.
   */
  http.get('*/api/users/:username', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const user = findByUsername(String(params.username))
    if (!user) return notFound()

    const profile = toPublicUser(user)
    // 열람자에게 필요한 것만 준다. 이메일·전화번호는 남에게 보여줄 이유가 없다
    return HttpResponse.json({
      id: profile.id,
      username: profile.username,
      name: profile.name,
      authority: profile.authority,
      staffType: profile.staffType,
      obYb: profile.obYb,
      isBanned: profile.isBanned,
      createdAt: profile.createdAt,
      /** 로그 탭을 그릴지 화면이 이걸로 정한다. 판정은 서버가 한 것이다 */
      canViewLogs: canViewLogsOfUser(auth.user, user),
    })
  }),

  http.get('*/api/users/:username/posts', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const user = findByUsername(String(params.username))
    if (!user) return notFound()

    const { page, size } = paging(request)
    return HttpResponse.json(listPostsByUser(user.id, page, size))
  }),

  http.get('*/api/users/:username/comments', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const user = findByUsername(String(params.username))
    if (!user) return notFound()

    const { page, size } = paging(request)
    return HttpResponse.json(listCommentsByUser(user.id, page, size))
  }),

  /**
   * 로그 상세. **`:id` 보다 먼저 등록해야 `/logs/:logId` 가 목록으로 잡히지 않는다.**
   *
   * §12-11 — 구 `LogDetail` 은 `location.state` 에만 의존해서 URL 을 직접 열거나
   * 새로고침하면 **항상** "로그 정보를 불러올 수 없습니다"가 떴다. URL 이 사실상
   * 무의미했다. id 로 조회할 수 있어야 링크를 공유하고 북마크할 수 있다.
   */
  http.get('*/api/users/:username/logs/:logId', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const user = findByUsername(String(params.username))
    if (!user) return notFound()
    if (!canViewLogsOfUser(auth.user, user)) return forbidden()

    const entry = findLog(Number(params.logId))
    // 다른 사람의 로그 id 를 끼워 넣어도 이 사용자의 것이 아니면 없는 것으로 본다
    if (!entry || entry.userId !== user.id) {
      return HttpResponse.json({ message: '존재하지 않는 로그입니다.' }, { status: 404 })
    }

    return HttpResponse.json(entry)
  }),

  http.get('*/api/users/:username/logs', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const user = findByUsername(String(params.username))
    if (!user) return notFound()

    // **여기가 §12-2 다.** 구 구현에는 이 검사가 아예 없었다
    if (!canViewLogsOfUser(auth.user, user)) return forbidden()

    const { page, size } = paging(request)
    return HttpResponse.json(listLogs({ userId: user.id, page, size }))
  }),
]
