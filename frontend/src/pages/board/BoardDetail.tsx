import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ChevronLeftIcon, ChevronRightIcon, EyeOpenIcon } from '@radix-ui/react-icons'

import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { ContentRenderer } from '@/components/ContentRenderer'
import { PollVote } from '@/components/PollVote'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useApiResource } from '@/hooks/useApiResource'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, api } from '@/lib/api'
import { POST_TYPE_LABEL } from '@/lib/labels'
import { canModifyResource } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import type { AdjacentPosts, PollResponse, Post } from '@/types/board'

import { CommentSection } from './CommentSection'
import styles from './BoardDetail.module.css'

/**
 * 게시글 본문. 블루프린트 §6.3.
 *
 * **수정은 소유자만, 삭제는 소유자 또는 manager+ 다(§12-7).** 여기서 버튼을
 * 감추는 것은 편의일 뿐이고 실제 차단은 서버가 한다 — 목이 403 을 실제로 낸다.
 */
export default function BoardDetail() {
  const { id } = useParams()
  const postId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const handleError = useApiErrorHandler()

  const post = useApiResource<Post>(`/api/posts/${postId}`)
  const adjacent = useApiResource<AdjacentPosts>(`/api/posts/${postId}/adjacent`)
  const poll = useApiResource<PollResponse | null>(`/api/polls/post/${postId}`)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)

  const isOwner = post.data !== null && post.data.userId === user?.id
  const canDelete = post.data !== null && canModifyResource(user, post.data.userId)

  const remove = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/api/posts/${postId}`)
      navigate(ROUTES.board, { replace: true })
    } catch (error) {
      if (!handleError(error)) {
        setDeleteError(error instanceof ApiError ? error.message : '삭제하지 못했습니다.')
      }
      setDeleting(false)
    }
  }

  const vote = async (optionIds: number[]) => {
    setVoteError(null)
    try {
      await api.post(`/api/polls/${poll.data?.poll.id}/vote`, { optionIds })
      poll.reload()
    } catch (error) {
      // 익명 재투표(409)와 잘못된 선택(400)은 화면을 옮기지 않고 그 자리에 알린다
      if (!handleError(error)) {
        setVoteError(error instanceof ApiError ? error.message : '투표하지 못했습니다.')
      }
    }
  }

  // 글 하나가 화면의 전부다. 없으면 그 자리에 오류를 그릴 게 아니라 404 로 보낸다
  // (위젯 실패를 인라인으로 처리하는 것과 다른 경우다 — docs/error-screens.md 2절)
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

  if (post.loading || !post.data) {
    return (
      <main className={styles.page}>
        <Skeleton height="2rem" width="60%" />
        <div className={styles.skeletonBody}>
          <Skeleton height="1rem" />
          <Skeleton height="1rem" />
          <Skeleton height="1rem" width="70%" />
        </div>
      </main>
    )
  }

  const data = post.data

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <span className={styles.type}>{POST_TYPE_LABEL[data.type]}</span>
        <h1 className={styles.title}>{data.title}</h1>

        <div className={styles.meta}>
          <span className={styles.author}>{data.author}</span>
          <span>{data.date}</span>
          <span className={styles.views}>
            <EyeOpenIcon />
            {data.views}
          </span>
        </div>
      </header>

      <article className={styles.body}>
        <ContentRenderer content={data.content} />
      </article>

      {poll.data && (
        <div className={styles.poll}>
          <PollVote data={poll.data} onVote={vote} error={voteError} />
        </div>
      )}

      <div className={styles.actions}>
        <Button asChild variant="ghost" size="sm">
          <Link to={ROUTES.board}>목록</Link>
        </Button>

        <div className={styles.ownerActions}>
          {/* 수정은 소유자만. 매니저도 타인 글은 고칠 수 없다 */}
          {isOwner && (
            <Button asChild variant="secondary" size="sm">
              <Link to={ROUTES.boardEdit(data.id)}>수정</Link>
            </Button>
          )}
          {canDelete && (
            <Button variant="negative" size="sm" onClick={() => setConfirmOpen(true)}>
              삭제
            </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <p className={styles.error} role="alert">
          {deleteError}
        </p>
      )}

      <AdjacentNav data={adjacent.data} />

      <CommentSection postId={postId} />

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="게시글을 삭제할까요?"
        description={
          isOwner
            ? '삭제한 글은 되돌릴 수 없습니다. 댓글과 투표도 함께 사라집니다.'
            : // 타인 글을 지우는 것은 관리 행위다. 기록된다는 사실을 미리 알린다
              '다른 사람이 작성한 글입니다.\n삭제한 글은 되돌릴 수 없으며, 이 행동은 로그에 기록됩니다.'
        }
        confirmLabel="삭제"
        loading={deleting}
        onConfirm={remove}
      />
    </main>
  )
}

function AdjacentNav({ data }: { data: AdjacentPosts | null }) {
  if (!data || (!data.prev && !data.next)) return null

  return (
    <nav className={styles.adjacent} aria-label="이전 다음 글">
      {data.prev ? (
        <Link to={ROUTES.boardDetail(data.prev.id)} className={styles.adjacentLink}>
          <ChevronLeftIcon />
          <span className={styles.adjacentLabel}>이전 글</span>
          <span className={styles.adjacentTitle}>{data.prev.title}</span>
        </Link>
      ) : (
        <span />
      )}

      {data.next && (
        <Link to={ROUTES.boardDetail(data.next.id)} className={styles.adjacentNext}>
          <span className={styles.adjacentLabel}>다음 글</span>
          <span className={styles.adjacentTitle}>{data.next.title}</span>
          <ChevronRightIcon />
        </Link>
      )}
    </nav>
  )
}
