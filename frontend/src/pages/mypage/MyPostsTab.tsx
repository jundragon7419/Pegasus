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
import type { PagedPosts } from '@/types/board'

import styles from './MyPage.module.css'

const PAGE_SIZE = 15

/** 내가 쓴 게시글. 페이지네이션은 게시판과 같은 서버 계약을 쓴다(§12-14). */
export function MyPostsTab({ active }: { active: boolean }) {
  const [page, setPage] = useState(1)
  // 탭이 열리기 전에는 null 을 넘겨 요청을 보내지 않는다
  const posts = useApiResource<PagedPosts>(
    active ? `/api/mypage/posts?page=${page}&size=${PAGE_SIZE}` : null,
  )

  if (posts.error) {
    return <ErrorState error={posts.error} what="내 게시글" onRetry={posts.reload} />
  }

  if (posts.loading || !posts.data) {
    return (
      <div className={styles.panel}>
        <Skeleton height="10rem" />
      </div>
    )
  }

  if (posts.data.items.length === 0) {
    return (
      <div className={styles.panel}>
        <EmptyState title="아직 작성한 글이 없습니다" description="게시판에서 첫 글을 남겨 보세요." />
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {posts.data.items.map((post) => (
          <Link key={post.id} to={ROUTES.boardDetail(post.id)} className={styles.item}>
            <span className={styles.itemType}>{POST_TYPE_LABEL[post.type]}</span>
            <span className={styles.itemTitle}>{post.title}</span>
            <span className={styles.itemDate}>{post.date.slice(2)}</span>
          </Link>
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={pageCount(posts.data.total, PAGE_SIZE)}
        onChange={setPage}
      />
    </div>
  )
}
