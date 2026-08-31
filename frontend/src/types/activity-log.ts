/** 활동(감사) 로그 도메인. 블루프린트 §8. */

/** §8.1 의 액션 22종. */
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

export type ActivityTargetType = 'post' | 'comment' | 'event' | 'user' | 'roster' | 'setting'

export type ActivityLog = {
  id: number
  userId: number
  username: string
  action: ActivityAction
  targetType: ActivityTargetType
  /** 대상이 삭제된 뒤에도 기록이 남도록 FK 를 걸지 않는다. roster_year_set 은 null */
  targetId: number | null
  /** 삭제·변경 당시의 내용 보존. 액션마다 담기는 필드가 다르다(§8.1) */
  snapshot: Record<string, unknown> | null
  createdAt: string
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
