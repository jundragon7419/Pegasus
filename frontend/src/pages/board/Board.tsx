import { Link, useSearchParams } from 'react-router'
import { Pencil1Icon } from '@radix-ui/react-icons'

import { Button } from '@/components/Button'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { useAuth } from '@/hooks/useAuth'
import { cx } from '@/lib/cx'
import { POST_TYPE_LABEL } from '@/lib/labels'
import { pageCount } from '@/lib/pagination'
import { isMemberRole } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import type { PagedPosts, PostSummary } from '@/types/board'

import styles from './Board.module.css'

const PAGE_SIZE = 15

/**
 * 게시판 목록. 블루프린트 §6.3.
 *
 * **페이지네이션을 서버가 한다(§12-14).** 구 API 는 전체 행을 매번 내려주고
 * 클라이언트가 잘랐다. 글이 쌓이면 첫 화면에서 전부를 받는다.
 *
 * **basic 은 목록까지만 본다.** 구 구현은 제목을 링크로 두고 클릭을
 * `preventDefault` 로 막았는데, 눌러도 아무 일이 없는 화면은 고장으로 보인다.
 * 여기서는 링크를 걸지 않고 그 이유를 위에 적는다.
 */
export default function Board() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  const page = Math.max(1, Number(params.get('page')) || 1)
  const canRead = isMemberRole(user?.authority)

  const posts = useApiResource<PagedPosts>(`/api/posts?page=${page}&size=${PAGE_SIZE}`)

  const items = posts.data?.items ?? []
  const pinned = items.filter((post) => post.isPinned)
  const normal = items.filter((post) => !post.isPinned)
  const totalPages = pageCount(posts.data?.total ?? 0, PAGE_SIZE)

  const goToPage = (next: number) => {
    setParams(next === 1 ? {} : { page: String(next) })
    window.scrollTo({ top: 0 })
  }

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>게시판</h1>
        {canRead && (
          <Button asChild size="sm">
            <Link to={ROUTES.boardWrite}>
              <Pencil1Icon />
              글쓰기
            </Link>
          </Button>
        )}
      </div>

      {!canRead && (
        <p className={styles.notice} role="status">
          회원 승인 후 게시글을 열람할 수 있습니다. 마이페이지에서 회원 신청 상태를 확인해 주세요.
        </p>
      )}

      {posts.error ? (
        <ErrorState error={posts.error} what="게시글" onRetry={posts.reload} />
      ) : posts.loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState title="아직 게시글이 없습니다" description="첫 글을 남겨 보세요." />
      ) : (
        <>
          <div className={styles.list}>
            <div className={cx(styles.row, styles.header)} role="presentation">
              <span>유형</span>
              <span>제목</span>
              <span className={styles.author}>작성자</span>
              <span className={styles.date}>날짜</span>
              <span className={styles.views}>조회</span>
            </div>

            {[...pinned, ...normal].map((post, index) => (
              <PostRow
                key={post.id}
                post={post}
                canRead={canRead}
                // 고정글 구간의 마지막 줄에 굵은 구분선을 둔다
                divider={pinned.length > 0 && index === pinned.length - 1}
              />
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </>
      )}
    </main>
  )
}

type PostRowProps = {
  post: PostSummary
  canRead: boolean
  divider: boolean
}

function PostRow({ post, canRead, divider }: PostRowProps) {
  const body = (
    <>
      <span className={cx(styles.type, post.isPinned && styles.typePinned)}>
        {POST_TYPE_LABEL[post.type]}
      </span>
      <span className={styles.postTitle}>{post.title}</span>
      <span className={styles.author}>{post.author}</span>
      <span className={styles.date}>{post.date.slice(2)}</span>
      <span className={styles.views}>{post.views}</span>
    </>
  )

  const className = cx(styles.row, divider && styles.pinnedDivider)

  // 읽을 수 없으면 링크로 만들지 않는다 — 눌리는데 안 열리는 것보다 낫다
  if (!canRead) {
    return <div className={cx(className, styles.locked)}>{body}</div>
  }

  return (
    <Link to={ROUTES.boardDetail(post.id)} className={className}>
      {body}
    </Link>
  )
}

function ListSkeleton() {
  return (
    <div className={styles.list}>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className={styles.row}>
          <Skeleton width="2.6rem" height="1.1rem" radius="var(--radius-pill)" />
          <Skeleton height="1rem" />
          <Skeleton width="6rem" height="0.85rem" />
          <Skeleton width="3.5rem" height="0.85rem" />
          <Skeleton width="2rem" height="0.85rem" />
        </div>
      ))}
    </div>
  )
}
