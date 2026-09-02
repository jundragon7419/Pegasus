import { describe, expect, it } from 'vitest'

import { MOCK_USERS } from './users'
import { ROSTER_BY_YEAR } from './roster'

/**
 * 픽스처 무결성.
 *
 * **같은 종류의 결함이 세 번 나왔다.** 게시글 픽스처가 존재하지 않는 계정을
 * 가리켰고(소유자만 수정을 확인할 수 없었다), 로스터 픽스처의 `userId` 가 전부
 * null 이었고(로스터 이력이 빈 화면이었다), 계정이 8명뿐이라 관리자 표가 1행씩
 * 이었다. 셋 다 "그럴듯하지만 기능을 시험하지 못하는" 픽스처였다.
 *
 * 여기서 못 박아 두면 다음에 픽스처를 손댈 때 조용히 되돌아가지 않는다.
 */

const active = MOCK_USERS.filter((u) => !u.isBanned)

describe('개인정보 — 공개 저장소에 실제 데이터가 들어가지 않는다', () => {
  it('학번은 10자리이고 5번째 자리가 합성값 표식 9 다', () => {
    for (const user of MOCK_USERS) {
      if (user.studentId === null) continue
      expect(user.studentId, user.username).toMatch(/^\d{4}9\d{5}$/)
    }
  })

  it('로스터 학번도 같은 표식을 지킨다', () => {
    for (const entries of Object.values(ROSTER_BY_YEAR)) {
      for (const entry of entries) {
        expect(entry.studentId, entry.name).toMatch(/^\d{4}9\d{5}$/)
      }
    }
  })
})

describe('식별자 유일성', () => {
  it('id · username · 학번이 겹치지 않는다', () => {
    const ids = MOCK_USERS.map((u) => u.id)
    const usernames = MOCK_USERS.map((u) => u.username.toLowerCase())
    const emails = MOCK_USERS.map((u) => u.email.toLowerCase())
    const studentIds = MOCK_USERS.map((u) => u.studentId).filter((s): s is string => s !== null)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(usernames).size).toBe(usernames.length)
    expect(new Set(emails).size).toBe(emails.length)
    expect(new Set(studentIds).size).toBe(studentIds.length)
  })

  it('로스터는 같은 해에 학번이 겹치지 않는다 — UNIQUE(year, studentId)', () => {
    for (const [year, entries] of Object.entries(ROSTER_BY_YEAR)) {
      const ids = entries.map((e) => e.studentId)
      expect(new Set(ids).size, `${year}년`).toBe(ids.length)
    }
  })
})

describe('관리자 화면이 시험 가능한 분량인가', () => {
  /** 표가 1행이면 목록·검색·다중 선택 흐름을 확인할 수 없다. */
  const MIN = 2

  it.each([
    ['승인 대기 (멤버 승인 탭)', (u: (typeof MOCK_USERS)[number]) => u.membershipStatus === 'pending'],
    ['미신청 basic (일반유저 탭)', (u: (typeof MOCK_USERS)[number]) => u.authority === 'basic' && u.membershipStatus === 'none'],
    ['거부됨 (재신청 흐름)', (u: (typeof MOCK_USERS)[number]) => u.membershipStatus === 'rejected'],
    ['멤버 (강등·매니저 임명 대상)', (u: (typeof MOCK_USERS)[number]) => u.authority === 'member'],
    ['매니저 (해제 대상)', (u: (typeof MOCK_USERS)[number]) => u.authority === 'manager'],
    ['스태프 (해제 대상)', (u: (typeof MOCK_USERS)[number]) => u.authority === 'staff'],
  ])('%s 가 %i명 이상', (_label, predicate) => {
    expect(active.filter(predicate).length).toBeGreaterThanOrEqual(MIN)
  })

  it('차단 계정이 여러 authority·상태에 걸쳐 있다 — 해제 시 원래 상태가 보존되는지 본다', () => {
    const banned = MOCK_USERS.filter((u) => u.isBanned)
    expect(banned.length).toBeGreaterThanOrEqual(2)
    expect(new Set(banned.map((u) => u.authority)).size).toBeGreaterThanOrEqual(2)
    expect(new Set(banned.map((u) => u.membershipStatus)).size).toBeGreaterThanOrEqual(2)
  })

  it('root 는 정확히 하나다', () => {
    expect(MOCK_USERS.filter((u) => u.authority === 'root')).toHaveLength(1)
  })

  it('staffType 은 staff 에게만 있다', () => {
    for (const user of MOCK_USERS) {
      if (user.authority === 'staff') expect(user.staffType, user.username).not.toBeNull()
      else expect(user.staffType, user.username).toBeNull()
    }
  })
})

describe('로스터 ↔ 계정 연동 (§12-17)', () => {
  const linked = Object.values(ROSTER_BY_YEAR)
    .flat()
    .filter((entry) => entry.userId !== null)

  it('userId 가 채워진 항목이 있다 — 없으면 로스터 이력이 빈 화면이다', () => {
    expect(linked.length).toBeGreaterThan(0)
  })

  it('연결된 userId 가 전부 실제 계정을 가리킨다', () => {
    const ids = new Set(MOCK_USERS.map((u) => u.id))
    for (const entry of linked) {
      expect(ids.has(entry.userId!), `${entry.year} ${entry.name}`).toBe(true)
    }
  })

  it('연결된 항목은 학번도 그 계정과 일치한다 — 둘이 어긋나면 연동이 조용히 깨진다', () => {
    for (const entry of linked) {
      const user = MOCK_USERS.find((u) => u.id === entry.userId)
      expect(entry.studentId, `${entry.year} ${entry.name}`).toBe(user?.studentId)
    }
  })

  it('여러 해에 걸친 이력을 가진 계정이 있다 — 연도별 등번호 화면을 시험할 수 있어야 한다', () => {
    const byUser = new Map<number, number>()
    for (const entry of linked) {
      byUser.set(entry.userId!, (byUser.get(entry.userId!) ?? 0) + 1)
    }
    expect([...byUser.values()].some((count) => count >= 2)).toBe(true)
  })
})
