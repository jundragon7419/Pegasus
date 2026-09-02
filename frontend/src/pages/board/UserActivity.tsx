import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'

import { LogList } from '@/components/LogList'
import { Pagination } from '@/components/Pagination'
import { StatusBadge } from '@/components/StatusBadge'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/Tabs'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { ApiError } from '@/lib/api'
import { POST_TYPE_LABEL, roleLabelOf } from '@/lib/labels'
import { pageCount } from '@/lib/pagination'
import { ROUTES } from '@/lib/routes'
import type { ActivityLog } from '@/types/activity-log'
import type { Comment, PagedPosts, PostType } from '@/types/board'
import type { MembershipStatus, Role, StaffType } from '@/types/auth'

import styles from './UserActivity.module.css'

const PAGE_SIZE = 15

type Profile = {
  id: number
  username: string
  name: string | null
  authority: Role
  staffType: StaffType | null
  isBanned: boolean
  createdAt: string
  membershipStatus?: MembershipStatus
  /** 서버가 `canViewLogsOfUser` 로 판정해 내려준다. 화면은 이걸로 탭을 그린다 */
  canViewLogs: boolean
}

type PagedComments = {
  items: Array<Comment & { postTitle: string; postType: PostType | null }>
  page: number
  size: number
  total: number
}

type PagedLogs = { items: ActivityLog[]; page: number; size: number; total: number }

/**
 * 타 유저 활동 내역. member+ (§6.3).
 *
 * **로그 탭 노출 조건은 서버가 정한다.** 구 구현은 프론트에서 `ROLE_ORDER` 를
 * 비교해 탭을 감췄지만 API 는 무방비였다(§12-2) — 탭을 감추는 것과 막는 것은
 * 다른 일이다. 여기서는 서버가 `canViewLogs` 를 내려주고, 그 API 도 같은 함수로
 * 막혀 있다.
 */
export default function UserActivity() {
  const { username } = useParams()
  const [tab, setTab] = useState('posts')
  const [postPage, setPostPage] = useState(1)
  const [commentPage, setCommentPage] = useState(1)
  const [logPage, setLogPage] = useState(1)

  const profile = useApiResource<Profile>(`/api/users/${username}`)

  const posts = useApiResource<PagedPosts>(
    tab === 'posts' ? `/api/users/${username}/posts?page=${postPage}&size=${PAGE_SIZE}` : null,
  )
  const comments = useApiResource<PagedComments>(
    tab === 'comments'
      ? `/api/users/${username}/comments?page=${commentPage}&size=${PAGE_SIZE}`
      : null,
  )
  const logs = useApiResource<PagedLogs>(
    tab === 'logs' ? `/api/users/${username}/logs?page=${logPage}&size=${PAGE_SIZE}` : null,
  )

  // 없는 사용자는 그 자리에 오류를 그릴 게 아니라 404 다 — 화면의 주제가 없다
  if (profile.error instanceof ApiError && profile.error.status === 404) {
    return <Navigate to={ROUTES.error404} replace />
  }

  if (profile.error) {
    return (
      <main className={styles.page}>
        <ErrorState error={profile.error} what="활동 내역" onRetry={profile.reload} />
      </main>
    )
  }

  if (profile.loading || !profile.data) {
    return (
      <main className={styles.page}>
        <Skeleton height="3rem" width="40%" />
        <Skeleton height="12rem" />
      </main>
    )
  }

  const me = profile.data

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>{me.username}</h1>
        <div className={styles.meta}>
          {me.name && <span>{me.name}</span>}
          <span className={styles.badge}>{roleLabelOf(me.authority, me.staffType)}</span>
          {me.isBanned && <StatusBadge status="none" banned />}
          <span className={styles.joined}>가입 {me.createdAt}</span>
        </div>
      </header>

      <TabsRoot value={tab} onValueChange={setTab} className={styles.tabs}>
        <TabsList>
          <TabsTrigger value="posts">게시글</TabsTrigger>
          <TabsTrigger value="comments">댓글</TabsTrigger>
          {/* 판정은 서버가 했다. 여기서는 그 결과를 따를 뿐이다 */}
          {me.canViewLogs && <TabsTrigger value="logs">활동 로그</TabsTrigger>}
        </TabsList>

        <TabsContent value="posts">
          {posts.error ? (
            <ErrorState error={posts.error} what="게시글" onRetry={posts.reload} />
          ) : posts.loading || !posts.data ? (
            <Skeleton height="10rem" />
          ) : posts.data.items.length === 0 ? (
            <EmptyState title="작성한 글이 없습니다" />
          ) : (
            <>
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
                page={postPage}
                totalPages={pageCount(posts.data.total, PAGE_SIZE)}
                onChange={setPostPage}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="comments">
          {comments.error ? (
            <ErrorState error={comments.error} what="댓글" onRetry={comments.reload} />
          ) : comments.loading || !comments.data ? (
            <Skeleton height="10rem" />
          ) : comments.data.items.length === 0 ? (
            <EmptyState title="남긴 댓글이 없습니다" />
          ) : (
            <>
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
                      <span className={styles.source}> · {comment.postTitle}</span>
                    </span>
                    <span className={styles.itemDate}>{comment.createdAt.slice(2, 10)}</span>
                  </Link>
                ))}
              </div>
              <Pagination
                page={commentPage}
                totalPages={pageCount(comments.data.total, PAGE_SIZE)}
                onChange={setCommentPage}
              />
            </>
          )}
        </TabsContent>

        {me.canViewLogs && (
          <TabsContent value="logs">
            {logs.error ? (
              <ErrorState error={logs.error} what="활동 로그" onRetry={logs.reload} />
            ) : logs.loading || !logs.data ? (
              <Skeleton height="10rem" />
            ) : logs.data.items.length === 0 ? (
              <EmptyState title="기록된 활동이 없습니다" />
            ) : (
              <>
                <p className={styles.note}>
                  각 줄을 누르면 그때의 내용을 볼 수 있습니다. 게시글·댓글 로그는 상세 화면으로도
                  열 수 있습니다.
                </p>
                <LogList items={logs.data.items} detailBase={`/user/${username}/log`} />
                <Pagination
                  page={logPage}
                  totalPages={pageCount(logs.data.total, PAGE_SIZE)}
                  onChange={setLogPage}
                />
              </>
            )}
          </TabsContent>
        )}
      </TabsRoot>
    </main>
  )
}
