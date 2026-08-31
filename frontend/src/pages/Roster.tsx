import { useMemo, useState } from 'react'

import { SearchInput } from '@/components/SearchInput'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { cx } from '@/lib/cx'
import type { ActiveYear, RosterEntry, RosterRole } from '@/types/roster'

import styles from './Roster.module.css'

type FilterKey = 'all' | 'player' | 'staff' | 'manager' | 'retired'

const FILTERS: Array<{ key: FilterKey; label: string; roles: RosterRole[] }> = [
  { key: 'all', label: '전체', roles: [] },
  { key: 'player', label: '선수', roles: ['roster_player'] },
  { key: 'staff', label: '감독 · 회장', roles: ['roster_headcoach', 'roster_president'] },
  { key: 'manager', label: '매니저', roles: ['roster_manager'] },
  { key: 'retired', label: '영구결번', roles: ['roster_retired'] },
]

/** 역할에 따라 카드에 붙는 배지. */
function badgesFor(role: RosterRole): Array<{ label: string; retired?: boolean }> {
  switch (role) {
    case 'roster_headcoach':
      return [{ label: 'HC' }]
    case 'roster_president':
      return [{ label: 'PD' }]
    case 'roster_manager':
      return [{ label: 'M' }]
    case 'roster_retired':
      return [{ label: '영구결번', retired: true }]
    default:
      return []
  }
}

export default function Roster() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  /** 사용자가 직접 고른 연도만 담는다. 고르기 전에는 활성 연도를 쓴다 */
  const [pickedYear, setPickedYear] = useState<number | null>(null)

  const activeYear = useApiResource<ActiveYear>('/api/roster/active-year')
  const years = useApiResource<number[]>('/api/roster/years')

  // 효과로 초기값을 밀어넣지 않고 렌더 중에 파생한다.
  const selectedYear = pickedYear ?? activeYear.data?.year ?? null

  const roster = useApiResource<RosterEntry[]>(
    selectedYear === null ? null : `/api/roster?year=${selectedYear}`,
  )

  const entries = useMemo(() => roster.data ?? [], [roster.data])

  const filtered = useMemo(() => {
    const allowed = FILTERS.find((f) => f.key === filter)?.roles ?? []
    const query = search.trim()

    return entries.filter((entry) => {
      const matchRole = allowed.length === 0 || allowed.includes(entry.role)
      const matchSearch = query === '' || entry.name.includes(query) || entry.number.includes(query)
      return matchRole && matchSearch
    })
  }, [entries, filter, search])

  const loading = activeYear.loading || years.loading || roster.loading
  const error = activeYear.error ?? years.error ?? roster.error

  return (
    <main className={styles.page}>
      <p className={styles.season}>{selectedYear ?? '····'} KWU PEGASUS</p>
      <h1 className={styles.title}>선수단 명단</h1>
      {!loading && !error && (
        <p className={styles.count}>
          {filtered.length}명
          {filtered.length !== entries.length && ` / 전체 ${entries.length}명`}
        </p>
      )}

      <div className={styles.controls}>
        {/* 연도가 하나뿐이면 탭을 보여줄 이유가 없다 */}
        {(years.data?.length ?? 0) > 1 && (
          <div className={styles.chipRow}>
            {years.data?.map((year) => (
              <button
                key={year}
                type="button"
                className={cx(styles.chip, selectedYear === year && styles.chipActive)}
                aria-pressed={selectedYear === year}
                onClick={() => setPickedYear(year)}
              >
                {year}
              </button>
            ))}
          </div>
        )}

        <div className={styles.chipRow}>
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={cx(styles.chip, filter === item.key && styles.chipActive)}
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.searchRow}>
          <SearchInput
            value={search}
            onChange={setSearch}
            label="선수 이름 또는 등번호 검색"
            placeholder="이름 · 등번호 검색"
          />
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <ErrorState
            error={error}
            what="선수단 명단"
            onRetry={() => {
              activeYear.reload()
              years.reload()
              roster.reload()
            }}
          />
        </div>
      ) : loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className={styles.skeletonCard}>
              <Skeleton width="3rem" height="2.5rem" />
              <Skeleton width="60%" height="1.25rem" />
              <Skeleton width="40%" height="0.75rem" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <EmptyState
            title={entries.length === 0 ? `${selectedYear}년 명단이 없습니다` : '조건에 맞는 선수가 없습니다'}
            description={
              entries.length === 0
                ? '다른 연도를 선택해 주세요.'
                : '필터나 검색어를 바꿔 보세요.'
            }
          />
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((entry) => {
            const badges = badgesFor(entry.role)
            const isRetired = entry.role === 'roster_retired'
            return (
              // 같은 연도 안에서 학번이 UNIQUE 이므로 key 로 안전하다
              <article
                key={entry.studentId}
                className={cx(styles.card, isRetired && styles.cardRetired)}
              >
                <span className={styles.number}>{entry.number}</span>
                <span className={styles.name}>{entry.name}</span>
                <span className={styles.meta}>{entry.generation}기</span>
                {badges.length > 0 && (
                  <div className={styles.badges}>
                    {badges.map((badge) => (
                      <span
                        key={badge.label}
                        className={cx(styles.badge, badge.retired && styles.badgeRetired)}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
