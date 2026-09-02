import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDownIcon, ExternalLinkIcon } from '@radix-ui/react-icons'

import { cx } from '@/lib/cx'
import { formatDateTime } from '@/lib/date'
import {
  ACTIVITY_ACTION_LABEL,
  DETAIL_FIELDS,
  groupOf,
  isUpdateLog,
  summarize,
} from '@/lib/activityLog'
import { DETAILED_LOG_ACTIONS, type ActivityLog } from '@/types/activity-log'

import styles from './LogList.module.css'

/**
 * 활동 로그 목록. 마이페이지와 **다음 페이즈의 활동내역 화면이 함께 쓴다.**
 *
 * 스냅샷은 액션마다 필드가 다르므로(§8.1) `lib/activityLog.ts` 의 표를 보고 그린다.
 * 수정 로그는 `{ before, after }` 라 변경 전·후를 나란히 보여준다(§12-7) —
 * 구 구현은 수정 후 값만 남겨 무엇이 바뀌었는지 알 수 없었다.
 */
export function LogList({
  items,
  detailBase,
}: {
  items: ActivityLog[]
  /**
   * 있으면 게시글·댓글 로그에 상세 링크를 붙인다(`${detailBase}/${id}`).
   * 마이페이지에는 상세 화면이 없으므로 넘기지 않는다.
   */
  detailBase?: string
}) {
  return (
    <ul className={styles.list}>
      {items.map((entry) => (
        <li key={entry.id}>
          <LogRow entry={entry} detailBase={detailBase} />
        </li>
      ))}
    </ul>
  )
}

function LogRow({ entry, detailBase }: { entry: ActivityLog; detailBase?: string }) {
  const [open, setOpen] = useState(false)
  const group = groupOf(entry.action)
  const fields = DETAIL_FIELDS[group]
  const snapshot = entry.snapshot
  // §6.3 — 게시글·댓글 로그만 상세 화면을 갖는다
  const detailHref =
    detailBase && DETAILED_LOG_ACTIONS.includes(entry.action) ? `${detailBase}/${entry.id}` : null

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.head}
        onClick={() => setOpen((v) => !v)}
        disabled={!snapshot}
        aria-expanded={snapshot ? open : undefined}
      >
        <span className={cx(styles.action, styles[group])}>
          {ACTIVITY_ACTION_LABEL[entry.action]}
        </span>
        <span className={styles.summary}>{summarize(entry)}</span>
        <span className={styles.time}>{formatDateTime(entry.createdAt)}</span>
        {snapshot && <ChevronDownIcon className={cx(styles.chevron, open && styles.chevronOpen)} />}
      </button>

      {open && snapshot && (
        <div className={styles.detail}>
          {detailHref && (
            <Link to={detailHref} className={styles.detailLink}>
              <ExternalLinkIcon />
              상세 화면으로 열기
            </Link>
          )}
          {isUpdateLog(entry.action) ? (
            <DiffTable
              fields={fields}
              before={snapshot.before as Record<string, unknown>}
              after={snapshot.after as Record<string, unknown>}
            />
          ) : (
            <FieldList fields={fields} values={snapshot} />
          )}
        </div>
      )}
    </div>
  )
}

type Field = { key: string; label: string }

function FieldList({ fields, values }: { fields: Field[]; values: Record<string, unknown> }) {
  const present = fields.filter((f) => values[f.key] !== undefined && values[f.key] !== null)
  if (present.length === 0) return <p className={styles.empty}>남은 내용이 없습니다.</p>

  return (
    <dl className={styles.fields}>
      {present.map((field) => (
        <div key={field.key} className={styles.field}>
          <dt className={styles.fieldLabel}>{field.label}</dt>
          <dd className={styles.fieldValue}>{display(values[field.key])}</dd>
        </div>
      ))}
    </dl>
  )
}

/** 변경 전·후를 나란히. 실제로 바뀐 필드만 강조한다. */
function DiffTable({
  fields,
  before,
  after,
}: {
  fields: Field[]
  before: Record<string, unknown>
  after: Record<string, unknown>
}) {
  const rows = fields.filter(
    (f) => before?.[f.key] !== undefined || after?.[f.key] !== undefined,
  )

  return (
    <div className={styles.diff}>
      <div className={styles.diffHead}>
        <span />
        <span>변경 전</span>
        <span>변경 후</span>
      </div>
      {rows.map((field) => {
        const changed = display(before?.[field.key]) !== display(after?.[field.key])
        return (
          <div key={field.key} className={cx(styles.diffRow, changed && styles.diffChanged)}>
            <span className={styles.fieldLabel}>{field.label}</span>
            <span className={styles.diffBefore}>{display(before?.[field.key])}</span>
            <span className={styles.diffAfter}>{display(after?.[field.key])}</span>
          </div>
        )
      })}
    </div>
  )
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}
