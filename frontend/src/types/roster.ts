/** 선수단 도메인. 블루프린트 §3.2 `roster`. */

/**
 * 로스터상의 역할. 사이트 권한(Role)과는 무관하다 — 감독이어도 사이트 권한은 basic 일 수 있다.
 * 구 스키마 주석은 접두사 없이 적혀 있었으나 실제 ENUM 은 `roster_` 접두사를 쓴다(§12-24).
 */
export type RosterRole =
  | 'roster_president'
  | 'roster_headcoach'
  | 'roster_retired'
  | 'roster_player'
  | 'roster_manager'

export type RosterEntry = {
  id: number
  /** 시즌 연도. 연도마다 명단이 독립적이다 */
  year: number
  /** 등번호. 매니저는 'M' */
  number: string
  name: string
  /** UNIQUE(year, studentId) */
  studentId: string
  /** 기수 */
  generation: number
  /**
   * 구 구현은 이 FK 를 두고도 채우지 않았고, 모든 조인을 studentId 문자열 매칭으로 했다(§12-17).
   * 학번을 수정하면 연동이 조용히 끊긴다. 새 백엔드는 이 값을 반드시 채운다.
   */
  userId: number | null
  role: RosterRole
}

/** 활성 시즌 연도. settings 의 active_roster_year. */
export type ActiveYear = {
  year: number
}
