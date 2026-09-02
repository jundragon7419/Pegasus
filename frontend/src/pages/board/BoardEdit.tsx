import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useApiResource } from '@/hooks/useApiResource'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, api } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import { PIN_FOREVER } from '@/types/board'
import type { PollResponse, Post } from '@/types/board'

import { PostForm, type PostDraft } from './PostForm'
import styles from './PostForm.module.css'

/**
 * 글 수정. **소유자만 들어올 수 있다(§12-7).**
 *
 * 라우트 가드는 member+ 까지만 보므로 소유 여부는 여기서 확인하고, 아니면
 * 403 으로 보낸다. 그리고 이것은 화면 편의일 뿐 실제 차단은 서버가 한다.
 */
export default function BoardEdit() {
  const { id } = useParams()
  const postId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const handleError = useApiErrorHandler()

  const post = useApiResource<Post>(`/api/posts/${postId}`)
  const poll = useApiResource<PollResponse | null>(`/api/polls/post/${postId}`)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (draft: PostDraft) => {
    setSubmitting(true)
    setError(null)
    try {
      await api.put(`/api/posts/${postId}`, draft)
      navigate(ROUTES.boardDetail(postId), { replace: true })
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '저장하지 못했습니다.')
      }
      setSubmitting(false)
    }
  }

  if (post.error instanceof ApiError && post.error.status === 404) {
    return <Navigate to={ROUTES.error404} replace />
  }

  if (post.error) {
    return (
      <main className={styles.page}>
        <ErrorState error={post.error} what="게시글" onRetry={post.reload} />
      </main>
    )
  }

  // 투표는 없을 수 있지만, 있는지 없는지는 알아야 폼을 채울 수 있다
  if (post.loading || poll.loading || !post.data || !user) {
    return (
      <main className={styles.page}>
        <Skeleton height="2rem" width="40%" />
        <Skeleton height="12rem" />
      </main>
    )
  }

  if (post.data.userId !== user.id) {
    return <Navigate to={ROUTES.error403} replace />
  }

  const initial: PostDraft = {
    type: post.data.type,
    title: post.data.title,
    content: post.data.content,
    pinUntil: post.data.pinUntil === PIN_FOREVER ? 'infinite' : post.data.pinUntil,
    poll: poll.data
      ? {
          title: poll.data.poll.title,
          isMultiple: poll.data.poll.isMultiple,
          isAnonymous: poll.data.poll.isAnonymous,
          isPrivate: poll.data.poll.isPrivate,
          options: poll.data.options.map((option) => option.text),
        }
      : null,
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>글 수정</h1>
      <p className={styles.notice}>
        선택지 문구를 그대로 두면 이미 들어온 표가 유지됩니다. 문구를 바꾸거나 지우면 그
        선택지의 표는 사라집니다.
      </p>
      <PostForm
        role={user.authority}
        initial={initial}
        postId={postId}
        submitLabel="저장"
        submitting={submitting}
        error={error}
        onSubmit={submit}
      />
    </main>
  )
}
