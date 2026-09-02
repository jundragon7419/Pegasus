import { useState } from 'react'

import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useApiResource } from '@/hooks/useApiResource'
import { api } from '@/lib/api'

import { colName, colRole, colStatus, colStudentId, colUsername } from './columns'
import { UserTable } from './UserTable'
import { useAdminAction } from './useAdminAction'
import type { AdminUser } from './types'
import styles from './Admin.module.css'

/**
 * 차단 계정 관리. staff+ (§5.10).
 *
 * **차단 가능 목록은 서버가 이미 걸러 준다**(`bannable-users` 는 root 를 제외한다).
 * 구 구현은 프론트에서 `STAFF_BANNABLE`/`ROOT_BANNABLE` 로 한 번 더 필터했는데,
 * 그 목록이 서버 규칙과 어긋나면 눌러도 실패하는 버튼이 생긴다. 최종 판정은
 * `canBanUser` 가 서버에서 한다.
 */
export function BannedTab({ active }: { active: boolean }) {
  const banned = useApiResource<AdminUser[]>(active ? '/api/admin/banned-users' : null)
  const bannable = useApiResource<AdminUser[]>(active ? '/api/admin/bannable-users' : null)

  const reload = () => {
    banned.reload()
    bannable.reload()
  }
  const { run, pendingId, error } = useAdminAction(reload)
  const [target, setTarget] = useState<AdminUser | null>(null)

  return (
    <div className={styles.panel}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <section>
        <h2 className={styles.sectionTitle}>차단된 계정</h2>
        <p className={styles.note}>
          해제하면 차단 전 상태로 그대로 돌아갑니다. 권한과 신청 상태는 차단 중에도 보존됩니다.
        </p>
        <UserTable
          rows={banned.data}
          columns={[colUsername, colName, colRole, colStatus]}
          loading={banned.loading}
          error={banned.error}
          onRetry={banned.reload}
          what="차단 목록"
          emptyTitle="차단된 계정이 없습니다"
          actions={(row) => (
            <Button
              size="sm"
              disabled={pendingId === row.id}
              onClick={() => run(row.id, () => api.put(`/api/admin/users/${row.id}/unban`))}
            >
              차단 해제
            </Button>
          )}
        />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>차단 가능한 계정</h2>
        <UserTable
          rows={bannable.data}
          columns={[colUsername, colName, colRole, colStudentId]}
          loading={bannable.loading}
          error={bannable.error}
          onRetry={bannable.reload}
          what="차단 가능 목록"
          emptyTitle="차단할 수 있는 계정이 없습니다"
          actions={(row) => (
            <Button
              size="sm"
              variant="negative"
              disabled={pendingId === row.id}
              onClick={() => setTarget(row)}
            >
              차단
            </Button>
          )}
        />
      </section>

      <ConfirmModal
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title="계정을 차단할까요?"
        description={
          target
            ? `${target.username} 님의 계정을 차단합니다.\n로그인할 수 없게 되며, 해제하면 지금 상태 그대로 돌아옵니다.\n이 행동은 로그에 기록됩니다.`
            : ''
        }
        confirmLabel="차단"
        onConfirm={() => {
          const t = target
          setTarget(null)
          if (t) run(t.id, () => api.put(`/api/admin/users/${t.id}/ban`))
        }}
      />
    </div>
  )
}
