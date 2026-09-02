import { HttpResponse, http } from 'msw'

import { requireAuth, requireRole } from '@/mocks/authGuard'
import {
  adjacentPosts,
  createPost,
  deletePost,
  findPost,
  increaseViews,
  listPosts,
  recentPosts,
  updatePost,
  upsertPoll,
  type PollInput,
} from '@/mocks/boardState'
import { log } from '@/mocks/logState'
import { applyMockSwitches } from '@/mocks/switches'
import { canModifyResource, canUsePostType, resolvePinUntil } from '@/lib/roles'
import { MANAGER_POST_TYPES } from '@/types/board'
import type { PostType } from '@/types/board'
import type { MockUser } from '@/mocks/authState'

/**
 * 블루프린트 §5.2.
 *
 * **조회를 권한별로 셋으로 나눈다(§12-1).** 구 API 는 본문과 댓글이 무인증 공개라
 * 프론트 가드가 유일한 차단선이었고, `curl` 로 회원 전용 글을 전부 읽을 수 있었다.
 * 그런데 홈 위젯은 비로그인에게도 제목을 보여줘야 하므로 축약 응답을 따로 둔다.
 *
 * - `GET /api/posts/recent` 공개 · 제목·날짜·유형만
 * - `GET /api/posts`        basic+ · 목록(본문 없음)
 * - `GET /api/posts/:id`    member+ · 본문
 *
 * **수정은 소유자만, 삭제는 소유자 또는 manager+ 다(§12-7).** 구 구현은 매니저에게
 * 수정까지 열어 뒀는데, 그 경로가 투표 UPSERT 부재와 겹쳐 반드시 실패했다(§12-8).
 */

const POST_TYPES: PostType[] = ['notice', 'event', 'game', 'family_occasion', 'normal']
const DEFAULT_SIZE = 15

const bad = (message: string) => HttpResponse.json({ message }, { status: 400 })
const notFound = () => HttpResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 })
const forbidden = (message: string) => HttpResponse.json({ message }, { status: 403 })

const displayName = (user: MockUser) => (user.name ? `${user.username}(${user.name})` : user.username)

/** §8.1 의 post 스냅샷 필드. 본문 전체를 담아 삭제 후에도 내용을 복원할 수 있게 한다. */
const snapshotOf = (post: { type: PostType; title: string; content: string; pinUntil: string | null }) => ({
  type: post.type,
  title: post.title,
  content: post.content,
  pinUntil: post.pinUntil,
})

type PostBody = {
  type?: PostType
  title?: string
  content?: string
  pinUntil?: string | 'infinite' | null
  poll?: PollInput | null
}

type Normalized = { type: PostType; title: string; content: string; pinUntil: string | null; poll: PollInput | null }

/** 입력을 검증하고 서버 규칙을 적용한다. 문제가 있으면 사유 문자열을 돌려준다. */
function normalize(body: PostBody, user: MockUser): Normalized | string {
  const title = (body.title ?? '').trim()
  const content = (body.content ?? '').trim()
  const type = body.type

  if (!type || !POST_TYPES.includes(type)) return '게시글 유형이 올바르지 않습니다.'
  if (!title) return '제목을 입력해 주세요.'
  if (title.length > 200) return '제목은 200자를 넘을 수 없습니다.'
  if (!content) return '내용을 입력해 주세요.'

  // 유형별 권한을 서버가 판정한다. 클라이언트가 무엇을 보내든 여기서 걸린다
  if (!canUsePostType(user.authority, type)) {
    const managerOnly = (MANAGER_POST_TYPES as readonly string[]).includes(type)
    return managerOnly ? '이 유형은 매니저 이상만 작성할 수 있습니다.' : '글을 작성할 권한이 없습니다.'
  }

  const poll = normalizePoll(body.poll)
  if (typeof poll === 'string') return poll

  return {
    type,
    title,
    content,
    // 조건을 못 채우면 클라이언트가 뭘 보냈든 null 이 된다
    pinUntil: resolvePinUntil(type, body.pinUntil ?? null, user.authority),
    poll,
  }
}

function normalizePoll(poll: PollInput | null | undefined): PollInput | null | string {
  if (!poll) return null

  const title = (poll.title ?? '').trim()
  if (!title) return '투표 제목을 입력해 주세요.'

  const options = (poll.options ?? []).map((o) => o.trim()).filter(Boolean)
  if (options.length < 2) return '투표 선택지는 2개 이상이어야 합니다.'
  if (new Set(options).size !== options.length) return '중복된 선택지가 있습니다.'

  return {
    title,
    options,
    isMultiple: poll.isMultiple === true,
    isAnonymous: poll.isAnonymous === true,
    isPrivate: poll.isPrivate === true,
  }
}

export const postHandlers = [
  /* ── 조회 ─────────────────────────────────────────────────────────────── */

  // `:id` 보다 먼저 등록해야 id='recent' 로 잡히지 않는다
  http.get('*/api/posts/recent', async ({ request }) => {
    const override = await applyMockSwitches('posts')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])

    const raw = Number(new URL(request.url).searchParams.get('limit'))
    const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 20) : 8
    return HttpResponse.json(recentPosts(limit))
  }),

  http.get('*/api/posts/:id/adjacent', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const id = Number(params.id)
    if (!findPost(id)) return notFound()
    return HttpResponse.json(adjacentPosts(id))
  }),

  http.get('*/api/posts/:id', async ({ request, params }) => {
    // 본문은 member+ 만 읽는다. basic 은 목록까지만 볼 수 있다
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const override = await applyMockSwitches('posts')
    if (override && 'response' in override) return override.response

    const post = findPost(Number(params.id))
    if (!post) return notFound()

    increaseViews(post.id)
    return HttpResponse.json(post)
  }),

  http.get('*/api/posts', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response

    const override = await applyMockSwitches('posts')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json({ items: [], page: 1, size: DEFAULT_SIZE, total: 0 })

    const query = new URL(request.url).searchParams
    const page = Math.max(1, Number(query.get('page')) || 1)
    const rawSize = Number(query.get('size')) || DEFAULT_SIZE
    const size = Math.min(Math.max(1, rawSize), 50)

    return HttpResponse.json(listPosts(page, size))
  }),

  /* ── 쓰기 ─────────────────────────────────────────────────────────────── */

  http.post('*/api/posts', async ({ request }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const normalized = normalize((await request.json()) as PostBody, auth.user)
    if (typeof normalized === 'string') return bad(normalized)

    const post = createPost({
      userId: auth.user.id,
      author: displayName(auth.user),
      type: normalized.type,
      title: normalized.title,
      content: normalized.content,
      pinUntil: normalized.pinUntil,
    })
    upsertPoll(post.id, normalized.poll)

    log(auth.user, 'post_create', 'post', post.id, snapshotOf(post))

    return HttpResponse.json(post, { status: 201 })
  }),

  http.put('*/api/posts/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const post = findPost(Number(params.id))
    if (!post) return notFound()

    // 수정은 소유자만. 매니저도 타인 글은 고칠 수 없다(§12-7)
    if (post.userId !== auth.user.id) {
      return forbidden('본인이 작성한 글만 수정할 수 있습니다.')
    }

    const normalized = normalize((await request.json()) as PostBody, auth.user)
    if (typeof normalized === 'string') return bad(normalized)

    // 고치기 전에 떠 둔다. after 만 남기면 무엇이 바뀌었는지 알 수 없다(§12-7)
    const before = snapshotOf(post)

    const updated = updatePost(post.id, normalized)
    // 투표를 서버가 한 번에 처리한다. 옵션이 그대로면 표가 보존된다(§12-8)
    upsertPoll(post.id, normalized.poll)

    log(auth.user, 'post_update', 'post', post.id, { before, after: snapshotOf(post) })

    return HttpResponse.json(updated)
  }),

  http.delete('*/api/posts/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const post = findPost(Number(params.id))
    if (!post) return notFound()

    // 삭제는 소유자 또는 manager+ (운영상 필요하다)
    if (!canModifyResource(auth.user, post.userId)) {
      return forbidden('삭제할 권한이 없습니다.')
    }

    // 지우기 전에 떠 둔다
    const snapshot = snapshotOf(post)
    deletePost(post.id)
    log(auth.user, 'post_delete', 'post', post.id, snapshot)

    return HttpResponse.json({ message: '삭제되었습니다.' })
  }),
]
