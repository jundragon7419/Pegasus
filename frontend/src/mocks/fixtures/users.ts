import type { MembershipStatus, ObYb, Role, StaffType, User } from '@/types/auth'

/**
 * 목 사용자.
 *
 * §4.4 권한 매트릭스와 §7.1 멤버십 상태 머신을 화면에서 직접 걸어보려면
 * 각 역할과 각 상태에 해당하는 계정이 하나씩 있어야 한다.
 *
 * **두 덩어리로 나뉜다.**
 * 1. id 1~8 — 역할·상태별 대표 계정. 다른 픽스처(게시글 작성자, 로스터 연결,
 *    감사 로그)가 이 id 를 직접 참조하므로 **id 와 학번을 바꾸면 안 된다.**
 * 2. id 9~ — 관리자 화면의 표를 채우는 계정들. 버킷마다 1명뿐이면 8개 탭의
 *    표가 전부 1행이라 목록·검색·"여러 명 중 고르기" 흐름을 시험할 수 없다.
 *
 * 이름·이메일·학번은 전부 가공값이다. 학번 5번째 자리 `9` 가 합성값 표식이다.
 * 구 시드(`C:\code\WEB\...\sql\seeds\`)의 실명·실제 학번은 **절대 옮기지 않는다** —
 * 이 저장소는 공개 원격이 붙어 있다.
 */

export type MockUser = User & {
  /** 목 전용. 실제 응답에는 절대 포함시키지 않는다 */
  password: string
}

/** 모든 목 계정의 공통 비밀번호. §7.2 규칙(8자 이상 + 영문·숫자·특수문자)을 만족한다. */
export const MOCK_PASSWORD = 'Pegasus!2026'

const base = {
  password: MOCK_PASSWORD,
  phone: null,
  phoneCountry: '82',
  marketingEmail: false,
  marketingAgreedAt: null,
  createdAt: '2026-03-02',
  isBanned: false,
} satisfies Partial<MockUser>

/** id 1~8. 역할·상태별 대표 계정 — 다른 픽스처가 이 id 를 참조한다. */
const CANONICAL: MockUser[] = [
  {
    ...base,
    id: 1,
    username: 'newbie',
    email: 'newbie@example.com',
    // 프로필 미입력 상태. 멤버 신청 전제조건(§7.1)을 만족하지 못한다
    name: null,
    studentId: null,
    obYb: null,
    authority: 'basic',
    staffType: null,
    membershipStatus: 'none',
  },
  {
    ...base,
    id: 2,
    username: 'applicant',
    email: 'applicant@example.com',
    name: '한지호',
    studentId: '2025900001',
    obYb: 'yb',
    authority: 'basic',
    staffType: null,
    // 승인 대기. 관리자 화면의 "멤버 승인" 탭에서 처리 대상이 된다
    membershipStatus: 'pending',
  },
  {
    ...base,
    id: 3,
    username: 'player01',
    email: 'player01@example.com',
    name: '김민준',
    studentId: '2024900002',
    obYb: 'yb',
    authority: 'member',
    staffType: null,
    membershipStatus: 'approved',
  },
  {
    ...base,
    id: 4,
    username: 'manager01',
    email: 'manager01@example.com',
    name: '이서준',
    studentId: '2023900003',
    obYb: 'yb',
    authority: 'manager',
    staffType: null,
    membershipStatus: 'approved',
  },
  {
    ...base,
    id: 5,
    username: 'president',
    email: 'president@example.com',
    name: '박도윤',
    studentId: '2022900004',
    obYb: 'yb',
    authority: 'staff',
    staffType: 'president',
    membershipStatus: 'approved',
  },
  {
    ...base,
    id: 6,
    username: 'headcoach',
    email: 'headcoach@example.com',
    name: '최우진',
    studentId: '2008900005',
    obYb: 'ob',
    authority: 'staff',
    staffType: 'headcoach',
    membershipStatus: 'approved',
  },
  {
    ...base,
    id: 7,
    username: 'rootadmin',
    email: 'root@example.com',
    name: '정한결',
    studentId: '2020900006',
    obYb: 'ob',
    authority: 'root',
    staffType: null,
    membershipStatus: 'approved',
  },
  {
    ...base,
    id: 8,
    username: 'bannedone',
    email: 'banned@example.com',
    name: '오시윤',
    studentId: '2024900007',
    obYb: 'yb',
    authority: 'member',
    staffType: null,
    membershipStatus: 'approved',
    // 차단된 계정. 로그인 시 401 이 아니라 403 으로 구분된다(§5.1)
    isBanned: true,
  },
]

/* ── 관리자 화면을 채우는 계정 ──────────────────────────────────────────────
   버킷마다 최소 3명씩 둔다. 1명뿐이면 표가 1행이라 목록·검색·다중 선택 흐름을
   눈으로도 검증 스크립트로도 확인할 수 없다.

   학번은 `연도 + 9 + 02NN` 대역을 쓴다 — 로스터 픽스처가 쓰는 대역과 겹치지
   않게 해서, 로스터 연결은 아래에서 **의도한 계정에만** 걸리게 한다. */

type Extra = {
  username: string
  name: string
  studentId: string
  obYb: ObYb
  authority: Role
  staffType?: StaffType
  membershipStatus: MembershipStatus
  isBanned?: boolean
}

const EXTRAS: Extra[] = [
  // 미신청 basic — "일반유저 관리" 탭
  { username: 'guest_kim', name: '김서윤', studentId: '2026900201', obYb: 'yb', authority: 'basic', membershipStatus: 'none' },
  { username: 'guest_lee', name: '이하준', studentId: '2026900202', obYb: 'yb', authority: 'basic', membershipStatus: 'none' },

  // 승인 대기 — "멤버 승인" 탭. 승인/거부를 여러 건 걸어볼 수 있어야 한다
  { username: 'wait_park', name: '박지우', studentId: '2026900203', obYb: 'yb', authority: 'basic', membershipStatus: 'pending' },
  { username: 'wait_choi', name: '최은우', studentId: '2025900204', obYb: 'yb', authority: 'basic', membershipStatus: 'pending' },
  { username: 'wait_jung', name: '정예린', studentId: '2025900205', obYb: 'yb', authority: 'basic', membershipStatus: 'pending' },

  // 거부됨 — 프로필을 고쳐 재신청할 수 있는 상태(§7.1)
  { username: 'again_yoon', name: '윤도현', studentId: '2024900206', obYb: 'yb', authority: 'basic', membershipStatus: 'rejected' },
  { username: 'again_oh', name: '오수아', studentId: '2024900207', obYb: 'yb', authority: 'basic', membershipStatus: 'rejected' },

  // 멤버 — "멤버 관리"(강등)·"매니저 관리"(임명 대상) 두 탭이 함께 쓴다
  { username: 'player02', name: '강태윤', studentId: '2024900208', obYb: 'yb', authority: 'member', membershipStatus: 'approved' },
  { username: 'player03', name: '조민서', studentId: '2023900209', obYb: 'yb', authority: 'member', membershipStatus: 'approved' },
  { username: 'player04', name: '임하율', studentId: '2023900210', obYb: 'yb', authority: 'member', membershipStatus: 'approved' },
  { username: 'player05', name: '신재원', studentId: '2022900211', obYb: 'ob', authority: 'member', membershipStatus: 'approved' },

  // 매니저 — 해제 대상이 여럿이어야 "현재 매니저" 표가 표처럼 보인다
  { username: 'manager02', name: '한소율', studentId: '2023900212', obYb: 'yb', authority: 'manager', membershipStatus: 'approved' },
  { username: 'manager03', name: '배준호', studentId: '2022900213', obYb: 'ob', authority: 'manager', membershipStatus: 'approved' },

  // 차단 — authority 와 신청 상태가 서로 달라야, 해제했을 때 **원래 상태가
  // 그대로 돌아오는지**(구 구현은 추측해서 덮어썼다) 확인할 수 있다
  { username: 'banned_basic', name: '문시우', studentId: '2026900214', obYb: 'yb', authority: 'basic', membershipStatus: 'none', isBanned: true },
  { username: 'banned_mgr', name: '노아린', studentId: '2022900215', obYb: 'ob', authority: 'manager', membershipStatus: 'approved', isBanned: true },
]

export const MOCK_USERS: MockUser[] = [
  ...CANONICAL,
  ...EXTRAS.map((extra, index) => ({
    ...base,
    id: CANONICAL.length + index + 1,
    email: `${extra.username}@example.com`,
    staffType: null,
    ...extra,
  })),
]
