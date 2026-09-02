import { useState } from 'react'

import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useApiResource } from '@/hooks/useApiResource'
import { api } from '@/lib/api'
import { STAFF_TYPE_LABEL } from '@/lib/labels'
import type { StaffType } from '@/types/auth'

import { colName, colRole, colRoster, colUsername } from './columns'
import { UserTable } from './UserTable'
import { useAdminAction } from './useAdminAction'
import type { AdminUser } from './types'
import styles from './Admin.module.css'

/**
 * 스태프 관리. **root 전용**(§4.4).
 *
 * 임명 대상은 멤버와 매니저다. 회장·감독 중 무엇으로 임명할지 골라야 하므로
 * 행마다 선택을 둔다 — 눌렀더니 무엇으로 임명됐는지 모르는 상황을 피한다.
 */
export function StaffsTab({ active }: { active: boolean }) {
  const staffs = useApiResource<AdminUser[]>(active ? '/api/admin/staffs' : null)
  const members = useApiResource<AdminUser[]>(active ? '/api/admin/members' : null)
  const managers = useApiResource<AdminUser[]>(active ? '/api/admin/managers' : null)

  const reload = () => {
    staffs.reload()
    members.reload()
    managers.reload()
  }
  const { run, pendingId, error } = useAdminAction(reload)

  /** 행별로 고른 스태프 구분. 기본값은 감독이다 */
  const [choice, setChoice] = useState<Record<number, StaffType>>({})
  const [target, setTarget] = useState<AdminUser | null>(null)

  const candidates =
    members.data === null || managers.data === null ? null : [...members.data, ...managers.data]

  return (
    <div className={styles.panel}>
      <p className={styles.note}>
        스태프 임명과 해제는 관리자(root)만 할 수 있습니다. 해제하면 멤버로 돌아갑니다.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <section>
        <h2 className={styles.sectionTitle}>현재 스태프</h2>
        <UserTable
          rows={staffs.data}
          columns={[colUsername, colName, colRole, colRoster]}
          loading={staffs.loading}
          error={staffs.error}
          onRetry={staffs.reload}
          what="스태프 목록"
          emptyTitle="스태프가 없습니다"
          actions={(row) => (
            <Button
              size="sm"
              variant="ghost"
              disabled={pendingId === row.id}
              onClick={() => setTarget(row)}
            >
              해제
            </Button>
          )}
        />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>임명 가능한 멤버 · 매니저</h2>
        <UserTable
          rows={candidates}
          columns={[colUsername, colName, colRole, colRoster]}
          loading={members.loading || managers.loading}
          error={members.error ?? managers.error}
          onRetry={reload}
          what="임명 대상"
          emptyTitle="임명할 수 있는 사람이 없습니다"
          actions={(row) => (
            <>
              <select
                className={styles.inlineSelect}
                value={choice[row.id] ?? 'headcoach'}
                onChange={(event) =>
                  setChoice((prev) => ({ ...prev, [row.id]: event.target.value as StaffType }))
                }
                aria-label={`${row.username} 스태프 구분`}
              >
                <option value="headcoach">{STAFF_TYPE_LABEL.headcoach}</option>
                <option value="president">{STAFF_TYPE_LABEL.president}</option>
              </select>
              <Button
                size="sm"
                disabled={pendingId === row.id}
                onClick={() =>
                  run(row.id, () =>
                    api.put(`/api/admin/users/${row.id}/set-staff`, {
                      staffType: choice[row.id] ?? 'headcoach',
                    }),
                  )
                }
              >
                임명
              </Button>
            </>
          )}
        />
      </section>

      <ConfirmModal
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title="스태프를 해제할까요?"
        description={
          target
            ? `${target.username} 님의 스태프 권한을 해제하고 멤버로 되돌립니다.\n이 행동은 로그에 기록됩니다.`
            : ''
        }
        confirmLabel="해제"
        onConfirm={() => {
          const t = target
          setTarget(null)
          if (t) run(t.id, () => api.put(`/api/admin/users/${t.id}/unset-staff`))
        }}
      />
    </div>
  )
}
