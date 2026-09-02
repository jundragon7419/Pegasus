import { useMemo } from 'react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { useScheduleData } from '@/hooks/useScheduleData'
import { cx } from '@/lib/cx'
import { POST_TYPE_LABEL } from '@/lib/labels'
import { ROUTES } from '@/lib/routes'
import type { RecentPost } from '@/types/board'

import styles from './Home.module.css'

/** 홈 위젯이 채우는 줄 수. 고정글이 많으면 최신글이 그만큼 줄어든다. */
const WIDGET_SIZE = 8

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        {/*
          첫 화면에 바로 보이는 이미지라 초기 로딩을 그대로 붙든다.
          원본 JPEG 는 207KB — 모바일에서 그만큼을 다 받을 이유가 없다.

          `<picture>` 로 WebP 를 우선 주되 `<img src>` 의 JPEG 를 그대로 남긴다.
          WebP 를 못 읽는 브라우저는 fallback 을 받고, 나머지는 뷰포트에 맞는
          변형만 받는다(모바일 19.6KB · 데스크톱 100.9KB).
        */}
        <picture>
          <source
            type="image/webp"
            srcSet="/hero-640.webp 640w, /hero-1000.webp 1000w, /hero-1317.webp 1317w"
            sizes="100vw"
          />
          {/* 이미지에 문구가 들어 있어 alt 로 같은 내용을 전한다 */}
          <img
            className={styles.heroImage}
            src="/hero.jpg"
            alt="THINK WIN, PLAY WIN — 광운대학교 아마야구부 페가수스"
            width={1317}
            height={550}
            // 첫 화면에 바로 보이므로 지연 로딩하지 않는다
            fetchPriority="high"
          />
        </picture>
      </div>

      <div className={styles.content}>
        <BoardWidget />
        <ScheduleWidget />
      </div>
    </main>
  )
}

/* ── 게시판 위젯 ────────────────────────────────────────────────────────── */

function BoardWidget() {
  /**
   * 비로그인에게도 보이는 화면이므로 **공개 축약 엔드포인트**를 쓴다(§12-1).
   * 목록(`/api/posts`)은 basic+ 전용이고 작성자·조회수까지 담는다.
   * 정렬과 개수 제한은 서버가 이미 했으므로 여기서는 고정글 경계만 찾는다.
   */
  const posts = useApiResource<RecentPost[]>(`/api/posts/recent?limit=${WIDGET_SIZE}`)

  const { pinned, recent } = useMemo(() => {
    const all = posts.data ?? []
    return {
      pinned: all.filter((post) => post.isPinned),
      recent: all.filter((post) => !post.isPinned),
    }
  }, [posts.data])

  return (
    <section>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>게시판</h2>
        <Link to={ROUTES.board} className={styles.moreLink}>
          전체 보기 →
        </Link>
      </div>

      {posts.error ? (
        <ErrorState error={posts.error} what="게시글" onRetry={posts.reload} />
      ) : posts.loading ? (
        <div className={styles.postList}>
          {Array.from({ length: WIDGET_SIZE }, (_, index) => (
            <div key={index} className={styles.postRow}>
              <Skeleton width="3rem" height="1.1rem" radius="var(--radius-pill)" />
              <Skeleton height="1rem" />
              <Skeleton width="3.5rem" height="0.75rem" />
            </div>
          ))}
        </div>
      ) : pinned.length + recent.length === 0 ? (
        <EmptyState title="아직 게시글이 없습니다" description="첫 글을 남겨 보세요." />
      ) : (
        <div className={styles.postList}>
          {[...pinned, ...recent].map((post, index) => (
            <Link
              key={post.id}
              to={ROUTES.boardDetail(post.id)}
              className={cx(
                styles.postRow,
                // 고정글 구간의 마지막 줄에 굵은 구분선을 둔다
                pinned.length > 0 && index === pinned.length - 1 && styles.pinnedDivider,
              )}
            >
              <span
                className={cx(styles.postType, post.type === 'notice' && styles.postTypeNotice)}
              >
                {POST_TYPE_LABEL[post.type]}
              </span>
              <span className={styles.postTitle}>{post.title}</span>
              <span className={styles.postDate}>{post.date.slice(5)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

/* ── 일정 위젯 ──────────────────────────────────────────────────────────── */

function ScheduleWidget() {
  // Date 객체를 렌더 스코프에 두면 매 렌더마다 새 참조가 생겨
  // 아래 useMemo 가 무효화된다. 원시값만 뽑아 쓴다.
  const { year, month, todayOfMonth } = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1, todayOfMonth: now.getDate() }
  }, [])

  const { holidayMap, eventMap, loading, error, reload } = useScheduleData(year)

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const list: Array<number | null> = Array.from({ length: firstWeekday }, () => null)
    for (let day = 1; day <= daysInMonth; day += 1) list.push(day)
    while (list.length % 7 !== 0) list.push(null)
    return list
  }, [year, month])

  return (
    <section>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>이번 달 일정</h2>
        <Link to={ROUTES.schedule} className={styles.moreLink}>
          달력 보기 →
        </Link>
      </div>

      {error ? (
        <ErrorState error={error} what="일정" onRetry={reload} />
      ) : loading ? (
        <Skeleton height="19rem" radius="var(--radius-panel)" />
      ) : (
        <Link to={ROUTES.schedule} className={styles.calendar}>
          <span className={styles.calendarMonth}>
            {year}. {pad(month)}
          </span>

          <div className={styles.calendarGrid}>
            {DAY_LABELS.map((label) => (
              <span key={label} className={styles.dayLabel}>
                {label}
              </span>
            ))}

            {cells.map((day, index) => {
              if (day === null) {
                return <span key={`empty-${index}`} className={cx(styles.cell, styles.cellEmpty)} />
              }

              const key = isoDate(year, month, day)
              const holidays = holidayMap.get(key) ?? []
              const events = eventMap.get(key) ?? []
              const isSunday = index % 7 === 0
              const isToday = day === todayOfMonth

              const names = [...holidays.map((h) => h.name), ...events.map((e) => e.name)]

              return (
                <span
                  key={key}
                  className={cx(
                    styles.cell,
                    (isSunday || holidays.length > 0) && styles.cellRed,
                    isToday && styles.cellToday,
                  )}
                  title={names.length > 0 ? names.join(', ') : undefined}
                >
                  {day}
                  <span className={styles.dots}>
                    {holidays.length > 0 && <span className={cx(styles.dot, styles.dotHoliday)} />}
                    {events.length > 0 && <span className={styles.dot} />}
                  </span>
                </span>
              )
            })}
          </div>

          <div className={styles.calendarLegend}>
            <span className={styles.legendItem}>
              <span className={cx(styles.dot, styles.dotHoliday)} /> 공휴일
            </span>
            <span className={styles.legendItem}>
              <span className={styles.dot} /> 팀 일정
            </span>
          </div>
        </Link>
      )}
    </section>
  )
}
