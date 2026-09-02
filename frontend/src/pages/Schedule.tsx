import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@radix-ui/react-icons'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/Button'
import { Popover } from '@/components/Popover'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useScheduleData } from '@/hooks/useScheduleData'
import { cx } from '@/lib/cx'
import { EVENT_TYPE_LABEL } from '@/lib/labels'
import { isManagerRole } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import type { EventType } from '@/types/schedule'

import styles from './Schedule.module.css'

/** 구 구현의 MIN_YEAR. 이보다 이전 달로는 갈 수 없다. */
const MIN_YEAR = 2000
const MAX_YEAR = new Date().getFullYear() + 5

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const CHIP_CLASS: Record<EventType, string> = {
  training: styles.chipTraining,
  meeting: styles.chipMeeting,
  events: styles.chipEvents,
  etc: styles.chipEtc,
}

const DOT_CLASS: Record<EventType, string> = {
  training: styles.dotTraining,
  meeting: styles.dotMeeting,
  events: styles.dotEvents,
  etc: styles.dotEtc,
}

const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`

export default function Schedule() {
  const { user } = useAuth()
  const canEdit = isManagerRole(user?.authority)

  const today = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  }, [])

  const [year, setYear] = useState(today.year)
  const [month, setMonth] = useState(today.month)
  const [pickerOpen, setPickerOpen] = useState(false)

  const { holidayMap, eventMap, loading, error, reload } = useScheduleData(year)

  const cells = useMemo(() => buildCells(year, month), [year, month])

  const monthEvents = useMemo(() => {
    const prefix = `${year}-${pad(month)}`
    return [...eventMap.entries()]
      .filter(([date]) => date.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([date, list]) => list.map((event) => ({ date, event })))
  }, [eventMap, year, month])

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1)
    const nextYear = next.getFullYear()
    if (nextYear < MIN_YEAR || nextYear > MAX_YEAR) return
    setYear(nextYear)
    setMonth(next.getMonth() + 1)
  }

  const isCurrentMonth = year === today.year && month === today.month

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>일정</h1>

      <div className={styles.toolbar}>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => shiftMonth(-1)}
            aria-label="이전 달"
          >
            <ChevronLeftIcon />
          </button>

          <Popover
            label="연도와 월 선택"
            align="center"
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            trigger={
              <button type="button" className={styles.monthLabel}>
                {year}. {pad(month)}
              </button>
            }
          >
            <YearMonthPicker
              year={year}
              month={month}
              onChangeYear={setYear}
              onSelectMonth={(m) => {
                setMonth(m)
                // 월을 고르면 볼일이 끝났다. 연도만 바꿀 때는 열어 둔다
                setPickerOpen(false)
              }}
            />
          </Popover>

          <button
            type="button"
            className={styles.navButton}
            onClick={() => shiftMonth(1)}
            aria-label="다음 달"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* 이미 이번 달을 보고 있으면 누를 이유가 없다 */}
        {!isCurrentMonth && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setYear(today.year)
              setMonth(today.month)
            }}
          >
            <CalendarIcon /> 오늘
          </Button>
        )}

        <div className={styles.spacer} />

        {canEdit && (
          <Button size="sm" asChild>
            <Link to={ROUTES.scheduleWrite}>
              <PlusIcon /> 일정 추가
            </Link>
          </Button>
        )}
      </div>

      {error ? (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <ErrorState error={error} what="일정" onRetry={reload} />
        </div>
      ) : loading ? (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <Skeleton height="28rem" radius="var(--radius-field)" />
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {DAY_LABELS.map((label) => (
              <div key={label} className={styles.dayLabel}>
                {label}
              </div>
            ))}

            {cells.map(({ date, day, inMonth, weekday }) => {
              const holidays = holidayMap.get(date) ?? []
              const events = eventMap.get(date) ?? []
              const isRed = weekday === 0 || holidays.length > 0
              const isToday =
                year === today.year && month === today.month && inMonth && day === today.day

              return (
                <div key={date} className={cx(styles.cell, !inMonth && styles.cellOutside)}>
                  <span
                    className={cx(
                      styles.dateNumber,
                      isRed && inMonth && styles.dateRed,
                      isToday && styles.dateToday,
                    )}
                  >
                    {day}
                  </span>

                  {holidays.map((holiday) => (
                    <span key={holiday.id} className={styles.holidayName} title={holiday.name}>
                      {holiday.name}
                    </span>
                  ))}

                  {events.map((event) => (
                    <span
                      key={event.id}
                      className={cx(styles.chip, CHIP_CLASS[event.type])}
                      title={`${EVENT_TYPE_LABEL[event.type]} · ${event.name}`}
                    >
                      <span className={styles.chipType}>{EVENT_TYPE_LABEL[event.type]}</span>
                      <span className={styles.chipName}>{event.name}</span>
                    </span>
                  ))}

                  {/* 모바일에서는 칩 대신 점만 보인다 */}
                  <span className={styles.dots}>
                    {holidays.length > 0 && <span className={cx(styles.dot, styles.dotHoliday)} />}
                    {events.slice(0, 3).map((event) => (
                      <span key={event.id} className={cx(styles.dot, DOT_CLASS[event.type])} />
                    ))}
                  </span>
                </div>
              )
            })}
          </div>

          {/* 모바일 전용 목록. 좁은 격자에서는 이름을 읽을 수 없다 */}
          <div className={styles.monthList}>
            <h2 className={styles.listHeading}>
              {month}월 일정 {monthEvents.length}건
            </h2>
            {monthEvents.length === 0 ? (
              <EmptyState title="이 달에는 등록된 일정이 없습니다" />
            ) : (
              monthEvents.map(({ date, event }) => (
                <div key={event.id} className={styles.listItem}>
                  <span className={styles.listDate}>
                    {Number(date.slice(8))}일 ({DAY_LABELS[new Date(date).getDay()]})
                  </span>
                  <span className={styles.listBody}>
                    <span className={cx(styles.chip, CHIP_CLASS[event.type])} style={{ width: 'auto' }}>
                      <span className={styles.chipType}>{EVENT_TYPE_LABEL[event.type]}</span>
                    </span>
                    <span className={styles.listName}>{event.name}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  )
}

/* ── 격자 계산 ──────────────────────────────────────────────────────────── */

type Cell = { date: string; day: number; inMonth: boolean; weekday: number }

/** 앞뒤 달의 날짜로 빈칸을 채워 7의 배수로 맞춘다. */
function buildCells(year: number, month: number): Cell[] {
  const first = new Date(year, month - 1, 1)
  const firstWeekday = first.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: Cell[] = []
  const push = (d: Date, inMonth: boolean) =>
    cells.push({
      date: isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      day: d.getDate(),
      inMonth,
      weekday: d.getDay(),
    })

  for (let i = firstWeekday; i > 0; i--) push(new Date(year, month - 1, 1 - i), false)
  for (let d = 1; d <= daysInMonth; d++) push(new Date(year, month - 1, d), true)
  while (cells.length % 7 !== 0) {
    push(new Date(year, month - 1, daysInMonth + 1 + (cells.length - firstWeekday - daysInMonth)), false)
  }
  return cells
}

/* ── 연·월 피커 ─────────────────────────────────────────────────────────── */

function YearMonthPicker({
  year,
  month,
  onChangeYear,
  onSelectMonth,
}: {
  year: number
  month: number
  onChangeYear: (year: number) => void
  onSelectMonth: (month: number) => void
}) {
  return (
    <div>
      <div className={styles.pickerYear}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => onChangeYear(Math.max(MIN_YEAR, year - 1))}
          disabled={year <= MIN_YEAR}
          aria-label="이전 해"
        >
          <ChevronLeftIcon />
        </button>
        <span className={styles.monthLabel}>{year}</span>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => onChangeYear(Math.min(MAX_YEAR, year + 1))}
          disabled={year >= MAX_YEAR}
          aria-label="다음 해"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className={styles.pickerGrid}>
        {MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            className={cx(styles.pickerCell, m === month && styles.pickerCellActive)}
            onClick={() => onSelectMonth(m)}
          >
            {m}월
          </button>
        ))}
      </div>
    </div>
  )
}
