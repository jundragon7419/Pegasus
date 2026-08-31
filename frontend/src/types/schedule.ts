/** 일정·공휴일 도메인. 블루프린트 §3.2, §5.5~5.6. */

/**
 * 일정 유형.
 * 구 스키마 주석은 `game/training/meeting/anniversary` 로 적혀 있었으나
 * 실제 ENUM 은 아래와 같았다(§12-24). 주석이 아니라 실제 값을 따른다.
 */
export type EventType = 'training' | 'meeting' | 'events' | 'etc'

export type TeamEvent = {
  id: number
  /** 'YYYY-MM-DD'. UNIQUE(date, name) — 같은 날 같은 이름은 등록할 수 없다 */
  date: string
  type: EventType
  name: string
}

/**
 * 공휴일.
 *
 * 구 스키마는 year/month/day 3컬럼으로 쪼개 저장해 events 의 DATE 한 컬럼과
 * 날짜 표현이 어긋났고, 프론트에서 매번 다르게 파싱해야 했다(§12-20).
 * 새 백엔드는 events 와 동일하게 'YYYY-MM-DD' 문자열로 통일한다.
 */
export type Holiday = {
  id: number
  date: string
  type: string
  name: string
}
