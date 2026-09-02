import type { RosterEntry } from '@/types/roster'
import type { User } from '@/types/auth'

/**
 * 관리자 목록 응답. 프로필에 **최신 연도 로스터 정보**를 붙여 준다(§5.10).
 * 등번호가 있으면 명단에 실제로 오른 사람인지 표에서 바로 알 수 있다.
 */
export type AdminUser = User & {
  rosterNumber: string | null
  rosterRole: RosterEntry['role'] | null
  rosterYear: number | null
}

/** 관리자 로스터 조회는 가입 여부를 함께 준다. `null` 이면 미가입이다. */
export type AdminRosterEntry = RosterEntry & { username: string | null }
