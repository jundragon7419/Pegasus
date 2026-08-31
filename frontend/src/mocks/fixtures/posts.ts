import { PIN_FOREVER } from '@/types/board'
import type { PostSummary, PostType } from '@/types/board'

/**
 * 게시글 픽스처.
 *
 * 홈 위젯은 고정글 전체 + 최신글로 8칸을 채우고, 게시판 목록은 15개씩 끊어
 * 페이지네이션한다. 두 화면을 모두 확인할 수 있는 분량과 구성으로 만든다.
 * 등장인물은 전부 가공값이다.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** 오늘로부터 daysAgo 일 전 날짜. 픽스처가 시간이 지나도 "최근 글"로 보이게 한다. */
function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

type Seed = {
  type: PostType
  title: string
  author: string
  days: number
  views: number
  pin?: 'forever' | number
}

const SEEDS: Seed[] = [
  { type: 'notice', title: '2026 시즌 정기훈련 일정 안내', author: 'coach_kim(김도현)', days: 2, views: 412, pin: 'forever' },
  { type: 'notice', title: '동아리비 납부 안내 (3월분)', author: 'pres_lee(이서준)', days: 5, views: 288, pin: 14 },
  { type: 'game', title: '교내 리그 3차전 결과 — 7:4 승', author: 'coach_kim(김도현)', days: 1, views: 356 },
  { type: 'event', title: '신입 부원 환영회 장소 변경', author: 'pres_lee(이서준)', days: 3, views: 197 },
  { type: 'normal', title: '어제 훈련 사진 올립니다', author: 'jun_park(박준혁)', days: 3, views: 143 },
  { type: 'normal', title: '배팅 장갑 공동구매 하실 분', author: 'min_choi(최민재)', days: 4, views: 121 },
  { type: 'game', title: '연합 친선경기 라인업 공지', author: 'coach_kim(김도현)', days: 6, views: 231 },
  { type: 'family_occasion', title: '3기 선배님 결혼 소식 전합니다', author: 'pres_lee(이서준)', days: 7, views: 168 },
  { type: 'normal', title: '글러브 수선 잘하는 곳 추천받아요', author: 'woo_jang(장우진)', days: 8, views: 96 },
  { type: 'normal', title: '이번 주 훈련 참석 여부 투표', author: 'min_choi(최민재)', days: 9, views: 204 },
  { type: 'event', title: 'MT 숙소 예약 완료되었습니다', author: 'pres_lee(이서준)', days: 11, views: 178 },
  { type: 'normal', title: '운동장 사용 시간이 변경되었습니다', author: 'jun_park(박준혁)', days: 12, views: 87 },
  { type: 'game', title: '2차전 하이라이트 영상', author: 'coach_kim(김도현)', days: 14, views: 302 },
  { type: 'normal', title: '헬멧 분실물 찾아가세요', author: 'woo_jang(장우진)', days: 15, views: 64 },
  { type: 'notice', title: '체육관 이용 규정 변경 안내', author: 'coach_kim(김도현)', days: 17, views: 152 },
  { type: 'normal', title: '주말 자율훈련 하실 분 모집', author: 'sung_han(한성민)', days: 18, views: 73 },
  { type: 'normal', title: '스파이크 사이즈 교환 원해요', author: 'min_choi(최민재)', days: 20, views: 51 },
  { type: 'event', title: '졸업생 초청 경기 일정 확정', author: 'pres_lee(이서준)', days: 22, views: 189 },
  { type: 'normal', title: '훈련 영상 편집본 공유합니다', author: 'jun_park(박준혁)', days: 24, views: 118 },
  { type: 'normal', title: '다음 주 우천 시 일정 문의', author: 'sung_han(한성민)', days: 26, views: 45 },
  { type: 'game', title: '1차전 결과 — 3:5 패', author: 'coach_kim(김도현)', days: 29, views: 267 },
  { type: 'normal', title: '신입생 환영합니다!', author: 'woo_jang(장우진)', days: 32, views: 134 },
]

function resolvePin(seed: Seed): { pinUntil: string | null; isPinned: boolean } {
  if (!seed.pin) return { pinUntil: null, isPinned: false }
  if (seed.pin === 'forever') return { pinUntil: PIN_FOREVER, isPinned: true }
  const d = new Date()
  d.setDate(d.getDate() + seed.pin)
  return { pinUntil: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, isPinned: true }
}

export const POSTS: PostSummary[] = SEEDS.map((seed, index) => ({
  id: 1000 - index,
  userId: 10 + (index % 6),
  type: seed.type,
  ...resolvePin(seed),
  title: seed.title,
  author: seed.author,
  date: daysAgo(seed.days),
  views: seed.views,
}))
  // 서버와 같은 정렬: 고정글 우선, 그다음 날짜 내림차순, 그다음 id 내림차순
  .sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.id - a.id
  })
