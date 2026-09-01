import type { User } from '@/types/auth'

/**
 * 목 사용자.
 *
 * §4.4 권한 매트릭스와 §7.1 멤버십 상태 머신을 화면에서 직접 걸어보려면
 * 각 역할과 각 상태에 해당하는 계정이 하나씩 있어야 한다.
 *
 * 이름·이메일·학번은 전부 가공값이다. 학번 5번째 자리 `9` 가 합성값 표식이다.
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

export const MOCK_USERS: MockUser[] = [
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
