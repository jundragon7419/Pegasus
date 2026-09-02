import type { ReactNode } from 'react'

import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { cx } from '@/lib/cx'

import styles from './AdminTable.module.css'

export type AdminColumn<T> = {
  key: string
  label: string
  render: (row: T) => ReactNode
  /** 숫자 열처럼 오른쪽 정렬이 필요한 경우 */
  align?: 'start' | 'end'
  /** 좁은 화면에서 접을 열. 카드 모드에서는 접지 않고 라벨과 함께 보여준다 */
  minor?: boolean
}

type AdminTableProps<T> = {
  rows: T[] | null
  columns: AdminColumn<T>[]
  getKey: (row: T) => string | number
  /** 행마다 붙는 버튼들 */
  actions?: (row: T) => ReactNode
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  emptyTitle: string
  emptyDescription?: string
  what?: string
}

/**
 * 관리자 화면의 표 8개가 공유한다.
 *
 * **≤768px 에서 각 행을 카드로 바꾼다(§12-26).** 구 관리자 화면의 테이블은
 * 데스크톱 전용이라 모바일에서 가로로 넘쳤다. 표를 가로 스크롤로 감싸는 방법도
 * 있지만, 행마다 액션 버튼이 있어 **스크롤 끝까지 밀어야 누를 수 있게** 된다.
 * 카드로 바꾸면 각 행의 값과 버튼이 한눈에 들어온다.
 *
 * 데스크톱에서는 `<table>` 을 쓴다 — 열 정렬과 스크린리더의 행·열 탐색이
 * div 격자보다 낫다.
 */
export function AdminTable<T>({
  rows,
  columns,
  getKey,
  actions,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  what = '목록',
}: AdminTableProps<T>) {
  if (error) return <ErrorState error={error} what={what} onRetry={onRetry} />

  if (loading || rows === null) {
    return (
      <div className={styles.skeleton}>
        <Skeleton height="2.5rem" />
        <Skeleton height="2.5rem" />
        <Skeleton height="2.5rem" />
      </div>
    )
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <>
      {/* 데스크톱 — 표 */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cx(column.align === 'end' && styles.end, column.minor && styles.minor)}
                  scope="col"
                >
                  {column.label}
                </th>
              ))}
              {actions && <th className={styles.end}>관리</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cx(column.align === 'end' && styles.end, column.minor && styles.minor)}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {actions && <td className={cx(styles.end, styles.actionCell)}>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 — 카드 */}
      <ul className={styles.cards}>
        {rows.map((row) => (
          <li key={getKey(row)} className={styles.card}>
            <dl className={styles.cardFields}>
              {columns.map((column) => (
                <div key={column.key} className={styles.cardField}>
                  <dt className={styles.cardLabel}>{column.label}</dt>
                  <dd className={styles.cardValue}>{column.render(row)}</dd>
                </div>
              ))}
            </dl>
            {actions && <div className={styles.cardActions}>{actions(row)}</div>}
          </li>
        ))}
      </ul>
    </>
  )
}
