import { useMemo, useState } from 'react'

import { Checkbox } from '@/components/Checkbox'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/Tabs'
import { InfoTooltip } from '@/components/Tooltip'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { cx } from '@/lib/cx'
import { BATTING_COLUMNS, PITCHING_COLUMNS, formatCell, type StatColumn } from '@/lib/statColumns'
import type { ActiveYear } from '@/types/roster'
import { parseInnings, type BattingRecord, type PitchingRecord } from '@/types/records'

import styles from './Records.module.css'

type SortState = { key: string; direction: 'asc' | 'desc' }

/** 정렬용 원시값. 이름은 문자열, 이닝은 아웃 카운트를 반영해 숫자로 바꾼다. */
function sortValue(row: Record<string, unknown>, key: string): number | string {
  if (key === 'name') return (row.user as { name?: string } | undefined)?.name ?? ''
  if (key === 'innings') return parseInnings(String(row.innings ?? '0'))
  const value = row[key]
  if (typeof value === 'number') return value
  const asNumber = Number(value)
  return Number.isFinite(asNumber) ? asNumber : String(value ?? '')
}

function sortRows<T extends Record<string, unknown>>(rows: T[], sort: SortState): T[] {
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key)
    const bv = sortValue(b, sort.key)
    if (typeof av === 'number' && typeof bv === 'number') {
      return sort.direction === 'desc' ? bv - av : av - bv
    }
    return sort.direction === 'desc'
      ? String(bv).localeCompare(String(av), 'ko')
      : String(av).localeCompare(String(bv), 'ko')
  })
}

export default function Records() {
  const activeYear = useApiResource<ActiveYear>('/api/roster/active-year')
  const batting = useApiResource<BattingRecord[]>('/api/records/batting')
  const pitching = useApiResource<PitchingRecord[]>('/api/records/pitching')

  const loading = batting.loading || pitching.loading
  const error = batting.error ?? pitching.error

  const batters = useMemo(() => batting.data ?? [], [batting.data])
  const pitchers = useMemo(() => pitching.data ?? [], [pitching.data])

  // 규정타석 = 팀 경기 수, 규정이닝 = 팀 경기 수 × 5/9 (내림)
  const teamGames = batters[0]?.tgame ?? pitchers[0]?.tgame ?? 0
  const requiredPA = teamGames > 0 ? teamGames : null
  const requiredIP = teamGames > 0 ? Math.floor((teamGames * 5) / 9) : null

  const reloadAll = () => {
    activeYear.reload()
    batting.reload()
    pitching.reload()
  }

  if (error) {
    return (
      <main className={styles.page}>
        <RecordsHeader year={activeYear.data?.year} />
        <div className={styles.panel}>
          <ErrorState error={error} what="시즌 기록" onRetry={reloadAll} />
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <RecordsHeader year={activeYear.data?.year} />
        <div className={styles.panel}>
          <Skeleton height="2rem" />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Skeleton height="18rem" radius="var(--radius-field)" />
          </div>
        </div>
      </main>
    )
  }

  if (batters.length === 0 && pitchers.length === 0) {
    return (
      <main className={styles.page}>
        <RecordsHeader year={activeYear.data?.year} />
        <div className={styles.panel}>
          <EmptyState
            title="아직 기록이 없습니다"
            description="시즌이 시작되고 경기가 치러지면 이곳에 타격·투구 기록이 표시됩니다."
          />
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <RecordsHeader year={activeYear.data?.year} />

      <TabsRoot defaultValue="team">
        <div className={styles.tabsRow}>
          <TabsList aria-label="기록 종류">
            <TabsTrigger value="team">팀</TabsTrigger>
            <TabsTrigger value="batter">타자</TabsTrigger>
            <TabsTrigger value="pitcher">투수</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="team" className={styles.panel}>
          <div className={styles.podiums}>
            <Podium
              title="타자 oWAR"
              criteria="공격 승리 기여"
              rows={sortRows(batters, { key: '_owar', direction: 'desc' }).slice(0, 3)}
              statKey="_owar"
              statLabel="oWAR"
            />
            <Podium
              title="투수 pWAR"
              criteria="투구 승리 기여"
              rows={sortRows(pitchers, { key: '_pwar', direction: 'desc' }).slice(0, 3)}
              statKey="_pwar"
              statLabel="pWAR"
            />
          </div>
        </TabsContent>

        <TabsContent value="batter" className={styles.panel}>
          <StatTable
            columns={BATTING_COLUMNS}
            rows={batters}
            defaultSortKey="_owar"
            filterLabel="규정타석 이상만"
            filterHint={
              requiredPA === null
                ? null
                : `규정타석 = 팀 경기 수 = ${requiredPA}타석. 타석(PA)이 이보다 적은 선수를 숨깁니다.`
            }
            filterFn={requiredPA === null ? null : (row) => row.htb >= requiredPA}
          />
        </TabsContent>

        <TabsContent value="pitcher" className={styles.panel}>
          <StatTable
            columns={PITCHING_COLUMNS}
            rows={pitchers}
            defaultSortKey="_pwar"
            filterLabel="규정이닝 이상만"
            filterHint={
              requiredIP === null
                ? null
                : `규정이닝 = 팀 경기 수 × 5 ÷ 9 (내림) = ${requiredIP}이닝. 이보다 적게 던진 선수를 숨깁니다.`
            }
            filterFn={requiredIP === null ? null : (row) => parseInnings(row.innings) >= requiredIP}
          />
        </TabsContent>
      </TabsRoot>
    </main>
  )
}

function RecordsHeader({ year }: { year?: number }) {
  // 구 구현은 "2026 KWU PEGASUS" 가 하드코딩되어 있었다(§12-25).
  return (
    <>
      <p className={styles.season}>{year ?? '····'} KWU PEGASUS</p>
      <h1 className={styles.title}>시즌 기록</h1>
    </>
  )
}

/* ── 포디움 ─────────────────────────────────────────────────────────────── */

const MEDAL_LABELS = ['1ST', '2ND', '3RD']

type PodiumProps = {
  title: string
  criteria: string
  rows: Array<Record<string, unknown>>
  statKey: string
  statLabel: string
}

function Podium({ title, criteria, rows, statKey, statLabel }: PodiumProps) {
  return (
    <section className={styles.podiumSection}>
      <div className={styles.podiumHeader}>
        <h2 className={styles.podiumTitle}>{title} Top 3</h2>
        <span className={styles.podiumCriteria}>{criteria}</span>
      </div>
      <div className={styles.podium}>
        {[0, 1, 2].map((index) => {
          const row = rows[index]
          if (!row) return <div key={index} className={styles.podiumEmpty} />

          const name = (row.user as { name?: string } | undefined)?.name ?? '—'
          const number = (row._number as string | null) ?? '?'
          const rankClass = [styles.rank1, styles.rank2, styles.rank3][index]

          return (
            <div key={index} className={cx(styles.podiumCard, rankClass)}>
              <span className={styles.medalLabel}>{MEDAL_LABELS[index]}</span>
              <div className={styles.shield}>
                <svg viewBox="0 0 100 115" className={styles.shieldSvg} aria-hidden="true">
                  <path
                    d="M8,8 L92,8 L92,68 L50,107 L8,68 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={styles.shieldNumber}>{number}</span>
              </div>
              <p className={styles.podiumName}>{name}</p>
              <p className={styles.podiumStat}>
                {statLabel} {formatCell(row, statKey)}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ── 스탯 테이블 ────────────────────────────────────────────────────────── */

type StatTableProps<T extends Record<string, unknown>> = {
  columns: Array<StatColumn<never>>
  rows: T[]
  defaultSortKey: string
  filterLabel: string
  filterHint: string | null
  filterFn: ((row: T) => boolean) | null
}

function StatTable<T extends Record<string, unknown>>({
  columns,
  rows,
  defaultSortKey,
  filterLabel,
  filterHint,
  filterFn,
}: StatTableProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: defaultSortKey, direction: 'desc' })
  const [onlyQualified, setOnlyQualified] = useState(false)

  const visible = useMemo(() => {
    const filtered = onlyQualified && filterFn ? rows.filter(filterFn) : rows
    return sortRows(filtered, sort)
  }, [rows, sort, onlyQualified, filterFn])

  function toggleSort(key: string) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: 'desc' },
    )
  }

  return (
    <>
      {filterFn && (
        <div className={styles.filterRow}>
          <Checkbox checked={onlyQualified} onCheckedChange={setOnlyQualified}>
            {filterLabel}
          </Checkbox>
          {filterHint && <InfoTooltip label={`${filterLabel} 기준 설명`}>{filterHint}</InfoTooltip>}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="조건을 만족하는 선수가 없습니다"
          description="규정 조건을 해제하면 전체 기록을 볼 수 있습니다."
        />
      ) : (
        <div className={styles.tableFrame}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((column) => {
                    const key = String(column.key)
                    const active = sort.key === key
                    return (
                      <th
                        key={key}
                        className={cx(styles.headerCell, key === 'name' && styles.nameCell)}
                        title={column.title}
                        aria-sort={active ? (sort.direction === 'desc' ? 'descending' : 'ascending') : 'none'}
                        onClick={() => toggleSort(key)}
                      >
                        {column.label}
                        {active && <span className={styles.sortMark}>{sort.direction === 'desc' ? '▾' : '▴'}</span>}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, index) => (
                  <tr key={`${(row.user as { name?: string } | undefined)?.name ?? index}-${index}`}>
                    {columns.map((column) => {
                      const key = String(column.key)
                      return (
                        <td key={key} className={cx(key === 'name' && styles.nameCell)}>
                          {formatCell(row, key)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
