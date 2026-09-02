/** 활동(감사) 로그 도메인. 블루프린트 §8. */

/**
 * §8.1 의 액션 22종 + 이번에 추가한 2종.
 *
 * §8.3 은 탈퇴와 투표 제출이 로그에 남지 않는 것을 "재구축 시 검토 대상"으로
 * 지적한다. 특히 탈퇴는 흔적이 남지 않을 뿐 아니라 그 사람의 기존 로그까지
 * CASCADE 로 사라졌다 — 감사 로그의 목적과 정면으로 충돌한다.
 */
export type ActivityAction =
  | 'post_create'
  | 'post_update'
  | 'post_delete'
  | 'comment_create'
  | 'comment_update'
  | 'comment_delete'
  | 'event_create'
  | 'event_update'
  | 'event_delete'
  | 'member_approve'
  | 'member_reject'
  | 'member_demote'
  | 'role_set_manager'
  | 'role_unset_manager'
  | 'role_set_staff'
  | 'role_unset_staff'
  | 'user_ban'
  | 'user_unban'
  | 'roster_add'
  | 'roster_update'
  | 'roster_delete'
  | 'roster_year_set'
  /** 신규(§8.3). **선택 내용은 절대 담지 않는다** — 아래 VoteSubmitSnapshot 참고 */
  | 'vote_submit'
  /** 신규(§8.3). 탈퇴해도 이 기록과 그 사람의 기존 로그는 남는다 */
  | 'user_withdraw'

export type ActivityTargetType = 'post' | 'comment' | 'event' | 'user' | 'roster' | 'setting' | 'poll'

export type ActivityLog = {
  id: number
  /**
   * 탈퇴하면 null 이 된다(§12-12 익명화). 계정은 사라져도 기록은 남는다 —
   * 구 구현은 `activity_logs.user_id ON DELETE CASCADE` 라 로그가 함께 소멸했다.
   */
  userId: number | null
  /** 기록 시점의 표시 이름 스냅샷. 계정이 사라져도 누구였는지는 남는다 */
  username: string
  action: ActivityAction
  targetType: ActivityTargetType
  /** 대상이 삭제된 뒤에도 기록이 남도록 FK 를 걸지 않는다. roster_year_set 은 null */
  targetId: number | null
  /** 삭제·변경 당시의 내용 보존. 액션마다 담기는 필드가 다르다(§8.1) */
  snapshot: Record<string, unknown> | null
  createdAt: string
}

/**
 * 수정 로그의 스냅샷 모양.
 *
 * §8.1 은 수정 **후** 값만 담도록 되어 있었고, §12-7 은 그래서 원본을 추적할 수
 * 없다고 지적한다. 무엇이 어떻게 바뀌었는지 남기려면 둘 다 있어야 한다.
 */
export type UpdateSnapshot<T> = {
  before: T
  after: T
}

/**
 * 투표 제출 스냅샷.
 *
 * **선택한 옵션을 담지 않는다.** 담는 순간 §12-9 에서 익명 투표의 선택을
 * 저장하지 않기로 한 설계가 감사 로그를 통해 그대로 새어 나간다.
 * 남기는 것은 "언제 어느 투표에 참여했는가"까지다.
 */
export type VoteSubmitSnapshot = {
  pollId: number
  pollTitle: string
  postId: number
  postTitle: string
}

/** 클릭해서 상세를 볼 수 있는 액션. 나머지는 목록에서 요약만 보여준다. */
export const DETAILED_LOG_ACTIONS: readonly ActivityAction[] = [
  'post_create',
  'post_update',
  'post_delete',
  'comment_create',
  'comment_update',
  'comment_delete',
]
