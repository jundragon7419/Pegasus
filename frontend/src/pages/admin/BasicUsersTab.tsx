import { useState } from 'react'

import { AdminTable } from '@/components/AdminTable'
import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useApiResource } from '@/hooks/useApiResource'
import { api } from '@/lib/api'

import { colName, colStatus, colStudentId, colUsername } from './columns'
import { useAdminAction } from './useAdminAction'
import type { AdminUser } from './types'
import styles from './Admin.module.css'

/** 일반유저(basic) 관리. staff+ — 계정 차단이 유일한 액션이다(§5.10). */
export function BasicUsersTab({ active }: { active: boolean }) {
  const list = useApiResource<AdminUser[]>(active ? '/api/admin/basic-users' : null)
  const { run, pendingId, error } = useAdminAction(list.reload)
  const [banning, setBanning] = useState<AdminUser | null>(null)

  return (
    <div className={styles.panel}>
      <p className={styles.note}>
        아직 멤버가 아닌 계정입니다. 승인 대기 중인 신청은 “멤버 승인” 탭에서 처리합니다.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <AdminTable<AdminUser>
        rows={list.data}
        columns={[colUsername, colName, colStudentId, colStatus]}
        getKey={(row) => row.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        what="일반유저 목록"
        emptyTitle="일반유저가 없습니다"
        actions={(row) => (
          <Button
            size="sm"
            variant="negative"
            disabled={pendingId === row.id}
            onClick={() => setBanning(row)}
          >
            차단
          </Button>
        )}
      />

      <ConfirmModal
        open={banning !== null}
        onOpenChange={(open) => {
          if (!open) setBanning(null)
        }}
        title="계정을 차단할까요?"
        description={
          banning
            ? `${banning.username} 님의 계정을 차단합니다.\n차단된 계정은 로그인할 수 없습니다. 신청 상태는 그대로 남아 해제하면 원래대로 돌아옵니다.\n이 행동은 로그에 기록됩니다.`
            : ''
        }
        confirmLabel="차단"
        onConfirm={() => {
          const t = banning
          setBanning(null)
          if (t) run(t.id, () => api.put(`/api/admin/users/${t.id}/ban`))
        }}
      />
    </div>
  )
}
