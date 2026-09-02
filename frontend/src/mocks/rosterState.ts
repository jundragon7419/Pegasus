import { findByStudentId } from '@/mocks/authState'
import { ACTIVE_ROSTER_YEAR, ROSTER_BY_YEAR } from '@/mocks/fixtures/roster'
import type { RosterEntry, RosterRole } from '@/types/roster'

/**
 * 로스터와 설정의 변경 가능한 목 상태.
 *
 * 지금까지 로스터는 정적 픽스처를 그대로 반환했다. 관리자가 편집하려면
 * `boardState`·`scheduleState` 와 같은 저장소가 필요하다.
 * 활성 연도(`settings.active_roster_year`)도 여기서 들고 있는다.
 */

/** 픽스처를 복사해 쓴다. 원본을 건드리면 새로고침해도 되돌아오지 않는다 */
const roster: RosterEntry[] = Object.values(ROSTER_BY_YEAR)
  .flat()
  .map((entry) => ({ ...entry }))

let nextId = Math.max(0, ...roster.map((e) => e.id)) + 1

/** §7.6 — 미설정이면 올해로 떨어진다. */
let activeYear: number = ACTIVE_ROSTER_YEAR

export const getActiveYear = () => activeYear

export function setActiveYear(year: number): void {
  activeYear = year
}

export const listYears = () => [...new Set(roster.map((e) => e.year))].sort((a, b) => b - a)

export const listRoster = (year: number) =>
  roster.filter((e) => e.year === year).sort((a, b) => byNumber(a.number, b.number))

export const findRosterEntry = (id: number) => roster.find((e) => e.id === id)

/** 등번호는 문자열이다. 'M'(매니저)은 숫자 뒤로 보낸다. */
function byNumber(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b)
  if (Number.isNaN(na)) return 1
  if (Number.isNaN(nb)) return -1
  return na - nb
}

/** UNIQUE(year, studentId) — 같은 해에 같은 학번은 둘일 수 없다. */
export const hasStudentIdInYear = (year: number, studentId: string, exceptId?: number) =>
  roster.some((e) => e.year === year && e.studentId === studentId && e.id !== exceptId)

export type RosterInput = {
  year: number
  number: string
  name: string
  studentId: string
  generation: number
  role: RosterRole
}

/**
 * **학번으로 계정을 찾아 `userId` 를 채운다(§12-17).**
 *
 * 구 구현은 이 FK 를 두고도 채우지 않아 모든 조인이 학번 문자열 매칭이었다.
 * 학번을 고치면 연동이 조용히 끊겼고, 기록 화면의 등번호는 **이름 기준**이라
 * 동명이인에서 충돌했다. 연결은 등록·수정 시점에 한 번만 하면 된다.
 */
const linkUser = (studentId: string) => findByStudentId(studentId)?.id ?? null

export function createRosterEntry(input: RosterInput): RosterEntry {
  const entry: RosterEntry = { id: nextId++, ...input, userId: linkUser(input.studentId) }
  roster.push(entry)
  return entry
}

export function updateRosterEntry(id: number, input: RosterInput): RosterEntry | null {
  const entry = findRosterEntry(id)
  if (!entry) return null
  Object.assign(entry, input, { userId: linkUser(input.studentId) })
  return entry
}

export function deleteRosterEntry(id: number): boolean {
  const index = roster.findIndex((e) => e.id === id)
  if (index === -1) return false
  roster.splice(index, 1)
  return true
}

/**
 * 계정이 사라지면 연결만 끊는다. 로스터 기록 자체는 남는다 —
 * 그 해에 그 사람이 뛰었다는 사실은 계정과 무관하다(§12-12 와 같은 원칙).
 */
export function unlinkUser(userId: number): void {
  for (const entry of roster) {
    if (entry.userId === userId) entry.userId = null
  }
}

/** 마이페이지 로스터 이력 — 학번이 아니라 userId 로 잇는다. */
export const listRosterByUser = (userId: number) =>
  roster.filter((e) => e.userId === userId).sort((a, b) => b.year - a.year)
