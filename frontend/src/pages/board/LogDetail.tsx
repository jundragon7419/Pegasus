import { Link, Navigate, useParams } from 'react-router'

import { Button } from '@/components/Button'
import { LogList } from '@/components/LogList'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { ApiError } from '@/lib/api'
import { ACTIVITY_ACTION_LABEL } from '@/lib/activityLog'
import { ROUTES } from '@/lib/routes'
import type { ActivityLog } from '@/types/activity-log'

import styles from './UserActivity.module.css'

/**
 * 로그 상세. manager+ (§6.1).
 *
 * **§12-11 을 고치는 화면이다.** 구 `LogDetail` 은 `useLocation().state` 에만
 * 의존해서, URL 을 직접 열거나 새로고침하면 **항상** "로그 정보를 불러올 수
 * 없습니다"가 떴다. URL 이 사실상 무의미했고 링크를 공유할 수도 없었다.
 * 여기서는 `GET /api/users/:username/logs/:logId` 로 id 조회한다.
 *
 * 권한은 서버가 `canViewLogsOfUser` 로 판정한다 — 목록에서 넘어왔든 주소창에
 * 직접 쳤든 같은 검사를 거친다.
 */
export default function LogDetail() {
  const { username, logId } = useParams()
  const log = useApiResource<ActivityLog>(`/api/users/${username}/logs/${logId}`)

  if (log.error instanceof ApiError) {
    // 없는 로그는 404, 권한 없으면 403 — 둘 다 이 화면에 그릴 것이 없다
    if (log.error.status === 404) return <Navigate to={ROUTES.error404} replace />
    if (log.error.status === 403) return <Navigate to={ROUTES.error403} replace />
  }

  if (log.error) {
    return (
      <main className={styles.page}>
        <ErrorState error={log.error} what="로그" onRetry={log.reload} />
      </main>
    )
  }

  if (log.loading || !log.data) {
    return (
      <main className={styles.page}>
        <Skeleton height="2.5rem" width="50%" />
        <Skeleton height="10rem" />
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>{ACTIVITY_ACTION_LABEL[log.data.action]}</h1>
        <div className={styles.meta}>
          <span>{log.data.username}</span>
          <span className={styles.joined}>{log.data.createdAt.slice(0, 19).replace('T', ' ')}</span>
        </div>
      </header>

      <div className={styles.detailBody}>
        {/* 목록과 같은 렌더를 쓴다 — 수정 로그의 before/after 비교도 그대로 나온다 */}
        <LogList items={[log.data]} />
      </div>

      <div className={styles.detailActions}>
        <Button asChild variant="ghost">
          <Link to={ROUTES.userActivity(String(username))}>활동 내역으로</Link>
        </Button>
      </div>
    </main>
  )
}
