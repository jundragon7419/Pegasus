import type { MembershipStatus, ObYb } from '@/types/auth'

/**
 * 멤버십 상태 머신. 블루프린트 §7.1.
 *
 * `roles.ts` 와 같은 이유로 프레임워크 의존 없이 작성한다 — 백엔드가 그대로
 * import 하고, 상태 전이를 테스트로 고정할 수 있어야 한다. 화면과 서버가 서로
 * 다른 규칙을 들고 있으면 "버튼은 눌리는데 저장은 안 되는" 상태가 생긴다.
 */

/** 신청에 필요한 프로필. 셋 다 있어야 신청할 수 있다. */
export type MembershipProfile = {
  name: string | null
  studentId: string | null
  obYb: ObYb | null
}

/**
 * 프로필(실명·학번·OB/YB)을 고칠 수 있는 상태.
 *
 * 승인된 뒤에는 사용자가 스스로 바꿀 수 없다 — 로스터가 학번으로 엮여 있어
 * 무결성이 깨지기 때문이다(§7.1). 승인 후 정정은 관리자 경로로 처리한다.
 */
export function canEditProfile(status: MembershipStatus): boolean {
  return status === 'none' || status === 'rejected'
}

export type MembershipRequestBlock =
  | 'already-pending'
  | 'already-member'
  | 'missing-profile'
  | 'missing-student-id'

/** 사유별 안내 문구. 서버와 화면이 같은 문장을 쓴다. */
export const MEMBERSHIP_BLOCK_MESSAGE: Record<MembershipRequestBlock, string> = {
  'already-pending': '이미 신청 중입니다.',
  'already-member': '이미 멤버입니다.',
  'missing-profile': '먼저 프로필(실명, OB/YB)을 입력해 주세요.',
  'missing-student-id': '먼저 프로필에서 학번을 입력해 주세요.',
}

/**
 * 멤버 신청 전제조건. 막히면 사유를, 통과하면 null 을 돌려준다.
 *
 * 순서가 §7.1 의 검사 순서와 같다. 순서를 바꾸면 사용자가 받는 메시지가 달라진다
 * — 예를 들어 프로필이 비어 있는 pending 사용자는 "이미 신청 중"을 먼저 봐야 한다.
 *
 * **학번은 필수다.** 구 UI 는 "학번 (선택)"으로 표기했는데 서버는 없으면 400 을
 * 반환했다(§12-13). 여기서 한 곳으로 모아 그 어긋남을 없앤다.
 */
export function checkMembershipRequest(
  status: MembershipStatus,
  profile: MembershipProfile,
): MembershipRequestBlock | null {
  if (status === 'pending') return 'already-pending'
  if (status === 'approved') return 'already-member'
  if (!profile.name?.trim() || !profile.obYb) return 'missing-profile'
  if (!profile.studentId?.trim()) return 'missing-student-id'
  return null
}

/** 신청 버튼을 누를 수 있는가. 화면이 버튼 활성화 조건으로 쓴다. */
export const canRequestMembership = (status: MembershipStatus, profile: MembershipProfile) =>
  checkMembershipRequest(status, profile) === null

/*
 * 차단 해제 시의 "상태 복원" 함수는 두지 않는다.
 *
 * §7.1 은 "해제하면 authority 로 이전 상태를 추측한다"고 적고 있는데, 그건
 * `membership_status` 하나가 신청 상태와 차단을 **겸했기 때문**에 생긴 우회책이다
 * (§12-19). `isBanned` 를 분리한 지금은 차단이 신청 상태를 건드리지 않으므로
 * 해제할 때 복원할 것이 없다 — pending 인 채로 차단당한 사람은 pending 으로 돌아온다.
 *
 * 추측 함수를 남겨 두면 호출해서 멀쩡한 상태를 덮어쓰는 함정이 된다.
 */
