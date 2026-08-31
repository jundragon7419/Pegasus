/**
 * 블루프린트 §4.4 권한 매트릭스를 코드로 고정한다.
 *
 * 표를 그대로 옮겨 적는 형태로 쓴다. 나중에 규칙이 바뀌면 표와 테스트를 함께
 * 고치게 되므로, 문서와 구현이 조용히 어긋나는 일을 막는다.
 * §11.4 가 "재구축 시 최우선 개선 항목"으로 지적한 부분이다.
 */

import { describe, expect, it } from 'vitest'

import {
  ROLE_ORDER,
  canApproveMember,
  canAppointManager,
  canAppointStaff,
  canBanUser,
  canDeletePoll,
  canEditComment,
  canEditRoster,
  canModifyResource,
  canPinPostType,
  canSetActiveYear,
  canUsePostType,
  canViewLogsOf,
  canWithdraw,
  hasAtLeast,
  resolvePinUntil,
} from '@/lib/roles'
import type { Role } from '@/types/auth'

/** 비로그인을 null 로 표현한다. */
const ROLES = [null, 'basic', 'member', 'manager', 'staff', 'root'] as const
type Actor = (typeof ROLES)[number]

/** 매트릭스 한 줄을 [비로그인, basic, member, manager, staff, root] 순서로 적는다. */
function row(fn: (role: Actor) => boolean): boolean[] {
  return ROLES.map(fn)
}

const _ = false
const O = true

describe('ROLE_ORDER', () => {
  it('basic < member < manager < staff < root 순서다', () => {
    expect(ROLE_ORDER.basic).toBeLessThan(ROLE_ORDER.member)
    expect(ROLE_ORDER.member).toBeLessThan(ROLE_ORDER.manager)
    expect(ROLE_ORDER.manager).toBeLessThan(ROLE_ORDER.staff)
    expect(ROLE_ORDER.staff).toBeLessThan(ROLE_ORDER.root)
  })
})

describe('hasAtLeast', () => {
  it('같은 권한도 통과시킨다', () => {
    expect(hasAtLeast('manager', 'manager')).toBe(true)
  })

  it('비로그인은 어떤 기준도 통과하지 못한다', () => {
    expect(hasAtLeast(null, 'basic')).toBe(false)
    expect(hasAtLeast(undefined, 'basic')).toBe(false)
  })
})

describe('§4.4 권한 매트릭스', () => {
  //                                          비로그인 basic member manager staff root
  it('게시글 작성 (normal / family_occasion)', () => {
    expect(row((r) => canUsePostType(r, 'normal'))).toEqual([_, _, O, O, O, O])
    expect(row((r) => canUsePostType(r, 'family_occasion'))).toEqual([_, _, O, O, O, O])
  })

  it('게시글 작성 (notice / event / game)', () => {
    expect(row((r) => canUsePostType(r, 'notice'))).toEqual([_, _, _, O, O, O])
    expect(row((r) => canUsePostType(r, 'event'))).toEqual([_, _, _, O, O, O])
    expect(row((r) => canUsePostType(r, 'game'))).toEqual([_, _, _, O, O, O])
  })

  it('상단 고정 설정', () => {
    expect(row((r) => canPinPostType(r, 'notice'))).toEqual([_, _, _, O, O, O])
  })

  it('멤버 신청 승인/거부 · 로스터 편집', () => {
    expect(row(canApproveMember)).toEqual([_, _, _, O, O, O])
    expect(row(canEditRoster)).toEqual([_, _, _, O, O, O])
  })

  it('매니저 임명/해제 · 활성 연도 설정', () => {
    expect(row(canAppointManager)).toEqual([_, _, _, _, O, O])
    expect(row(canSetActiveYear)).toEqual([_, _, _, _, O, O])
  })

  it('스태프 임명/해제는 root 전용', () => {
    expect(row(canAppointStaff)).toEqual([_, _, _, _, _, O])
  })

  it('회원 탈퇴 — root 는 불가', () => {
    expect(row(canWithdraw)).toEqual([_, O, O, O, O, _])
  })
})

describe('유저 차단 — 대상 권한에 따라 필요 권한이 달라진다', () => {
  const targets: Role[] = ['basic', 'member', 'manager']

  it('basic·member·manager 대상은 staff+', () => {
    for (const target of targets) {
      expect(row((r) => canBanUser(r, target))).toEqual([_, _, _, _, O, O])
    }
  })

  it('staff 대상은 root 만', () => {
    expect(row((r) => canBanUser(r, 'staff'))).toEqual([_, _, _, _, _, O])
  })

  it('root 는 아무도 차단할 수 없다', () => {
    expect(row((r) => canBanUser(r, 'root'))).toEqual([_, _, _, _, _, _])
  })
})

describe('소유권 기반 판정', () => {
  const owner = { id: 1, authority: 'member' as Role }
  const other = { id: 2, authority: 'member' as Role }
  const manager = { id: 3, authority: 'manager' as Role }

  it('게시글 수정·삭제 — 소유자 또는 manager+', () => {
    expect(canModifyResource(owner, 1)).toBe(true)
    expect(canModifyResource(other, 1)).toBe(false)
    expect(canModifyResource(manager, 1)).toBe(true)
    expect(canModifyResource(null, 1)).toBe(false)
  })

  it('댓글 수정 — 소유자만. 매니저도 타인 댓글은 못 고친다', () => {
    expect(canEditComment(owner, 1)).toBe(true)
    expect(canEditComment(manager, 1)).toBe(false)
  })

  it('투표 삭제 — 글 작성자만. 매니저도 불가', () => {
    expect(canDeletePoll(owner, 1)).toBe(true)
    expect(canDeletePoll(manager, 1)).toBe(false)
    expect(canDeletePoll(owner, null)).toBe(false)
  })
})

describe('활동 로그 열람 (§8.4) — 열람자 권한이 대상보다 높아야 한다', () => {
  it('같은 권한끼리는 볼 수 없다', () => {
    expect(canViewLogsOf('manager', 'manager')).toBe(false)
    expect(canViewLogsOf('root', 'root')).toBe(false)
  })

  it('manager 는 basic·member 의 로그를 본다', () => {
    expect(canViewLogsOf('manager', 'basic')).toBe(true)
    expect(canViewLogsOf('manager', 'member')).toBe(true)
  })

  it('manager 는 staff·root 의 로그를 볼 수 없다', () => {
    expect(canViewLogsOf('manager', 'staff')).toBe(false)
    expect(canViewLogsOf('manager', 'root')).toBe(false)
  })

  it('root 는 staff 이하를 전부 본다', () => {
    expect(canViewLogsOf('root', 'staff')).toBe(true)
    expect(canViewLogsOf('root', 'manager')).toBe(true)
  })

  it('비로그인은 아무 로그도 볼 수 없다', () => {
    expect(canViewLogsOf(null, 'basic')).toBe(false)
  })
})

describe('resolvePinUntil (§5.2) — 조건을 못 갖추면 무조건 null', () => {
  it('매니저가 고정 가능 유형에 날짜를 지정하면 그 값이 남는다', () => {
    expect(resolvePinUntil('notice', '2026-12-31', 'manager')).toBe('2026-12-31')
  })

  it('"infinite" 는 9999-12-31 로 바뀐다', () => {
    expect(resolvePinUntil('notice', 'infinite', 'manager')).toBe('9999-12-31')
  })

  it('member 가 보낸 값은 무시된다', () => {
    expect(resolvePinUntil('notice', 'infinite', 'member')).toBeNull()
  })

  it('고정 불가 유형(normal)은 매니저가 보내도 무시된다', () => {
    expect(resolvePinUntil('normal', 'infinite', 'manager')).toBeNull()
  })
})
