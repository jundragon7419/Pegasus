/**
 * 권한 판정.
 *
 * 블루프린트 §12-18 이 지적한 결함을 고치는 파일이다. 구 구현에는 역할 순위를
 * 비교하는 함수가 없어 `requireRole('staff','root')` 같은 열거가 코드 전반에
 * 흩어져 있었고, 역할이 하나 추가되면 모든 호출 지점을 찾아 고쳐야 했다.
 *
 * 또한 §4.3 에 기록된 대로 구 프로젝트는 프론트와 백엔드에 `isManagerRole` 을
 * 각각 두었는데 시그니처가 달랐다(한쪽은 user 객체, 다른 쪽은 role 문자열).
 * 여기서는 **role 문자열 하나로 통일**한다.
 *
 * 이 파일에는 프레임워크 의존성을 넣지 않는다. 나중에 Express 백엔드가 그대로
 * import 해서 써야 프론트와 백엔드의 판정이 갈라지지 않는다.
 */

import { MANAGER_POST_TYPES, PINNABLE_POST_TYPES, PIN_FOREVER } from '@/types/board'
import type { PostType } from '@/types/board'
import type { Role } from '@/types/auth'

export const ROLE_ORDER = {
  basic: 0,
  member: 1,
  manager: 2,
  staff: 3,
  root: 4,
} as const satisfies Record<Role, number>

/** role 이 min 이상인가. 비로그인(null/undefined)은 항상 false. */
export function hasAtLeast(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false
  return ROLE_ORDER[role] >= ROLE_ORDER[min]
}

export const isMemberRole = (role: Role | null | undefined) => hasAtLeast(role, 'member')
export const isManagerRole = (role: Role | null | undefined) => hasAtLeast(role, 'manager')
export const isStaffRole = (role: Role | null | undefined) => hasAtLeast(role, 'staff')
export const isRoot = (role: Role | null | undefined) => role === 'root'

/** 소유자이거나 manager+ 이면 수정·삭제할 수 있다. */
export function canModifyResource(
  user: { id: number; authority: Role } | null | undefined,
  ownerId: number | null,
): boolean {
  if (!user) return false
  return user.id === ownerId || isManagerRole(user.authority)
}

/**
 * 활동 로그 열람 권한. §8.4 의 설계 의도를 구현한다.
 * 열람자의 권한이 대상보다 **높을 때만** 볼 수 있다(같으면 안 된다).
 *
 * 구 구현은 이 규칙을 프론트엔드 탭 표시 조건으로만 두고 API 는 완전 공개였다(§12-2).
 * 삭제된 게시글 본문과 승인·차단된 유저의 실명·학번이 그대로 노출됐다.
 * 새 백엔드도 반드시 이 함수로 서버에서 판정해야 한다.
 */
export function canViewLogsOf(viewer: Role | null | undefined, target: Role): boolean {
  if (!viewer) return false
  return ROLE_ORDER[viewer] > ROLE_ORDER[target]
}

/**
 * 특정 사용자의 로그를 볼 수 있는가. **본인은 언제나 볼 수 있다.**
 *
 * 순수 역할 비교(`canViewLogsOf`)에는 등호가 없어 자기 로그를 아무도 못 본다 —
 * §8.4 가 의도만 적고 놓친 부분이다. 감사 로그가 사용자에게도 의미를 가지려면
 * "내 계정에서 무슨 일이 있었나"를 확인할 창구가 있어야 한다.
 *
 * 역할 비교는 그대로 두고 본인 예외만 얹는다 — 두 규칙을 한 함수에 섞으면
 * "manager 가 manager 를 본다" 같은 실수가 끼어들기 쉽다.
 */
export function canViewLogsOfUser(
  viewer: { id: number; authority: Role } | null | undefined,
  target: { id: number; authority: Role },
): boolean {
  if (!viewer) return false
  if (viewer.id === target.id) return true
  return canViewLogsOf(viewer.authority, target.authority)
}

/** 이 유형의 글을 쓸 수 있는가. notice/event/game 은 manager+ 전용이다. */
export function canUsePostType(role: Role | null | undefined, type: PostType): boolean {
  const managerOnly = (MANAGER_POST_TYPES as readonly string[]).includes(type)
  return managerOnly ? isManagerRole(role) : isMemberRole(role)
}

/** 이 유형에 상단 고정을 걸 수 있는가. 유형 조건과 권한 조건을 모두 만족해야 한다. */
export function canPinPostType(role: Role | null | undefined, type: PostType): boolean {
  return (PINNABLE_POST_TYPES as readonly string[]).includes(type) && isManagerRole(role)
}

/**
 * 상단 고정 만료일을 확정한다. §5.2 의 서버 규칙을 그대로 옮긴 것이다.
 *
 * 클라이언트가 무엇을 보내든 조건을 만족하지 못하면 null 이 된다.
 * 프론트에서도 같은 함수를 써야 UI 와 실제 저장 결과가 어긋나지 않는다.
 */
export function resolvePinUntil(
  type: PostType,
  pinUntil: string | 'infinite' | null,
  role: Role | null | undefined,
): string | null {
  if (!canPinPostType(role, type)) return null
  if (!pinUntil) return null
  return pinUntil === 'infinite' ? PIN_FOREVER : pinUntil
}

/* ── 관리자 기능 (§4.4 매트릭스) ─────────────────────────────────────────── */

/** 댓글 수정은 소유자만 가능하다. 매니저도 타인 댓글은 수정할 수 없다. */
export function canEditComment(
  user: { id: number } | null | undefined,
  ownerId: number | null,
): boolean {
  // 탈퇴한 사람의 댓글(ownerId === null)은 아무도 수정할 수 없다
  return !!user && ownerId !== null && user.id === ownerId
}

/*
 * 투표 삭제 판정 함수는 두지 않는다.
 *
 * §5.4 의 "투표 삭제는 글 작성자만, 매니저도 안 된다"는 규칙은 그대로 살아 있다.
 * 다만 **§12-8 을 고치면서 투표 삭제 엔드포인트 자체를 없앴다** — 투표는
 * `PUT /api/posts/:id` 에 `poll: null` 을 보내 지우고, 그 PUT 은 소유자만
 * 통과한다(§12-7). 규칙이 게시글 소유권 검사로 흡수된 것이다.
 *
 * 별도 함수를 남겨 두면 "어딘가에 투표 삭제 엔드포인트가 있다"고 읽히는데,
 * 그건 우리가 의도적으로 없앤 것이다.
 */

/** 멤버 신청 승인·거부, 로스터 편집, 일정 편집. */
export const canApproveMember = isManagerRole
export const canEditRoster = isManagerRole
export const canEditEvent = isManagerRole

/** 매니저 임명·해제, 멤버 강등, 차단 해제, 활성 연도 설정, 공휴일 동기화. */
export const canAppointManager = isStaffRole
export const canDemoteMember = isStaffRole
export const canUnbanUser = isStaffRole
export const canSetActiveYear = isStaffRole
export const canSyncHolidays = isStaffRole

/** 스태프 임명·해제는 root 전용이다. */
export const canAppointStaff = isRoot

/**
 * 유저 차단 가능 여부. 대상의 권한에 따라 필요한 권한이 달라진다(§4.4).
 * - basic·member·manager 대상 → staff+
 * - staff 대상 → root 만
 * - root 대상 → 아무도 불가
 */
export function canBanUser(actor: Role | null | undefined, target: Role): boolean {
  if (target === 'root') return false
  if (target === 'staff') return isRoot(actor)
  return isStaffRole(actor)
}

/** 회원 탈퇴. root 는 탈퇴할 수 없다(§4.1). */
export function canWithdraw(role: Role | null | undefined): boolean {
  if (!role) return false
  return !isRoot(role)
}
