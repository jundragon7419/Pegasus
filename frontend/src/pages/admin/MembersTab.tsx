import { useState } from 'react'

import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useApiResource } from '@/hooks/useApiResource'
import { api } from '@/lib/api'

import { colName, colRole, colRoster, colStatus, colStudentId, colUsername } from './columns'
import { UserTable } from './UserTable'
import { useAdminAction } from './useAdminAction'
import type { AdminUser } from './types'
import styles from './Admin.module.css'

/**
 * 멤버 관리. staff+ (§5.10).
 *
 * 스태프·매니저·멤버를 한 표에 모아 조직 구성을 한눈에 본다.
 * **강등 버튼은 `member` 에게만 붙는다** — 매니저·스태프는 각자의 탭에서 먼저
 * 해제해야 한다. 서버도 같은 조건을 검사해 어긋나면 409 다.
 */
export function MembersTab({ active }: { active: boolean }) {
  const list = useApiResource<AdminUser[]>(active ? '/api/admin/org-members' : null)
  const { run, pendingId, error } = useAdminAction(list.reload)
  const [demoting, setDemoting] = useState<AdminUser | null>(null)

  return (
    <div className={styles.panel}>
      <p className={styles.note}>
        강등하면 권한이 일반(basic)으로 내려가고 멤버 신청 상태도 함께 초기화됩니다.
        매니저·스태프는 먼저 해당 탭에서 해제해 주세요.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <UserTable
        rows={list.data}
        columns={[colUsername, colName, colRole, colStudentId, colRoster, colStatus]}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        what="멤버 목록"
        emptyTitle="표시할 멤버가 없습니다"
        actions={(row) =>
          row.authority === 'member' ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pendingId === row.id}
              onClick={() => setDemoting(row)}
            >
              강등
            </Button>
          ) : (
            <span className={styles.muted}>—</span>
          )
        }
      />

      <ConfirmModal
        open={demoting !== null}
        onOpenChange={(open) => {
          if (!open) setDemoting(null)
        }}
        title="멤버를 강등할까요?"
        description={
          demoting
            ? `${demoting.username} 님을 일반 계정으로 되돌립니다.\n게시판과 활동 기능을 쓸 수 없게 되며, 다시 멤버가 되려면 새로 신청해야 합니다.\n이 행동은 로그에 기록됩니다.`
            : ''
        }
        confirmLabel="강등"
        onConfirm={() => {
          const t = demoting
          setDemoting(null)
          if (t) run(t.id, () => api.put(`/api/admin/users/${t.id}/demote-member`))
        }}
      />
    </div>
  )
}
