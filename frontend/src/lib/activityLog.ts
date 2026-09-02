import type { ActivityAction, ActivityLog } from '@/types/activity-log'

/**
 * 활동 로그의 표시 규칙. 판정이 아니라 **표시**만 담당한다
 * (`roles.ts`·`membership.ts` 가 규칙이고 이쪽은 라벨이다 — §4.3 이 나눈 구분과 같다).
 */

export const ACTIVITY_ACTION_LABEL: Record<ActivityAction, string> = {
  post_create: '게시글 작성',
  post_update: '게시글 수정',
  post_delete: '게시글 삭제',
  comment_create: '댓글 작성',
  comment_update: '댓글 수정',
  comment_delete: '댓글 삭제',
  event_create: '일정 등록',
  event_update: '일정 수정',
  event_delete: '일정 삭제',
  member_approve: '멤버 승인',
  member_reject: '멤버 거부',
  member_demote: '멤버 강등',
  role_set_manager: '매니저 임명',
  role_unset_manager: '매니저 해제',
  role_set_staff: '스태프 임명',
  role_unset_staff: '스태프 해제',
  user_ban: '계정 차단',
  user_unban: '차단 해제',
  roster_add: '로스터 추가',
  roster_update: '로스터 수정',
  roster_delete: '로스터 삭제',
  roster_year_set: '활성 연도 변경',
  vote_submit: '투표 참여',
  user_withdraw: '회원 탈퇴',
}

/** 요약 레이아웃 갈래. 액션마다 보여줄 필드가 다르다(§6.3). */
export type ActivityGroup = 'post' | 'comment' | 'event' | 'user' | 'roster' | 'setting' | 'poll'

export function groupOf(action: ActivityAction): ActivityGroup {
  if (action.startsWith('post_')) return 'post'
  if (action.startsWith('comment_')) return 'comment'
  if (action.startsWith('event_')) return 'event'
  if (action.startsWith('roster_year')) return 'setting'
  if (action.startsWith('roster_')) return 'roster'
  if (action === 'vote_submit') return 'poll'
  return 'user'
}

/** 수정 로그인가. 이 경우에만 스냅샷이 `{ before, after }` 다(§12-7). */
export const isUpdateLog = (action: ActivityAction) =>
  action === 'post_update' || action === 'comment_update' || action === 'event_update'

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

/**
 * 목록 한 줄에 보여줄 요약.
 *
 * 수정 로그는 `after` 쪽을 기준으로 삼는다 — 무엇이 바뀌었는지 자세히는
 * 상세 화면에서 before 와 나란히 보여준다.
 */
export function summarize(entry: ActivityLog): string {
  const snapshot = entry.snapshot ?? {}
  const source = (isUpdateLog(entry.action) ? snapshot.after : snapshot) as Record<string, unknown>
  const from = (source ?? {}) as Record<string, unknown>

  switch (groupOf(entry.action)) {
    case 'post':
      return str(from.title) ?? '(제목 없음)'
    case 'comment': {
      const content = str(from.content) ?? ''
      const title = str(from.postTitle)
      const excerpt = content.length > 40 ? `${content.slice(0, 40)}…` : content
      return title ? `${title} — ${excerpt}` : excerpt
    }
    case 'event': {
      const date = str(from.date)
      const name = str(from.name) ?? '(이름 없음)'
      return date ? `${date} ${name}` : name
    }
    case 'poll':
      // 어느 투표에 참여했는지까지만. **선택 내용은 스냅샷에 아예 없다**(§12-9)
      return str(from.pollTitle) ?? '(투표)'
    case 'roster': {
      const name = str(from.name) ?? ''
      const year = from.year
      return year ? `${year} ${name}` : name
    }
    case 'setting':
      return from.year ? `${from.year} 시즌` : ''
    case 'user': {
      const username = str(from.username)
      const name = str(from.name)
      if (username && name) return `${username}(${name})`
      return username ?? name ?? ''
    }
  }
}

/** 상세에서 나란히 보여줄 필드. 액션 갈래마다 다르다. */
export const DETAIL_FIELDS: Record<ActivityGroup, Array<{ key: string; label: string }>> = {
  post: [
    { key: 'type', label: '유형' },
    { key: 'title', label: '제목' },
    { key: 'content', label: '내용' },
    { key: 'pinUntil', label: '고정 만료' },
  ],
  comment: [
    { key: 'postTitle', label: '원글' },
    { key: 'content', label: '내용' },
  ],
  event: [
    { key: 'date', label: '날짜' },
    { key: 'type', label: '유형' },
    { key: 'name', label: '이름' },
  ],
  poll: [
    { key: 'postTitle', label: '게시글' },
    { key: 'pollTitle', label: '투표' },
  ],
  user: [
    { key: 'username', label: '아이디' },
    { key: 'name', label: '실명' },
    { key: 'studentId', label: '학번' },
    { key: 'obYb', label: 'OB/YB' },
    { key: 'staffType', label: '스태프 구분' },
  ],
  roster: [
    { key: 'year', label: '연도' },
    { key: 'number', label: '등번호' },
    { key: 'name', label: '이름' },
    { key: 'studentId', label: '학번' },
    { key: 'role', label: '역할' },
  ],
  setting: [{ key: 'year', label: '연도' }],
}
