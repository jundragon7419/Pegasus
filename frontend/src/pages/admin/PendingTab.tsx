import { AdminTable, type AdminColumn } from '@/components/AdminTable'
import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { UserLink } from '@/components/UserLink'
import { useApiResource } from '@/hooks/useApiResource'
import { api } from '@/lib/api'
import { OB_YB_LABEL } from '@/lib/labels'
import { useState } from 'react'

import { useAdminAction } from './useAdminAction'
import type { AdminUser } from './types'
import styles from './Admin.module.css'

/**
 * 멤버 승인. manager+ (§5.10).
 *
 * **거부는 확인을 받는다.** 승인은 되돌릴 수 있지만(강등) 거부는 신청자에게
 * 다시 신청하게 만드는 일이라 실수의 비용이 다르다.
 */
export function PendingTab({ active }: { active: boolean }) {
  const list = useApiResource<AdminUser[]>(active ? '/api/admin/pending-members' : null)
  const { run, pendingId, error } = useAdminAction(list.reload)
  const [rejecting, setRejecting] = useState<AdminUser | null>(null)

  const columns: AdminColumn<AdminUser>[] = [
    {
      key: 'username',
      label: '아이디',
      render: (row) => <UserLink username={row.username} />,
    },
    { key: 'name', label: '실명', render: (row) => row.name ?? '—' },
    {
      key: 'studentId',
      label: '학번',
      render: (row) => <span className={styles.numeric}>{row.studentId ?? '—'}</span>,
    },
    { key: 'obYb', label: 'OB/YB', render: (row) => (row.obYb ? OB_YB_LABEL[row.obYb] : '—') },
    { key: 'createdAt', label: '가입일', minor: true, render: (row) => row.createdAt },
  ]

  return (
    <div className={styles.panel}>
      <p className={styles.note}>
        승인하면 회원(member) 권한이 부여되어 게시판과 활동 기능을 쓸 수 있습니다.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <AdminTable
        rows={list.data}
        columns={columns}
        getKey={(row) => row.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        what="승인 대기 목록"
        emptyTitle="승인 대기 중인 신청이 없습니다"
        emptyDescription="새 신청이 들어오면 여기에 표시됩니다."
        actions={(row) => (
          <>
            <Button
              size="sm"
              disabled={pendingId === row.id}
              onClick={() => run(row.id, () => api.post(`/api/admin/approve-member/${row.id}`))}
            >
              승인
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pendingId === row.id}
              onClick={() => setRejecting(row)}
            >
              거부
            </Button>
          </>
        )}
      />

      <ConfirmModal
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) setRejecting(null)
        }}
        title="신청을 거부할까요?"
        description={
          rejecting
            ? `${rejecting.username}(${rejecting.name ?? '이름 없음'}) 님의 신청을 거부합니다.\n거부하면 프로필을 고쳐 다시 신청할 수 있습니다. 이 행동은 로그에 기록됩니다.`
            : ''
        }
        confirmLabel="거부"
        onConfirm={() => {
          const target = rejecting
          setRejecting(null)
          if (target) run(target.id, () => api.post(`/api/admin/reject-member/${target.id}`))
        }}
      />
    </div>
  )
}
