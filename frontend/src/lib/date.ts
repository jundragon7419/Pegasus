/**
 * 날짜 문자열 처리. 전부 **로컬 시간 기준**이다.
 *
 * `toISOString().slice(0, 10)` 은 UTC 날짜를 준다. 한국(UTC+9)에서는 자정부터
 * 오전 9시 사이에 **전날 날짜**가 나온다 — 오전 8시에 "7일 뒤"를 계산하면
 * 하루 짧은 값이 돌아온다. 사용자가 보는 달력과 어긋나므로 쓰지 않는다.
 *
 * 같은 포맷 로직이 화면 여섯 곳에 흩어져 있었고 그중 한 곳만 UTC 를 썼다.
 * 한 곳으로 모아야 다시 갈라지지 않는다.
 *
 * 프레임워크 의존이 없다 — 백엔드가 그대로 import 한다.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** `Date` → `YYYY-MM-DD` (로컬 기준). */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 오늘 (로컬 기준). */
export const todayISO = (): string => toISODate(new Date())

/** 오늘로부터 n일 뒤. 음수면 이전 날짜다. */
export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/**
 * 시작일부터 종료일까지 하루씩 펼친다. 양끝을 포함한다.
 * 시작이 종료보다 뒤면 빈 배열이다.
 */
export function datesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  while (cursor <= last) {
    dates.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/** `YYYY-MM` — 그 달의 데이터만 고를 때 쓰는 접두사. */
export const isoMonth = (year: number, month: number) => `${year}-${pad(month)}`

/** `YYYY-MM-DDTHH:mm:ss…` → `YYYY-MM-DD HH:mm` (로그·댓글 표시용). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${toISODate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
