import type { MembershipStatus, ObYb, Role, StaffType } from '@/types/auth'
import type { PostType } from '@/types/board'
import type { EventType } from '@/types/schedule'
import type { RosterRole } from '@/types/roster'

/**
 * 화면에 보여줄 한국어 라벨.
 *
 * 판정 로직(`roles.ts`)과 분리해 둔다 — 그쪽은 백엔드와 공유할 순수 규칙이고,
 * 이 파일은 프론트 전용 표시 문자열이다(§4.3 이 나눈 구분과 같다).
 */

export const ROLE_LABEL: Record<Role, string> = {
  basic: '일반',
  member: '회원',
  manager: '매니저',
  staff: '스태프',
  root: '관리자',
}

export const STAFF_TYPE_LABEL: Record<StaffType, string> = {
  president: '회장',
  headcoach: '감독',
}

/** 스태프는 회장·감독으로 나뉘므로 그쪽을 우선 보여준다. */
export function roleLabelOf(role: Role, staffType: StaffType | null): string {
  if (role === 'staff' && staffType) return STAFF_TYPE_LABEL[staffType]
  return ROLE_LABEL[role]
}

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  none: '미신청',
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '거부됨',
}

export const OB_YB_LABEL: Record<ObYb, string> = {
  ob: '졸업생',
  yb: '재학생',
}

export const POST_TYPE_LABEL: Record<PostType, string> = {
  notice: '공지',
  event: '행사',
  game: '경기',
  family_occasion: '경조사',
  normal: '일반',
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  training: '훈련',
  meeting: '회의',
  events: '행사',
  etc: '기타',
}

export const ROSTER_ROLE_LABEL: Record<RosterRole, string> = {
  roster_president: '회장',
  roster_headcoach: '감독',
  roster_retired: '영구결번',
  roster_player: '선수',
  roster_manager: '매니저',
}
