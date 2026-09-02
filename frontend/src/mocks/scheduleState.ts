import { makeEvents, makeHolidays } from '@/mocks/fixtures/schedule'
import type { EventType, Holiday, TeamEvent } from '@/types/schedule'

/**
 * 일정의 변경 가능한 목 상태.
 *
 * 픽스처는 매 호출마다 새로 만들어지므로, 추가·수정·삭제를 화면에서 끝까지
 * 걸어보려면 한 번 만들어 들고 있어야 한다. 탭 메모리에만 살며 새로고침하면
 * 초기 픽스처로 돌아간다.
 */

const YEARS_TO_SEED = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]

const events: TeamEvent[] = YEARS_TO_SEED.flatMap((year) => makeEvents(year))
const holidays: Holiday[] = YEARS_TO_SEED.flatMap((year) => makeHolidays(year))

let nextId = Math.max(0, ...events.map((e) => e.id)) + 1

export const listEvents = (year: number) => events.filter((e) => e.date.startsWith(String(year)))

export const listHolidays = (year: number) =>
  holidays.filter((h) => h.date.startsWith(String(year)))

export const findEvent = (id: number) => events.find((e) => e.id === id)

/** UNIQUE(date, name) — 같은 날 같은 이름은 등록할 수 없다(§5.5). */
export const hasDuplicate = (date: string, name: string, exceptId?: number) =>
  events.some((e) => e.date === date && e.name === name && e.id !== exceptId)

export function createEvent(input: { date: string; type: EventType; name: string }): TeamEvent {
  const event: TeamEvent = { id: nextId++, ...input }
  events.push(event)
  return event
}

export function updateEvent(
  id: number,
  input: { date: string; type: EventType; name: string },
): TeamEvent | null {
  const event = findEvent(id)
  if (!event) return null
  Object.assign(event, input)
  return event
}

/**
 * 공휴일 재동기화(§5.10 · §12-6).
 *
 * 구 구현은 **조회 시점에 자동으로** 공공 API 를 호출하고 DELETE/INSERT 를
 * 실행했다. 인증 없는 `?year=1900` 요청을 반복하면 외부 쿼터를 소진시킬 수
 * 있었다. 이제 staff+ 가 명시적으로 눌러야만 돈다.
 *
 * **목은 외부 API 를 대신하지 못한다.** 픽스처를 다시 심어 "동기화가 돌았고 몇 건이
 * 들어왔다"는 흐름만 재현한다. 실제 호출·실패·쿼터는 백엔드에서 확인해야 한다.
 */
export function resyncHolidays(year: number): number {
  for (let i = holidays.length - 1; i >= 0; i--) {
    if (holidays[i].date.startsWith(String(year))) holidays.splice(i, 1)
  }
  const fresh = makeHolidays(year)
  holidays.push(...fresh)
  return fresh.length
}

export function deleteEvent(id: number): boolean {
  const index = events.findIndex((e) => e.id === id)
  if (index === -1) return false
  events.splice(index, 1)
  return true
}
