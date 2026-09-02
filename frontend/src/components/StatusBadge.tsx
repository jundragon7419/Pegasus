import { cx } from '@/lib/cx'
import { MEMBERSHIP_STATUS_LABEL } from '@/lib/labels'
import type { MembershipStatus } from '@/types/auth'

import styles from './StatusBadge.module.css'

/**
 * 멤버십·차단 상태 배지.
 *
 * **팔레트를 늘리지 않는다.** 일정 유형 4색 때와 같은 결론이다 — 기존 토큰만
 * 쓰고 색 위에 **라벨을 항상 함께** 둔다. 색만으로 구분하지 않으므로 색각 이상
 * 사용자도 상태를 읽을 수 있다.
 *
 * 승인됨 `--positive` / 거부·차단 `--negative` / 대기 `--accent` / 미신청 중립.
 */
export function StatusBadge({
  status,
  banned = false,
}: {
  status: MembershipStatus
  /** 차단은 신청 상태와 별개다(§12-19). 차단이면 그쪽을 먼저 알린다 */
  banned?: boolean
}) {
  if (banned) {
    return <span className={cx(styles.badge, styles.banned)}>차단됨</span>
  }

  return (
    <span
      className={cx(
        styles.badge,
        status === 'approved' && styles.approved,
        status === 'pending' && styles.pending,
        status === 'rejected' && styles.rejected,
      )}
    >
      {MEMBERSHIP_STATUS_LABEL[status]}
    </span>
  )
}
