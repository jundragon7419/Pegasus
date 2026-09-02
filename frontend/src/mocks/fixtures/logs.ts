import type { ActivityLog } from '@/types/activity-log'

/**
 * 감사 로그 픽스처.
 *
 * 로그 화면은 액션 종류마다 요약 레이아웃이 다르다(§6.3). 한 종류만 심어 두면
 * 나머지 레이아웃을 한 번도 보지 못한 채 넘어가게 되므로, **여섯 갈래를 모두**
 * 넣는다 — 게시글 · 댓글 · 일정 · 멤버/권한/차단 · 로스터 · 설정.
 *
 * 대부분을 `player01`(id 3) 것으로 둔다. 마이페이지 활동 로그 탭을 그 계정으로
 * 확인하기 때문이다. 관리 액션은 다음 페이즈(활동내역)에서 쓰인다.
 */

const HOUR = 3600_000

/** n 시간 전. 픽스처가 시간이 지나도 "최근"으로 보이게 한다. */
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR).toISOString()

type Seed = Omit<ActivityLog, 'id' | 'createdAt'> & { hours: number }

const SEEDS: Seed[] = [
  /* ── 게시글 ─────────────────────────────────────────────────────────── */
  {
    userId: 3,
    username: 'player01(김민준)',
    action: 'post_create',
    targetType: 'post',
    targetId: 996,
    snapshot: { type: 'normal', title: '어제 훈련 사진 올립니다', content: '어제 훈련 사진 올립니다\n\n자유롭게 의견 남겨 주세요.', pinUntil: null },
    hours: 72,
  },
  {
    // 수정 로그는 before/after 를 둘 다 담는다(§12-7). 구 구현은 after 만 남겼다
    userId: 3,
    username: 'player01(김민준)',
    action: 'post_update',
    targetType: 'post',
    targetId: 996,
    snapshot: {
      before: { type: 'normal', title: '훈련 사진', content: '사진 올립니다.', pinUntil: null },
      after: { type: 'normal', title: '어제 훈련 사진 올립니다', content: '어제 훈련 사진 올립니다\n\n자유롭게 의견 남겨 주세요.', pinUntil: null },
    },
    hours: 70,
  },
  {
    userId: 3,
    username: 'player01(김민준)',
    action: 'post_delete',
    targetType: 'post',
    targetId: 9001,
    snapshot: { type: 'normal', title: '잘못 올린 글', content: '테스트입니다. 삭제할게요.' },
    hours: 68,
  },

  /* ── 댓글 ───────────────────────────────────────────────────────────── */
  {
    userId: 3,
    username: 'player01(김민준)',
    action: 'comment_create',
    targetType: 'comment',
    targetId: 1,
    snapshot: { content: '확인했습니다. 참석하겠습니다!', postId: 1000, postTitle: '2026 시즌 정기훈련 일정 안내' },
    hours: 1,
  },
  {
    userId: 4,
    username: 'manager01(이서준)',
    action: 'comment_update',
    targetType: 'comment',
    targetId: 2,
    snapshot: {
      before: { content: '장소가 변경될 수 있습니다.', postId: 1000, postTitle: '2026 시즌 정기훈련 일정 안내' },
      after: { content: '장소가 변경될 수 있어 다시 공지드리겠습니다.', postId: 1000, postTitle: '2026 시즌 정기훈련 일정 안내' },
    },
    hours: 0.5,
  },

  /* ── 투표 — 선택 내용은 담기지 않는다(§12-9) ─────────────────────────── */
  {
    userId: 3,
    username: 'player01(김민준)',
    action: 'vote_submit',
    targetType: 'poll',
    targetId: 2,
    snapshot: {
      pollId: 2,
      pollTitle: '회식 메뉴를 골라 주세요 (익명 · 복수 선택)',
      postId: 990,
      postTitle: 'MT 숙소 예약 완료되었습니다',
    },
    hours: 26,
  },

  /* ── 일정 ───────────────────────────────────────────────────────────── */
  {
    userId: 4,
    username: 'manager01(이서준)',
    action: 'event_create',
    targetType: 'event',
    targetId: 501,
    snapshot: { date: '2026-09-12', type: 'training', name: '주말 정기훈련' },
    hours: 30,
  },
  {
    userId: 4,
    username: 'manager01(이서준)',
    action: 'event_delete',
    targetType: 'event',
    targetId: 498,
    snapshot: { date: '2026-08-29', type: 'meeting', name: '임원 회의' },
    hours: 29,
  },

  /* ── 멤버 · 권한 · 차단 ──────────────────────────────────────────────── */
  {
    userId: 4,
    username: 'manager01(이서준)',
    action: 'member_approve',
    targetType: 'user',
    targetId: 3,
    snapshot: { username: 'player01', name: '김민준', studentId: '2024900002', obYb: 'yb' },
    hours: 400,
  },
  {
    userId: 5,
    username: 'president(박도윤)',
    action: 'role_set_manager',
    targetType: 'user',
    targetId: 4,
    snapshot: { username: 'manager01', name: '이서준', studentId: '2023900003', obYb: 'yb' },
    hours: 380,
  },
  {
    userId: 5,
    username: 'president(박도윤)',
    action: 'user_ban',
    targetType: 'user',
    targetId: 8,
    snapshot: { username: 'bannedone', name: '오시윤', studentId: '2024900007', obYb: 'yb' },
    hours: 200,
  },

  /* ── 로스터 · 설정 ──────────────────────────────────────────────────── */
  {
    userId: 4,
    username: 'manager01(이서준)',
    action: 'roster_add',
    targetType: 'roster',
    targetId: 2026001,
    snapshot: { name: '김민준', studentId: '2024900002', role: 'roster_player', year: 2026, number: '7' },
    hours: 350,
  },
  {
    userId: 5,
    username: 'president(박도윤)',
    action: 'roster_year_set',
    targetType: 'setting',
    targetId: null,
    snapshot: { year: 2026 },
    hours: 340,
  },

  /* ── 탈퇴 — 계정은 사라졌지만 기록은 남는다(§12-12) ──────────────────── */
  {
    // userId 가 null 인 것이 정상이다. 탈퇴 시 연결만 끊고 로그는 보존한다
    userId: null,
    username: 'woo_jang(장우진)',
    action: 'user_withdraw',
    targetType: 'user',
    targetId: null,
    snapshot: { username: 'woo_jang', name: '장우진' },
    hours: 500,
  },
]

export const LOG_SEEDS: ActivityLog[] = SEEDS.map((seed, index) => {
  const { hours, ...rest } = seed
  return { ...rest, id: index + 1, createdAt: hoursAgo(hours) }
})
