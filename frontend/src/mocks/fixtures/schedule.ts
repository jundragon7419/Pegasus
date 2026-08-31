import type { EventType, Holiday, TeamEvent } from '@/types/schedule'

/**
 * 일정·공휴일 픽스처.
 *
 * 날짜를 고정값으로 박아두면 다음 달에 미니 캘린더가 텅 비어 화면을 확인할 수 없다.
 * 그래서 **현재 월을 기준으로 생성**한다.
 */

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`

/** 해당 월의 마지막 날. month 는 1-12 */
const lastDayOf = (year: number, month: number) => new Date(year, month, 0).getDate()

type EventSeed = { day: number; type: EventType; name: string }

/** 한 달치 일정 패턴. 주말 훈련 위주로 배치한다. */
const MONTHLY_PATTERN: EventSeed[] = [
  { day: 4, type: 'training', name: '주말 정기훈련' },
  { day: 5, type: 'meeting', name: '코칭스태프 회의' },
  { day: 11, type: 'training', name: '주말 정기훈련' },
  { day: 12, type: 'events', name: '교내 리그 3차전' },
  { day: 18, type: 'training', name: '수비 집중훈련' },
  { day: 19, type: 'meeting', name: '월례 전체회의' },
  { day: 22, type: 'etc', name: '장비 정리' },
  { day: 25, type: 'training', name: '주말 정기훈련' },
  { day: 26, type: 'events', name: '연합 친선경기' },
]

/** 고정 공휴일(양력)만 넣는다. 음력 공휴일은 백엔드가 공공데이터 API 로 채운다. */
const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: '신정' },
  { month: 3, day: 1, name: '삼일절' },
  { month: 5, day: 5, name: '어린이날' },
  { month: 6, day: 6, name: '현충일' },
  { month: 8, day: 15, name: '광복절' },
  { month: 10, day: 3, name: '개천절' },
  { month: 10, day: 9, name: '한글날' },
  { month: 12, day: 25, name: '성탄절' },
]

/**
 * 해당 연도의 일정을 만든다.
 * 지금 달과 앞뒤 한 달에만 일정을 넣어, 미니 캘린더와 월간 캘린더 양쪽에서
 * 데이터가 보이면서도 전체가 과하게 빽빽해지지 않게 한다.
 */
export function makeEvents(year: number): TeamEvent[] {
  const now = new Date()
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : 5
  const months = [currentMonth - 1, currentMonth, currentMonth + 1].filter((m) => m >= 1 && m <= 12)

  const events: TeamEvent[] = []
  let id = year * 100

  for (const month of months) {
    const last = lastDayOf(year, month)
    for (const seed of MONTHLY_PATTERN) {
      if (seed.day > last) continue
      events.push({
        id: id++,
        date: iso(year, month, seed.day),
        type: seed.type,
        name: seed.name,
      })
    }
  }
  return events
}

export function makeHolidays(year: number): Holiday[] {
  return FIXED_HOLIDAYS.map((h, index) => ({
    id: year * 100 + index,
    date: iso(year, h.month, h.day),
    type: 'holiday',
    name: h.name,
  }))
}
