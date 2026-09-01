import { MOCK_USERS, type MockUser } from '@/mocks/fixtures/users'
import type { AuthUser, User } from '@/types/auth'

export type { MockUser }

/**
 * 목 서버의 인증 상태. 브라우저 탭 메모리에만 산다 — 새로고침하면 초기화된다.
 *
 * 회원가입·멤버 신청이 실제로 반영되어야 화면 흐름을 끝까지 걸어볼 수 있으므로
 * 사용자 목록을 변경 가능한 상태로 들고 있는다.
 */

/** 픽스처를 복사해 쓴다. 원본을 건드리면 새로고침해도 되돌아오지 않는다 */
const users: MockUser[] = MOCK_USERS.map((user) => ({ ...user }))

/** 토큰 → 사용자 id */
const sessions = new Map<string, number>()

/**
 * 이메일 인증을 마친 주소.
 *
 * **§12-3 결함을 고치는 부분이다.** 구 구현은 인증 성공 사실을 서버 어디에도
 * 남기지 않아 API 를 직접 호출하면 임의 이메일로 가입할 수 있었다.
 * 서버가 이 목록을 들고 가입 시 검사해야 한다.
 */
const verifiedEmails = new Set<string>()

/** 발송한 인증 코드. 이메일 → { code, 만료시각 } */
const emailCodes = new Map<string, { code: string; expiresAt: number }>()

const CODE_TTL_MS = 5 * 60 * 1000

let nextUserId = Math.max(...users.map((u) => u.id)) + 1

/* ── 사용자 ─────────────────────────────────────────────────────────────── */

export const listUsers = (): MockUser[] => users

export const findByUsername = (username: string) =>
  users.find((u) => u.username.toLowerCase() === username.toLowerCase())

export const findByEmail = (email: string) =>
  users.find((u) => u.email.toLowerCase() === email.toLowerCase())

export const findById = (id: number) => users.find((u) => u.id === id)

export function createUser(input: {
  username: string
  email: string
  marketingEmail: boolean
}): MockUser {
  const user: MockUser = {
    id: nextUserId++,
    username: input.username,
    email: input.email,
    password: '',
    name: null,
    studentId: null,
    obYb: null,
    phone: null,
    phoneCountry: '82',
    authority: 'basic',
    staffType: null,
    membershipStatus: 'none',
    isBanned: false,
    marketingEmail: input.marketingEmail,
    marketingAgreedAt: input.marketingEmail ? new Date().toISOString().slice(0, 10) : null,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  users.push(user)
  return user
}

/** 비밀번호는 절대 응답에 실리면 안 된다. 응답을 만들 때 반드시 이 함수를 거친다. */
export function toPublicUser(user: MockUser): User {
  const { password: _password, ...rest } = user
  return rest
}

/** 로그인 응답과 인증 컨텍스트가 들고 다니는 최소 정보. */
export function toAuthUser(user: MockUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    authority: user.authority,
    staffType: user.staffType,
    obYb: user.obYb,
    membershipStatus: user.membershipStatus,
    isBanned: user.isBanned,
  }
}

/* ── 세션 ───────────────────────────────────────────────────────────────── */

/**
 * 목 토큰. 실제 JWT 가 아니다.
 *
 * 프론트가 토큰을 디코드해서 권한을 읽지 않고 `GET /api/auth/me` 로 서버에
 * 물어보도록 설계했으므로(§2.3 의 "디코드는 표시용" 애매함을 없애기 위해서다)
 * 목에서는 불투명한 문자열이면 충분하다.
 */
export function issueToken(user: MockUser): string {
  const token = `mock.${user.id}.${Math.random().toString(36).slice(2, 12)}`
  sessions.set(token, user.id)
  return token
}

export function userForToken(token: string | null): MockUser | null {
  if (!token) return null

  // 이번 세션에 발급한 토큰
  const known = sessions.get(token)
  if (known !== undefined) return findById(known) ?? null

  // 새로고침하면 이 모듈의 메모리가 초기화되어 sessions 가 비워진다. 그러면
  // localStorage 에 토큰이 남아 있어도 로그아웃되어 "자동 로그인" 이 무의미해진다.
  // 실제 JWT 가 서명으로 자기 완결성을 갖는 것처럼, 목 토큰도 사용자 id 를
  // 담고 있으므로 그것으로 복원한다.
  //
  // 대가: 폐기한 토큰도 새로고침 뒤에는 다시 통한다. 목에서만 허용되는
  // 단순화이며, 실제 백엔드는 서명과 만료로 판정해야 한다.
  const parsed = /^mock\.(\d+)\./.exec(token)
  if (!parsed) return null
  const user = findById(Number(parsed[1]))
  if (!user) return null

  sessions.set(token, user.id)
  return user
}

export const revokeToken = (token: string) => sessions.delete(token)

/* ── 이메일 인증 ────────────────────────────────────────────────────────── */

export function issueEmailCode(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  emailCodes.set(email.toLowerCase(), { code, expiresAt: Date.now() + CODE_TTL_MS })
  return code
}

export function verifyEmailCode(email: string, code: string): boolean {
  const key = email.toLowerCase()
  const entry = emailCodes.get(key)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    emailCodes.delete(key)
    return false
  }
  if (entry.code !== code) return false

  // 1회용. 성공하면 즉시 폐기하고 인증된 목록에 올린다
  emailCodes.delete(key)
  verifiedEmails.add(key)
  return true
}

export const isEmailVerified = (email: string) => verifiedEmails.has(email.toLowerCase())

export const consumeVerifiedEmail = (email: string) => verifiedEmails.delete(email.toLowerCase())
