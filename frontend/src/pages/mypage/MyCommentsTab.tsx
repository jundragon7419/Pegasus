import { useState } from 'react'
import { Link } from 'react-router'

import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { POST_TYPE_LABEL } from '@/lib/labels'
import { pageCount } from '@/lib/pagination'
import { ROUTES } from '@/lib/routes'
import type { Comment, PostType } from '@/types/board'

import styles from './MyPage.module.css'

const PAGE_SIZE = 15

/** 원글 정보를 붙여 내려준다(§5.9) — 댓글만 보여주면 어느 글인지 알 수 없다. */
type MyComment = Comment & { postTitle: string; postType: PostType | null }

type PagedComments = {
  items: MyComment[]
  page: number
  size: number
  total: number
}

export function MyCommentsTab({ active }: { active: boolean }) {
  const [page, setPage] = useState(1)
  const comments = useApiResource<PagedComments>(
    active ? `/api/mypage/comments?page=${page}&size=${PAGE_SIZE}` : null,
  )

  if (comments.error) {
    return <ErrorState error={comments.error} what="내 댓글" onRetry={comments.reload} />
  }

  if (comments.loading || !comments.data) {
    return (
      <div className={styles.panel}>
        <Skeleton height="10rem" />
      </div>
    )
  }

  if (comments.data.items.length === 0) {
    return (
      <div className={styles.panel}>
        <EmptyState title="아직 남긴 댓글이 없습니다" description="게시글에서 의견을 남겨 보세요." />
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {comments.data.items.map((comment) => (
          <Link
            key={comment.id}
            to={ROUTES.boardDetail(comment.postId)}
            className={styles.item}
          >
            <span className={styles.itemType}>
              {comment.postType ? POST_TYPE_LABEL[comment.postType] : '삭제'}
            </span>
            <span className={styles.itemTitle}>
              {comment.content}
              <span className={styles.commentSource}> · {comment.postTitle}</span>
            </span>
            <span className={styles.itemDate}>{comment.createdAt.slice(2, 10)}</span>
          </Link>
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={pageCount(comments.data.total, PAGE_SIZE)}
        onChange={setPage}
      />
    </div>
  )
}
