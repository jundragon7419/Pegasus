import type { AdminColumn } from '@/components/AdminTable'
import { StatusBadge } from '@/components/StatusBadge'
import { UserLink } from '@/components/UserLink'
import { ROSTER_ROLE_LABEL, roleLabelOf } from '@/lib/labels'

import type { AdminUser } from './types'
import styles from './Admin.module.css'

/**
 * 사용자 표의 공통 열.
 *
 * 일곱 개 탭이 같은 사람 정보를 보여주므로 열 정의를 한 곳에 둔다 —
 * 탭마다 따로 적으면 학번 정렬이나 라벨이 조용히 달라진다.
 */

export const colUsername: AdminColumn<AdminUser> = {
  key: 'username',
  label: '아이디',
  render: (row) => <UserLink username={row.username} />,
}

export const colName: AdminColumn<AdminUser> = {
  key: 'name',
  label: '실명',
  render: (row) => row.name ?? '—',
}

export const colStudentId: AdminColumn<AdminUser> = {
  key: 'studentId',
  label: '학번',
  minor: true,
  render: (row) => <span className={styles.numeric}>{row.studentId ?? '—'}</span>,
}

export const colRole: AdminColumn<AdminUser> = {
  key: 'authority',
  label: '권한',
  render: (row) => roleLabelOf(row.authority, row.staffType),
}

export const colStatus: AdminColumn<AdminUser> = {
  key: 'status',
  label: '상태',
  render: (row) => <StatusBadge status={row.membershipStatus} banned={row.isBanned} />,
}

/** 최신 연도 로스터 정보. 명단에 실제로 올랐는지 표에서 바로 보인다. */
export const colRoster: AdminColumn<AdminUser> = {
  key: 'roster',
  label: '로스터',
  minor: true,
  render: (row) =>
    row.rosterNumber === null ? (
      <span className={styles.muted}>미등록</span>
    ) : (
      <span>
        <span className={styles.numeric}>{row.rosterYear}</span> · {row.rosterNumber}
        {row.rosterRole ? ` · ${ROSTER_ROLE_LABEL[row.rosterRole]}` : ''}
      </span>
    ),
}
