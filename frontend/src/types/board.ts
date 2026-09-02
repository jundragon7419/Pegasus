/** 게시판·댓글·투표 도메인. 블루프린트 §3.2, §5.2~5.4. */

/**
 * 게시글 유형. DB ENUM 과 반드시 일치해야 한다.
 * 구 구현은 이 목록을 프론트·백엔드에 각각 두고 수동으로 맞췄다(§3.2 경고).
 */
export type PostType = 'notice' | 'event' | 'game' | 'family_occasion' | 'normal'

/** manager+ 만 작성할 수 있는 유형. */
export const MANAGER_POST_TYPES = ['notice', 'event', 'game'] as const

/** 상단 고정을 걸 수 있는 유형. */
export const PINNABLE_POST_TYPES = ['notice', 'event', 'game', 'family_occasion'] as const

/** 무기한 고정을 뜻하는 날짜. */
export const PIN_FOREVER = '9999-12-31'

/** 목록에 실리는 게시글. 본문(content)은 없다. */
export type PostSummary = {
  id: number
  /** 작성자가 탈퇴하면 null 이 된다(글은 보존) */
  userId: number | null
  type: PostType
  /** 상단 고정 만료일. null 이면 고정 아님. PIN_FOREVER 면 무기한 */
  pinUntil: string | null
  /** 서버가 pinUntil 과 오늘 날짜로 계산해 내려주는 필드 */
  isPinned: boolean
  title: string
  /** 표시용 작성자. 계정이 살아 있으면 "username(name)", 삭제됐으면 작성 시점 스냅샷 */
  author: string
  date: string
  views: number
}

/**
 * 홈 위젯용 축약 응답. **비로그인에게도 내려가므로 제목·날짜·유형만 담는다.**
 * 작성자·조회수까지 공개할 이유가 없다(§12-1).
 */
export type RecentPost = Pick<PostSummary, 'id' | 'type' | 'title' | 'date' | 'isPinned'>

/** 목록 응답. 서버가 잘라서 내려준다(§12-14). */
export type PagedPosts = {
  items: PostSummary[]
  page: number
  size: number
  total: number
}

/** 상세 조회 응답. 본문이 포함된다. */
export type Post = PostSummary & {
  /**
   * 평문이다. 마크다운도 HTML 도 아니며 '\n' 만 의미를 갖는다.
   * ContentRenderer 가 HTML 을 해석하지 않으므로 XSS 에 안전하다 — 이 성질을 유지할 것.
   */
  content: string
}

/** 이전 글 / 다음 글 내비게이션. */
export type AdjacentPosts = {
  prev: { id: number; title: string } | null
  next: { id: number; title: string } | null
}

export type Comment = {
  id: number
  postId: number
  /** 작성자가 탈퇴하면 null 이 된다(§12-12 익명화). 댓글 자체는 보존한다 */
  userId: number | null
  author: string
  content: string
  isEdited: boolean
  createdAt: string
}

export type Poll = {
  id: number
  title: string
  isMultiple: boolean
  isAnonymous: boolean
  /** 비공개면 결과(votes·percentage·totalVotes)가 null 로 내려온다 */
  isPrivate: boolean
}

export type PollOption = {
  id: number
  text: string
  /** 결과 열람 권한이 없으면 null */
  votes: number | null
  percentage: number | null
  /** 익명이거나 열람 권한이 없으면 빈 배열 */
  voters: string[]
}

/**
 * 투표 조회 응답. §5.4 의 가시성 규칙:
 * - canSeeResults = 공개이거나, 글 작성자이거나, staff/root
 * - 투표자 명단은 위 조건에 더해 기명 투표일 때만
 *
 * 주의: manager 는 비공개 투표 결과를 볼 수 없다(staff/root 만 가능).
 */
export type PollResponse = {
  poll: Poll
  options: PollOption[]
  totalVotes: number | null
  /**
   * 내가 선택한 옵션 id 목록. **익명 투표에서는 참여했어도 빈 배열이다** —
   * 서버가 누가 무엇을 골랐는지 저장하지 않기 때문이다(§12-9).
   */
  userVotes: number[]
  /** 참여 여부. 익명 투표에서 "이미 던졌다"를 알 수 있는 유일한 신호다 */
  hasVoted: boolean
  canSeeResults: boolean
}
