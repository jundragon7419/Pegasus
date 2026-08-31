/**
 * 인증·회원 도메인. 블루프린트 §3.2 `users`, §4 권한 체계.
 *
 * API 응답 필드는 camelCase 로 통일한다. 구 API 는 `staff_type`(snake) 과
 * `isPinned`(camel) 가 한 응답에 섞여 있었다 — MySQL 컬럼명이 그대로 새어나온 결과다.
 */

/** 권한 계층. 순위 비교는 lib/roles.ts 의 ROLE_ORDER 를 쓴다. */
export type Role = 'basic' | 'member' | 'manager' | 'staff' | 'root'

/** authority 가 'staff' 일 때만 값이 있다. */
export type StaffType = 'president' | 'headcoach'

/** 졸업생(OB) / 재학생(YB) */
export type ObYb = 'ob' | 'yb'

/**
 * 멤버 신청 상태.
 *
 * 구 스키마는 이 한 컬럼이 신청 상태와 차단 여부를 겸했다(§12-19).
 * 차단 해제 시 이전 상태를 복원할 수 없어 authority 로 추측해야 했다.
 * 새 백엔드에서는 `isBanned` 를 분리하고 이 타입은 신청 상태만 담당한다.
 */
export type MembershipStatus = 'none' | 'pending' | 'approved' | 'rejected'

/** 로그인한 사용자의 전체 프로필. */
export type User = {
  id: number
  username: string
  email: string
  name: string | null
  /** 10자리 숫자. 로스터 연동 키 */
  studentId: string | null
  obYb: ObYb | null
  /** 숫자만 저장한다(포맷 문자 제거) */
  phone: string | null
  /** 국가번호. 기본 '82' */
  phoneCountry: string
  authority: Role
  staffType: StaffType | null
  membershipStatus: MembershipStatus
  isBanned: boolean
  marketingEmail: boolean
  marketingAgreedAt: string | null
  createdAt: string
}

/**
 * 로그인 응답과 인증 컨텍스트가 들고 다니는 최소 정보.
 * 권한 판정에 필요한 것만 담는다.
 */
export type AuthUser = Pick<
  User,
  'id' | 'username' | 'authority' | 'staffType' | 'obYb' | 'membershipStatus' | 'isBanned'
>

export type LoginResponse = {
  token: string
  user: AuthUser
}
