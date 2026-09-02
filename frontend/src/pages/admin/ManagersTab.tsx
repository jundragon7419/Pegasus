import { AdminTable } from '@/components/AdminTable'
import { Button } from '@/components/Button'
import { useApiResource } from '@/hooks/useApiResource'
import { api } from '@/lib/api'

import { colName, colRoster, colStudentId, colUsername } from './columns'
import { useAdminAction } from './useAdminAction'
import type { AdminUser } from './types'
import styles from './Admin.module.css'

/**
 * 매니저 관리. staff+ (§5.10).
 *
 * 현재 매니저(해제)와 임명 가능한 멤버 두 표를 나란히 둔다.
 * **대상 조건은 서버가 판정한다** — 여기 목록은 편의일 뿐이고, 목록이 낡아
 * 조건이 어긋나면 409 가 돌아와 그 자리에 표시된다(§12-10).
 */
export function ManagersTab({ active }: { active: boolean }) {
  const managers = useApiResource<AdminUser[]>(active ? '/api/admin/managers' : null)
  const members = useApiResource<AdminUser[]>(active ? '/api/admin/members' : null)

  const reload = () => {
    managers.reload()
    members.reload()
  }
  const { run, pendingId, error } = useAdminAction(reload)

  const columns = [colUsername, colName, colStudentId, colRoster]

  return (
    <div className={styles.panel}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <section>
        <h2 className={styles.sectionTitle}>현재 매니저</h2>
        <AdminTable<AdminUser>
          rows={managers.data}
          columns={columns}
          getKey={(row) => row.id}
          loading={managers.loading}
          error={managers.error}
          onRetry={managers.reload}
          what="매니저 목록"
          emptyTitle="매니저가 없습니다"
          actions={(row) => (
            <Button
              size="sm"
              variant="ghost"
              disabled={pendingId === row.id}
              onClick={() => run(row.id, () => api.put(`/api/admin/users/${row.id}/unset-manager`))}
            >
              해제
            </Button>
          )}
        />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>임명 가능한 멤버</h2>
        <AdminTable<AdminUser>
          rows={members.data}
          columns={columns}
          getKey={(row) => row.id}
          loading={members.loading}
          error={members.error}
          onRetry={members.reload}
          what="멤버 목록"
          emptyTitle="임명할 수 있는 멤버가 없습니다"
          actions={(row) => (
            <Button
              size="sm"
              disabled={pendingId === row.id}
              onClick={() => run(row.id, () => api.put(`/api/admin/users/${row.id}/set-manager`))}
            >
              매니저 임명
            </Button>
          )}
        />
      </section>
    </div>
  )
}
