import { useState } from 'react'

import { AdminTable, type AdminColumn } from '@/components/AdminTable'
import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { UserLink } from '@/components/UserLink'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useApiResource } from '@/hooks/useApiResource'
import { ApiError, api } from '@/lib/api'
import { ROSTER_ROLE_LABEL } from '@/lib/labels'
import type { ActiveYear, RosterRole } from '@/types/roster'

import { useAdminAction } from './useAdminAction'
import type { AdminRosterEntry } from './types'
import styles from './Admin.module.css'

const ROLES: RosterRole[] = [
  'roster_player',
  'roster_manager',
  'roster_headcoach',
  'roster_president',
  'roster_retired',
]

type Draft = {
  number: string
  name: string
  studentId: string
  generation: string
  role: RosterRole
}

const EMPTY: Draft = { number: '', name: '', studentId: '', generation: '', role: 'roster_player' }

/**
 * 로스터 관리. manager+ (§5.10).
 *
 * **학번이 계정과 이어진다(§12-17).** 저장하면 서버가 학번으로 계정을 찾아
 * `userId` 를 채운다 — 구 구현은 FK 를 두고도 안 채워서 모든 조인이 문자열
 * 매칭이었고, 학번을 고치면 연동이 조용히 끊겼다. 표의 "가입" 열이 그 결과다.
 */
export function RosterTab({ active }: { active: boolean }) {
  const handleError = useApiErrorHandler()
  const activeYear = useApiResource<ActiveYear>(active ? '/api/roster/active-year' : null)
  const years = useApiResource<number[]>(active ? '/api/roster/years' : null)

  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  // 활성 연도를 받아오기 전까지는 무엇을 보여줄지 알 수 없다
  const year = selectedYear ?? activeYear.data?.year ?? null

  const list = useApiResource<AdminRosterEntry[]>(
    active && year !== null ? `/api/admin/roster?year=${year}` : null,
  )
  const { run, pendingId, error } = useAdminAction(list.reload)

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<AdminRosterEntry | null>(null)

  async function add() {
    if (year === null) return
    setAdding(true)
    setAddError(null)
    try {
      await api.post('/api/admin/roster', {
        year,
        number: draft.number.trim().toUpperCase(),
        name: draft.name.trim(),
        studentId: draft.studentId.trim(),
        generation: Number(draft.generation),
        role: draft.role,
      })
      setDraft(EMPTY)
      list.reload()
      years.reload()
    } catch (caught) {
      // 400(검증) · 409(같은 해 학번 중복)는 화면을 옮기지 않는다
      if (!handleError(caught)) {
        setAddError(caught instanceof ApiError ? caught.message : '추가하지 못했습니다.')
      }
    } finally {
      setAdding(false)
    }
  }

  const columns: AdminColumn<AdminRosterEntry>[] = [
    {
      key: 'number',
      label: '등번호',
      render: (row) => <span className={styles.numeric}>{row.number}</span>,
    },
    { key: 'name', label: '이름', render: (row) => row.name },
    {
      key: 'studentId',
      label: '학번',
      minor: true,
      render: (row) => <span className={styles.numeric}>{row.studentId}</span>,
    },
    {
      key: 'generation',
      label: '기수',
      minor: true,
      render: (row) => <span className={styles.numeric}>{row.generation}</span>,
    },
    { key: 'role', label: '역할', render: (row) => ROSTER_ROLE_LABEL[row.role] },
    {
      key: 'username',
      label: '가입',
      render: (row) =>
        row.username === null ? (
          <span className={styles.muted}>미가입</span>
        ) : (
          <UserLink username={row.username} />
        ),
    },
  ]

  return (
    <div className={styles.panel}>
      {/* ── 연도 선택 ─────────────────────────────────────────────────── */}
      <div className={styles.yearRow}>
        {(years.data ?? []).map((option) => (
          <Button
            key={option}
            size="sm"
            variant={option === year ? 'primary' : 'secondary'}
            onClick={() => setSelectedYear(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      {/* ── 추가 폼 ──────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{year} 시즌에 추가</h2>
        <p className={styles.note}>
          학번이 가입 계정과 일치하면 자동으로 연결됩니다. 매니저의 등번호는 `M` 을 씁니다.
        </p>

        <div className={styles.addRow}>
          <input
            className={styles.input}
            value={draft.number}
            onChange={(e) => setDraft({ ...draft, number: e.target.value })}
            placeholder="등번호"
            aria-label="등번호"
          />
          <input
            className={styles.input}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="이름"
            aria-label="이름"
          />
          <input
            className={styles.input}
            value={draft.studentId}
            onChange={(e) => setDraft({ ...draft, studentId: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="학번 10자리"
            inputMode="numeric"
            aria-label="학번"
          />
          <input
            className={styles.input}
            value={draft.generation}
            onChange={(e) => setDraft({ ...draft, generation: e.target.value.replace(/\D/g, '') })}
            placeholder="기수"
            inputMode="numeric"
            aria-label="기수"
          />
          <select
            className={styles.input}
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as RosterRole })}
            aria-label="역할"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROSTER_ROLE_LABEL[role]}
              </option>
            ))}
          </select>
          <Button
            disabled={adding || year === null || !draft.name || !draft.studentId || !draft.number}
            onClick={add}
          >
            {adding ? '추가 중…' : '추가'}
          </Button>
        </div>

        {addError && (
          <p className={styles.error} role="alert">
            {addError}
          </p>
        )}
      </section>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <AdminTable<AdminRosterEntry>
        rows={list.data}
        columns={columns}
        getKey={(row) => row.id}
        loading={list.loading || year === null}
        error={list.error}
        onRetry={list.reload}
        what="로스터"
        emptyTitle={`${year ?? ''} 시즌 명단이 없습니다`}
        emptyDescription="위 폼으로 선수를 추가해 주세요."
        actions={(row) => (
          <Button
            size="sm"
            variant="ghost"
            disabled={pendingId === row.id}
            onClick={() => setRemoving(row)}
          >
            삭제
          </Button>
        )}
      />

      <ConfirmModal
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title="명단에서 삭제할까요?"
        description={
          removing
            ? `${removing.year} 시즌 ${removing.number}번 ${removing.name} 을(를) 명단에서 지웁니다.\n계정 자체는 삭제되지 않습니다. 이 행동은 로그에 기록됩니다.`
            : ''
        }
        confirmLabel="삭제"
        onConfirm={() => {
          const t = removing
          setRemoving(null)
          if (t) run(t.id, () => api.delete(`/api/admin/roster/${t.id}`))
        }}
      />
    </div>
  )
}
