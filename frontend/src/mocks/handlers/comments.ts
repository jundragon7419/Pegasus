import { HttpResponse, http } from 'msw'

import { requireRole } from '@/mocks/authGuard'
import {
  createComment,
  deleteComment,
  findComment,
  findPost,
  listComments,
  updateComment,
} from '@/mocks/boardState'
import { log } from '@/mocks/logState'
import { applyMockSwitches } from '@/mocks/switches'
import { canEditComment, canModifyResource } from '@/lib/roles'
import { validateComment } from '@/lib/validators'
import type { MockUser } from '@/mocks/authState'

/**
 * 블루프린트 §5.3.
 *
 * **조회부터 member+ 다(§12-1).** 구 API 는 무인증 공개라 게시글 본문과 함께
 * 댓글도 그대로 새어 나갔다.
 *
 * 수정은 소유자만, 삭제는 소유자 또는 manager+ 다. 게시글과 같은 규칙이며
 * 판정도 `lib/roles.ts` 의 같은 함수를 쓴다.
 */

const displayName = (user: MockUser) => (user.name ? `${user.username}(${user.name})` : user.username)

/** §8.1 의 comment 스냅샷. 원글 제목을 함께 담아 글이 지워져도 맥락이 남게 한다. */
const snapshotOf = (comment: { content: string; postId: number }) => ({
  content: comment.content,
  postId: comment.postId,
  postTitle: findPost(comment.postId)?.title ?? '(삭제된 게시글)',
})

const bad = (message: string) => HttpResponse.json({ message }, { status: 400 })
const notFound = () => HttpResponse.json({ message: '존재하지 않는 댓글입니다.' }, { status: 404 })
const forbidden = (message: string) => HttpResponse.json({ message }, { status: 403 })

export const commentHandlers = [
  http.get('*/api/comments', async ({ request }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const override = await applyMockSwitches('posts')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])

    const postId = Number(new URL(request.url).searchParams.get('postId'))
    if (!Number.isFinite(postId)) return bad('postId 가 필요합니다.')
    return HttpResponse.json(listComments(postId))
  }),

  http.post('*/api/comments', async ({ request }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const body = (await request.json()) as { postId?: number; content?: string }
    const postId = Number(body.postId)
    if (!findPost(postId)) {
      return HttpResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 })
    }

    const content = body.content ?? ''
    const check = validateComment(content)
    if (!check.valid) return bad(check.error)

    const comment = createComment({
      postId,
      userId: auth.user.id,
      author: displayName(auth.user),
      content: content.trim(),
    })
    log(auth.user, 'comment_create', 'comment', comment.id, snapshotOf(comment))

    return HttpResponse.json(comment, { status: 201 })
  }),

  http.put('*/api/comments/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const comment = findComment(Number(params.id))
    if (!comment) return notFound()

    // 수정은 소유자만. 매니저도 타인 댓글은 고칠 수 없다
    if (!canEditComment(auth.user, comment.userId)) {
      return forbidden('본인이 작성한 댓글만 수정할 수 있습니다.')
    }

    const body = (await request.json()) as { content?: string }
    const content = body.content ?? ''
    const check = validateComment(content)
    if (!check.valid) return bad(check.error)

    // 고치기 전에 떠 둔다(§12-7)
    const before = snapshotOf(comment)
    const updated = updateComment(comment.id, content.trim())
    log(auth.user, 'comment_update', 'comment', comment.id, { before, after: snapshotOf(comment) })

    return HttpResponse.json(updated)
  }),

  http.delete('*/api/comments/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const comment = findComment(Number(params.id))
    if (!comment) return notFound()

    if (!canModifyResource(auth.user, comment.userId)) {
      return forbidden('삭제할 권한이 없습니다.')
    }

    const snapshot = snapshotOf(comment)
    deleteComment(comment.id)
    log(auth.user, 'comment_delete', 'comment', comment.id, snapshot)

    return HttpResponse.json({ message: '삭제되었습니다.' })
  }),
]
