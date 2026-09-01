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

export function deleteEvent(id: number): boolean {
  const index = events.findIndex((e) => e.id === id)
  if (index === -1) return false
  events.splice(index, 1)
  return true
}
