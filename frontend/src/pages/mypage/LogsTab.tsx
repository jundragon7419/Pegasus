import { useState } from 'react'

import { LogList } from '@/components/LogList'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { pageCount } from '@/lib/pagination'
import type { ActivityLog } from '@/types/activity-log'

import styles from './MyPage.module.css'

const PAGE_SIZE = 15

type PagedLogs = {
  items: ActivityLog[]
  page: number
  size: number
  total: number
}

/**
 * 내 활동 로그.
 *
 * **§8.4 의 열람 규칙은 "열람자 권한 > 대상 권한" 이라 등호가 없어 구 구현에서는
 * 아무도 자기 로그를 볼 수 없었다.** 본인은 언제나 볼 수 있어야 감사 로그가
 * 사용자에게도 의미를 갖는다 — 내 계정에서 무슨 일이 있었는지 확인하는 창구다.
 */
export function LogsTab({ active }: { active: boolean }) {
  const [page, setPage] = useState(1)
  const logs = useApiResource<PagedLogs>(
    active ? `/api/mypage/logs?page=${page}&size=${PAGE_SIZE}` : null,
  )

  if (logs.error) {
    return <ErrorState error={logs.error} what="활동 로그" onRetry={logs.reload} />
  }

  if (logs.loading || !logs.data) {
    return (
      <div className={styles.panel}>
        <Skeleton height="10rem" />
      </div>
    )
  }

  if (logs.data.items.length === 0) {
    return (
      <div className={styles.panel}>
        <EmptyState
          title="기록된 활동이 없습니다"
          description="글·댓글 작성, 투표 참여 같은 행동이 여기에 남습니다."
        />
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <p className={styles.sectionNote}>
        내 계정으로 이루어진 활동입니다. 각 줄을 누르면 그때의 내용을 볼 수 있고, 수정한
        기록은 변경 전·후를 함께 보여줍니다.
      </p>

      <LogList items={logs.data.items} />

      <Pagination page={page} totalPages={pageCount(logs.data.total, PAGE_SIZE)} onChange={setPage} />
    </div>
  )
}
