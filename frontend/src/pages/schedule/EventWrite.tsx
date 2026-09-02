import { CheckIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/Tabs'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { ApiError, NetworkError, api } from '@/lib/api'
import { datesInRange, isoMonth, todayISO } from '@/lib/date'
import { cx } from '@/lib/cx'
import { EVENT_TYPE_LABEL } from '@/lib/labels'
import { ROUTES } from '@/lib/routes'
import { validateEventName } from '@/lib/validators'
import type { EventType, TeamEvent } from '@/types/schedule'

import styles from './EventWrite.module.css'

const EVENT_TYPES: EventType[] = ['training', 'meeting', 'events', 'etc']
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)


const messageOf = (error: unknown, fallback: string) =>
  error instanceof ApiError || error instanceof NetworkError ? error.message : fallback


export default function EventWrite() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'edit' ? 'edit' : 'add'

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>일정 관리</h1>
      <p className={styles.subtitle}>훈련·회의·행사 일정을 등록하고 수정합니다.</p>

      <TabsRoot
        value={tab}
        onValueChange={(value) => setSearchParams(value === 'edit' ? { tab: 'edit' } : {})}
      >
        <div className={styles.tabsRow}>
          <TabsList aria-label="일정 관리 탭">
            <TabsTrigger value="add">추가</TabsTrigger>
            <TabsTrigger value="edit">수정</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="add" className={styles.panel}>
          <AddTab />
        </TabsContent>
        <TabsContent value="edit" className={styles.panel}>
          <EditTab />
        </TabsContent>
      </TabsRoot>
    </main>
  )
}

/* ── 추가 탭 ────────────────────────────────────────────────────────────── */

type DraftRow = { key: number; type: EventType; start: string; end: string; name: string }

let nextKey = 1
const emptyRow = (): DraftRow => ({
  key: nextKey++,
  type: 'training',
  start: todayISO(),
  end: todayISO(),
  name: '',
})

type BulkResult = {
  created: TeamEvent[]
  conflicts: Array<{ date: string; name: string; reason: string }>
}

function AddTab() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<DraftRow[]>(() => [emptyRow()])
  const [result, setResult] = useState<BulkResult | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function patch(key: number, changes: Partial<DraftRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row
        const next = { ...row, ...changes }
        // 시작일이 종료일보다 뒤면 자동으로 맞춘다. 오류로 막을 이유가 없다
        if (next.start > next.end) {
          if (changes.start !== undefined) next.end = next.start
          else next.start = next.end
        }
        return next
      }),
    )
  }

  async function save() {
    setFormError(null)
    setResult(null)

    const events: Array<{ date: string; type: EventType; name: string }> = []
    for (const row of rows) {
      const check = validateEventName(row.name)
      if (!check.valid) {
        setFormError(check.error)
        return
      }
      for (const date of datesInRange(row.start, row.end)) {
        events.push({ date, type: row.type, name: row.name.trim() })
      }
    }
    if (events.length === 0) {
      setFormError('등록할 일정이 없습니다.')
      return
    }

    setSaving(true)
    try {
      // 날짜 범위를 펼쳐도 **요청은 한 번**이다. 구 구현은 하루씩 순차 POST 를
      // 보내 30일 범위면 30회 왕복했고, 중간에 실패하면 일부만 등록됐다(§12-22).
      const response = await api.post<BulkResult>('/api/events/bulk', { events })
      setResult(response)
      if (response.conflicts.length === 0) navigate(ROUTES.schedule)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setResult((error.body as BulkResult) ?? null)
      } else {
        setFormError(messageOf(error, '등록하지 못했습니다.'))
      }
    } finally {
      setSaving(false)
    }
  }

  const totalDays = rows.reduce((sum, row) => sum + datesInRange(row.start, row.end).length, 0)

  return (
    <>
      <div className={styles.rows}>
        {rows.map((row) => (
          <div key={row.key} className={styles.row}>
            <select
              className={styles.select}
              value={row.type}
              onChange={(e) => patch(row.key, { type: e.target.value as EventType })}
              aria-label="일정 유형"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABEL[type]}
                </option>
              ))}
            </select>

            <div className={styles.dateGroup}>
              <input
                type="date"
                className={styles.input}
                value={row.start}
                onChange={(e) => patch(row.key, { start: e.target.value })}
                aria-label="시작일"
              />
              <span className={styles.tilde}>~</span>
              <input
                type="date"
                className={styles.input}
                value={row.end}
                onChange={(e) => patch(row.key, { end: e.target.value })}
                aria-label="종료일"
              />
              <input
                type="text"
                className={cx(styles.input, styles.nameInput)}
                value={row.name}
                onChange={(e) => patch(row.key, { name: e.target.value })}
                placeholder="일정 이름"
                maxLength={100}
                aria-label="일정 이름"
              />
            </div>

            <div className={styles.rowActions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRows((c) => c.filter((r) => r.key !== row.key))}
                disabled={rows.length === 1}
                aria-label="행 삭제"
              >
                <TrashIcon />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setRows((c) => [...c, emptyRow()])}>
          <PlusIcon /> 행 추가
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? '등록 중…' : `${totalDays}건 등록`}
        </Button>
      </div>

      {formError && (
        <div className={cx(styles.result, styles.resultConflict)} role="alert">
          <p className={styles.resultTitle}>{formError}</p>
        </div>
      )}

      {/* 중복이 있으면 **화면을 옮기지 않는다.** 입력한 행을 그대로 두고
          무엇이 들어갔고 무엇이 막혔는지 그 자리에서 알린다. */}
      {result && result.conflicts.length > 0 && (
        <div className={cx(styles.result, styles.resultConflict)} role="alert">
          <p className={styles.resultTitle}>
            {result.created.length}건 등록, {result.conflicts.length}건 실패
          </p>
          <ul className={styles.conflictList}>
            {result.conflicts.map((conflict, index) => (
              <li key={`${conflict.date}-${index}`}>
                <code>{conflict.date}</code> {conflict.name} — {conflict.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

/* ── 수정 탭 ────────────────────────────────────────────────────────────── */

function EditTab() {
  const now = useMemo(() => new Date(), [])
  const [year] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const events = useApiResource<TeamEvent[]>(`/api/events?year=${year}`)
  const [drafts, setDrafts] = useState<Record<number, TeamEvent>>({})
  const [savedKey, setSavedKey] = useState<number | null>(null)
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null)
  const [deleting, setDeleting] = useState<TeamEvent | null>(null)
  const [busy, setBusy] = useState(false)

  const visible = useMemo(() => {
    const prefix = isoMonth(year, month)
    return (events.data ?? [])
      .filter((event) => (drafts[event.id]?.date ?? event.date).startsWith(prefix))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events.data, drafts, year, month])

  const valueOf = (event: TeamEvent) => drafts[event.id] ?? event

  function patch(event: TeamEvent, changes: Partial<TeamEvent>) {
    setDrafts((current) => ({ ...current, [event.id]: { ...valueOf(event), ...changes } }))
  }

  async function saveRow(event: TeamEvent) {
    const draft = valueOf(event)
    const check = validateEventName(draft.name)
    if (!check.valid) {
      setRowError({ id: event.id, message: check.error })
      return
    }
    setRowError(null)
    setBusy(true)
    try {
      await api.put(`/api/events/${event.id}`, {
        date: draft.date,
        type: draft.type,
        name: draft.name.trim(),
      })
      setSavedKey(event.id)
      window.setTimeout(() => setSavedKey(null), 1500)
      events.reload()
      setDrafts((current) => {
        const next = { ...current }
        delete next[event.id]
        return next
      })
    } catch (error) {
      setRowError({ id: event.id, message: messageOf(error, '저장하지 못했습니다.') })
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await api.delete(`/api/events/${deleting.id}`)
      setDeleting(null)
      events.reload()
    } catch (error) {
      setRowError({ id: deleting.id, message: messageOf(error, '삭제하지 못했습니다.') })
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  if (events.error) {
    return <ErrorState error={events.error} what="일정" onRetry={events.reload} />
  }
  if (events.loading) return <Skeleton height="16rem" radius="var(--radius-field)" />

  return (
    <>
      <div className={styles.filterRow}>
        {MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            className={cx(styles.chip, m === month && styles.chipActive)}
            aria-pressed={m === month}
            onClick={() => setMonth(m)}
          >
            {m}월
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={`${year}년 ${month}월에 등록된 일정이 없습니다`}
          description="다른 달을 선택하거나 추가 탭에서 등록해 주세요."
        />
      ) : (
        <div className={styles.rows}>
          {visible.map((event) => {
            const draft = valueOf(event)
            const dirty = drafts[event.id] !== undefined
            const error = rowError?.id === event.id ? rowError.message : null

            return (
              <div
                key={event.id}
                className={cx(styles.row, savedKey === event.id && styles.rowSaved)}
              >
                <select
                  className={styles.select}
                  value={draft.type}
                  onChange={(e) => patch(event, { type: e.target.value as EventType })}
                  aria-label="일정 유형"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {EVENT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>

                <div className={styles.fieldGroup}>
                  <div className={styles.dateGroup}>
                    <input
                      type="date"
                      className={styles.input}
                      value={draft.date}
                      onChange={(e) => patch(event, { date: e.target.value })}
                      aria-label="날짜"
                    />
                    <input
                      type="text"
                      className={cx(styles.input, styles.nameInput)}
                      value={draft.name}
                      onChange={(e) => patch(event, { name: e.target.value })}
                      maxLength={100}
                      aria-label="일정 이름"
                      aria-invalid={error ? true : undefined}
                    />
                  </div>
                  {error && (
                    <p className={styles.resultTitle} style={{ color: 'var(--negative)' }} role="alert">
                      {error}
                    </p>
                  )}
                </div>

                <div className={styles.rowActions}>
                  <Button
                    variant="positive"
                    size="sm"
                    onClick={() => void saveRow(event)}
                    disabled={busy || !dirty}
                  >
                    <CheckIcon /> 저장
                  </Button>
                  <Button
                    variant="negative"
                    size="sm"
                    onClick={() => setDeleting(event)}
                    disabled={busy}
                    aria-label="일정 삭제"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="일정을 삭제할까요?"
        description={
          deleting ? `${deleting.date} · ${deleting.name}\n삭제하면 되돌릴 수 없습니다.` : ''
        }
        confirmLabel="삭제"
        loading={busy}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
