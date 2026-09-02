import { POSTS } from '@/mocks/fixtures/posts'
import type { Role } from '@/types/auth'
import type {
  Comment,
  PagedPosts,
  Poll,
  PollOption,
  PollResponse,
  Post,
  PostSummary,
  PostType,
  RecentPost,
} from '@/types/board'

/**
 * 게시판의 변경 가능한 목 상태. 탭 메모리에만 살며 새로고침하면 초기 픽스처로 돌아간다.
 *
 * 구 구현에서 깨져 있던 것들을 여기서 바로잡는다.
 * - 투표를 서버가 UPSERT 한다. 옵션 텍스트가 그대로면 표를 보존한다 (§12-8)
 * - 익명 투표는 선택 내용을 사용자와 묶지 않는다 (§12-9)
 */

/* ── 게시글 ─────────────────────────────────────────────────────────────── */

const CONTENT_BY_TYPE: Record<PostType, string> = {
  notice: '아래 내용을 확인해 주세요.\n\n문의 사항은 임원진에게 연락 바랍니다.',
  event: '참석 여부를 댓글로 남겨 주세요.\n\n장소와 시간은 변동될 수 있습니다.',
  game: '경기 결과와 주요 장면을 정리했습니다.\n\n다음 경기도 많은 응원 부탁드립니다.',
  family_occasion: '함께 축하해 주시면 감사하겠습니다.',
  normal: '자유롭게 의견 남겨 주세요.',
}

const posts: Post[] = POSTS.map((post) => ({
  ...post,
  content: `${post.title}\n\n${CONTENT_BY_TYPE[post.type]}`,
}))

let nextPostId = Math.max(0, ...posts.map((p) => p.id)) + 1

const today = () => new Date().toISOString().slice(0, 10)

/** 서버가 정렬한다 — 고정글 우선, 날짜 내림차순, id 내림차순. */
function sorted(): Post[] {
  return [...posts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.id - a.id
  })
}

/** 본문을 떨어뜨린다. 필드를 명시해 새 필드가 목록으로 새어 나가지 않게 한다. */
const toSummary = (p: Post): PostSummary => ({
  id: p.id,
  userId: p.userId,
  type: p.type,
  pinUntil: p.pinUntil,
  isPinned: p.isPinned,
  title: p.title,
  author: p.author,
  date: p.date,
  views: p.views,
})

/**
 * 목록. 고정글은 페이지와 무관하게 항상 앞에 붙는다(구 화면 동작).
 * 페이지네이션 대상은 일반글이고 `total` 도 일반글 수다.
 */
export function listPosts(page: number, size: number): PagedPosts {
  const all = sorted()
  const pinned = all.filter((p) => p.isPinned)
  const rest = all.filter((p) => !p.isPinned)
  const start = (page - 1) * size

  return {
    items: [...pinned, ...rest.slice(start, start + size)].map(toSummary),
    page,
    size,
    total: rest.length,
  }
}

/** 홈 위젯용. 비로그인에게도 보이므로 제목·날짜·유형만 준다(§12-1). */
export function recentPosts(limit: number): RecentPost[] {
  return sorted()
    .slice(0, limit)
    .map(({ id, type, title, date, isPinned }) => ({ id, type, title, date, isPinned }))
}

export const findPost = (id: number) => posts.find((p) => p.id === id)

/** 마이페이지 — 내가 쓴 글. 최신순. */
export function listPostsByUser(userId: number, page: number, size: number): PagedPosts {
  const mine = sorted().filter((p) => p.userId === userId)
  const start = (page - 1) * size
  return { items: mine.slice(start, start + size).map(toSummary), page, size, total: mine.length }
}

export function adjacentPosts(id: number) {
  const ordered = [...posts].sort((a, b) => a.id - b.id)
  const index = ordered.findIndex((p) => p.id === id)
  if (index === -1) return { prev: null, next: null }
  const pick = (p: Post | undefined) => (p ? { id: p.id, title: p.title } : null)
  return { prev: pick(ordered[index - 1]), next: pick(ordered[index + 1]) }
}

export function createPost(input: {
  userId: number
  author: string
  type: PostType
  title: string
  content: string
  pinUntil: string | null
}): Post {
  const post: Post = {
    id: nextPostId++,
    userId: input.userId,
    type: input.type,
    pinUntil: input.pinUntil,
    isPinned: input.pinUntil !== null && input.pinUntil >= today(),
    title: input.title,
    author: input.author,
    date: today(),
    views: 0,
    content: input.content,
  }
  posts.unshift(post)
  return post
}

export function updatePost(
  id: number,
  input: { type: PostType; title: string; content: string; pinUntil: string | null },
): Post | null {
  const post = findPost(id)
  if (!post) return null
  post.type = input.type
  post.title = input.title
  post.content = input.content
  post.pinUntil = input.pinUntil
  post.isPinned = input.pinUntil !== null && input.pinUntil >= today()
  return post
}

export function deletePost(id: number): boolean {
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) return false
  posts.splice(index, 1)

  // 글이 사라지면 딸린 댓글과 투표도 함께 사라진다.
  // 목은 손으로 지우지만 실제 DB 는 FK ON DELETE CASCADE 로 처리해야 한다.
  for (let i = comments.length - 1; i >= 0; i--) {
    if (comments[i].postId === id) comments.splice(i, 1)
  }
  removePollOfPost(id)
  return true
}

/** 조회수. 실패해도 본 흐름을 막지 않는다(§12-21). */
export const increaseViews = (id: number) => {
  const post = findPost(id)
  if (post) post.views += 1
}

/* ── 댓글 ───────────────────────────────────────────────────────────────── */

const firstPostId = posts[0]?.id ?? 0

const comments: Comment[] = [
  {
    id: 1,
    postId: firstPostId,
    userId: 3,
    author: 'player01(김민준)',
    content: '확인했습니다. 참석하겠습니다!',
    isEdited: false,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 2,
    postId: firstPostId,
    userId: 4,
    author: 'manager01(이서준)',
    content: '장소가 변경될 수 있어 다시 공지드리겠습니다.',
    isEdited: true,
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
  },
]

let nextCommentId = Math.max(0, ...comments.map((c) => c.id)) + 1

export const listComments = (postId: number) =>
  comments.filter((c) => c.postId === postId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

export const findComment = (id: number) => comments.find((c) => c.id === id)

/** 마이페이지 — 내가 쓴 댓글. 원글 제목·유형을 붙여 준다(§5.9). */
export function listCommentsByUser(userId: number, page: number, size: number) {
  const mine = comments
    .filter((c) => c.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((c) => {
      const post = findPost(c.postId)
      return {
        ...c,
        postTitle: post?.title ?? '(삭제된 게시글)',
        postType: post?.type ?? null,
      }
    })
  const start = (page - 1) * size
  return { items: mine.slice(start, start + size), page, size, total: mine.length }
}

export function createComment(input: {
  postId: number
  userId: number
  author: string
  content: string
}): Comment {
  const comment: Comment = {
    id: nextCommentId++,
    ...input,
    isEdited: false,
    createdAt: new Date().toISOString(),
  }
  comments.push(comment)
  return comment
}

export function updateComment(id: number, content: string): Comment | null {
  const comment = findComment(id)
  if (!comment) return null
  comment.content = content
  comment.isEdited = true
  return comment
}

export function deleteComment(id: number): boolean {
  const index = comments.findIndex((c) => c.id === id)
  if (index === -1) return false
  comments.splice(index, 1)
  return true
}

/* ── 투표 ───────────────────────────────────────────────────────────────── */

type StoredPoll = Poll & { postId: number }
type StoredOption = { id: number; pollId: number; text: string; voteCount: number }

const polls: StoredPoll[] = []
const options: StoredOption[] = []

/**
 * 참여 기록. `${pollId}:${userId}` 만 담는다 — **무엇을 골랐는지는 담지 않는다.**
 * 중복 투표 방지와 "참여했는가" 표시에만 쓴다.
 */
const voters = new Set<string>()

/**
 * 기명 투표에서만 남기는 선택 내용. 익명 투표에는 아무것도 들어가지 않는다.
 *
 * **익명 투표를 다시 던질 수 없는 이유가 여기 있다.** 서버가 누가 무엇을 골랐는지
 * 모르면 이전 표를 깎을 수 없다. 링크를 남기면 익명이 깨지므로 둘은 양립하지
 * 않는다 — 실제 익명 투표가 한 번 던지면 확정인 것과 같은 이유다.
 */
const namedChoices = new Map<string, number[]>()

let nextPollId = 1
let nextOptionId = 1

const voterKey = (pollId: number, userId: number) => `${pollId}:${userId}`

export const findPollByPost = (postId: number) => polls.find((p) => p.postId === postId)

export const findPoll = (pollId: number) => polls.find((p) => p.id === pollId)

function removePollOfPost(postId: number) {
  const poll = findPollByPost(postId)
  if (!poll) return
  for (let i = options.length - 1; i >= 0; i--) {
    if (options[i].pollId === poll.id) options.splice(i, 1)
  }
  polls.splice(polls.indexOf(poll), 1)
  for (const key of [...voters]) if (key.startsWith(`${poll.id}:`)) voters.delete(key)
  for (const key of [...namedChoices.keys()]) {
    if (key.startsWith(`${poll.id}:`)) namedChoices.delete(key)
  }
}

export type PollInput = {
  title: string
  isMultiple: boolean
  isAnonymous: boolean
  isPrivate: boolean
  options: string[]
}

/**
 * 게시글에 붙은 투표를 만들거나 고친다. **서버가 한 번에 처리한다.**
 *
 * 구 구현은 클라이언트가 먼저 `DELETE /polls/:id` 를 부르고 서버는 INSERT 만 했다.
 * 그래서 매니저가 타인 글을 수정하면 DELETE 403 → INSERT 409 로 반드시 실패했고,
 * 옵션을 하나도 안 바꿔도 표가 전부 사라졌다(§12-8).
 *
 * **옵션 텍스트가 그대로면 그 옵션의 표를 보존한다.** 사라진 옵션의 표만 버린다.
 */
export function upsertPoll(postId: number, input: PollInput | null): void {
  const existing = findPollByPost(postId)

  if (input === null) {
    if (existing) removePollOfPost(postId)
    return
  }

  if (!existing) {
    const poll: StoredPoll = {
      id: nextPollId++,
      postId,
      title: input.title,
      isMultiple: input.isMultiple,
      isAnonymous: input.isAnonymous,
      isPrivate: input.isPrivate,
    }
    polls.push(poll)
    for (const text of input.options) {
      options.push({ id: nextOptionId++, pollId: poll.id, text, voteCount: 0 })
    }
    return
  }

  existing.title = input.title
  existing.isMultiple = input.isMultiple
  existing.isAnonymous = input.isAnonymous
  existing.isPrivate = input.isPrivate

  const current = options.filter((o) => o.pollId === existing.id)
  const kept: StoredOption[] = []

  for (const text of input.options) {
    // 같은 텍스트가 남아 있으면 그 옵션을 그대로 가져간다 — 표가 보존된다
    const match = current.find((o) => o.text === text && !kept.includes(o))
    kept.push(match ?? { id: nextOptionId++, pollId: existing.id, text, voteCount: 0 })
  }

  for (const option of current) {
    if (!kept.includes(option)) options.splice(options.indexOf(option), 1)
  }
  for (const option of kept) {
    if (!options.includes(option)) options.push(option)
  }

  // 사라진 옵션만 골랐던 사람의 기록도 정리한다
  const keptIds = new Set(kept.map((o) => o.id))
  for (const [key, chosen] of [...namedChoices]) {
    if (!key.startsWith(`${existing.id}:`)) continue
    const remaining = chosen.filter((id) => keptIds.has(id))
    if (remaining.length === 0) {
      namedChoices.delete(key)
      voters.delete(key)
    } else {
      namedChoices.set(key, remaining)
    }
  }
}

/** §5.4 가시성 규칙. 비공개면 결과를, 익명이면 명단을 감춘다. */
export function pollResponse(
  postId: number,
  viewer: { id: number; authority: Role } | null,
  displayName: (userId: number) => string,
): PollResponse | null {
  const poll = findPollByPost(postId)
  if (!poll) return null

  const post = findPost(postId)
  const isOwner = viewer !== null && post?.userId === viewer.id
  // 주의: manager 는 비공개 결과를 볼 수 없다. staff/root 만 가능하다(§5.4)
  const isHighRole = viewer?.authority === 'staff' || viewer?.authority === 'root'
  const canSeeResults = !poll.isPrivate || isOwner || isHighRole
  const canSeeVoters = !poll.isAnonymous && canSeeResults

  const list = options.filter((o) => o.pollId === poll.id)
  const total = list.reduce((sum, o) => sum + o.voteCount, 0)

  const responseOptions: PollOption[] = list.map((option) => ({
    id: option.id,
    text: option.text,
    votes: canSeeResults ? option.voteCount : null,
    percentage: canSeeResults
      ? total === 0
        ? 0
        : Math.round((option.voteCount / total) * 1000) / 10
      : null,
    // 익명 투표에는 애초에 명단이 존재하지 않는다
    voters: canSeeVoters ? votersOf(option, displayName) : [],
  }))

  return {
    poll: {
      id: poll.id,
      title: poll.title,
      isMultiple: poll.isMultiple,
      isAnonymous: poll.isAnonymous,
      isPrivate: poll.isPrivate,
    },
    options: responseOptions,
    totalVotes: canSeeResults ? total : null,
    userVotes: viewer === null ? [] : (namedChoices.get(voterKey(poll.id, viewer.id)) ?? []),
    hasVoted: viewer !== null && voters.has(voterKey(poll.id, viewer.id)),
    canSeeResults,
  }
}

function votersOf(option: StoredOption, displayName: (userId: number) => string): string[] {
  const names: string[] = []
  for (const [key, chosen] of namedChoices) {
    const [pollId, userId] = key.split(':').map(Number)
    if (pollId === option.pollId && chosen.includes(option.id)) names.push(displayName(userId))
  }
  return names
}

/**
 * 마이페이지 — 내가 참여한 투표.
 *
 * **§12-9 의 귀결이 여기서 그대로 드러난다.** 기명 투표는 내가 무엇을 골랐는지
 * 돌려줄 수 있지만, 익명 투표는 서버가 저장하지 않으므로 `myChoices` 가 null 이다.
 * "참여했다"까지만 말할 수 있다 — 그게 익명이 진짜라는 증거다.
 */
export function listVotesByUser(userId: number) {
  return polls
    .filter((poll) => voters.has(voterKey(poll.id, userId)))
    .map((poll) => {
      const chosen = namedChoices.get(voterKey(poll.id, userId))
      const post = findPost(poll.postId)
      return {
        pollId: poll.id,
        pollTitle: poll.title,
        postId: poll.postId,
        postTitle: post?.title ?? '(삭제된 게시글)',
        isAnonymous: poll.isAnonymous,
        isPrivate: poll.isPrivate,
        myChoices: poll.isAnonymous
          ? null
          : (chosen ?? []).map(
              (id) => options.find((o) => o.id === id)?.text ?? '(삭제된 선택지)',
            ),
      }
    })
    .sort((a, b) => b.pollId - a.pollId)
}

/**
 * 탈퇴 익명화(§12-12). **글과 댓글을 지우지 않고 작성자 연결만 끊는다.**
 *
 * 구 구현은 글을 통째로 DELETE 해서 그 글에 달린 **타인의 댓글과 투표까지**
 * CASCADE 로 사라졌다. `author` 는 작성 시점 스냅샷이라 그대로 두고,
 * 화면은 userId 가 null 인 것으로 탈퇴 회원임을 안다.
 *
 * 투표는 손대지 않는다 — 표를 빼면 집계가 무너진다. 명단에서는
 * `pollResponse` 의 displayName 이 "(탈퇴한 회원)" 으로 보여준다.
 */
export function anonymizeAuthor(userId: number): void {
  for (const post of posts) {
    if (post.userId === userId) post.userId = null
  }
  for (const comment of comments) {
    if (comment.userId === userId) comment.userId = null
  }
}

export type VoteResult = 'ok' | 'invalid' | 'anonymous-locked'

export function vote(poll: StoredPoll, userId: number, optionIds: number[]): VoteResult {
  const list = options.filter((o) => o.pollId === poll.id)
  if (optionIds.length === 0) return 'invalid'
  if (!poll.isMultiple && optionIds.length > 1) return 'invalid'
  if (new Set(optionIds).size !== optionIds.length) return 'invalid'
  if (!optionIds.every((id) => list.some((o) => o.id === id))) return 'invalid'

  const key = voterKey(poll.id, userId)
  const already = voters.has(key)

  // 익명 투표는 서버가 이전 선택을 모르므로 표를 되돌릴 수 없다
  if (already && poll.isAnonymous) return 'anonymous-locked'

  if (already) {
    for (const previous of namedChoices.get(key) ?? []) {
      const option = list.find((o) => o.id === previous)
      if (option) option.voteCount -= 1
    }
  }

  for (const id of optionIds) {
    const option = list.find((o) => o.id === id)
    if (option) option.voteCount += 1
  }

  voters.add(key)
  // 기명일 때만 선택 내용을 남긴다
  if (poll.isAnonymous) namedChoices.delete(key)
  else namedChoices.set(key, [...optionIds])

  return 'ok'
}

/* ── 초기 투표 픽스처 ───────────────────────────────────────────────────── */

// 공개·익명·비공개 세 경우를 화면에서 모두 볼 수 있게 심어 둔다.
// 인덱스가 아니라 제목으로 붙인다 — 정렬이 바뀌어도 의도한 글에 달린다.
const POLL_SEEDS: Array<{ postTitle: string; input: PollInput; tallies: number[] }> = [
  {
    postTitle: '이번 주 훈련 참석 여부 투표',
    input: {
      title: '이번 주 훈련에 참석하시나요?',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['참석', '불참', '미정'],
    },
    tallies: [7, 2, 3],
  },
  {
    postTitle: 'MT 숙소 예약 완료되었습니다',
    input: {
      title: '회식 메뉴를 골라 주세요 (익명 · 복수 선택)',
      isMultiple: true,
      isAnonymous: true,
      isPrivate: false,
      options: ['삼겹살', '치킨', '피자', '국밥'],
    },
    tallies: [6, 5, 2, 4],
  },
  {
    postTitle: '체육관 이용 규정 변경 안내',
    input: {
      title: '변경안에 동의하십니까? (비공개)',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: true,
      options: ['동의', '반대'],
    },
    tallies: [4, 6],
  },
]

for (const seed of POLL_SEEDS) {
  const post = posts.find((p) => p.title === seed.postTitle)
  if (!post) throw new Error(`투표를 붙일 게시글이 없다: ${seed.postTitle}`)
  upsertPoll(post.id, seed.input)
  const poll = findPollByPost(post.id)
  if (!poll) continue
  options
    .filter((o) => o.pollId === poll.id)
    .forEach((option, i) => {
      option.voteCount = seed.tallies[i] ?? 0
    })
}
