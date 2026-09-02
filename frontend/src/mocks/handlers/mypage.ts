import { HttpResponse, http } from 'msw'

import { requireAuth, requireRole } from '@/mocks/authGuard'
import {
  changePassword,
  consumeVerifiedEmail,
  findByEmail,
  findByUsername,
  isEmailVerified,
  removeUser,
  toPublicUser,
  type MockUser,
} from '@/mocks/authState'
import { anonymizeAuthor, listCommentsByUser, listPostsByUser, listVotesByUser } from '@/mocks/boardState'
import { anonymizeLogsOf, listLogs, log } from '@/mocks/logState'
import { listRosterByUser, unlinkUser } from '@/mocks/rosterState'
import { applyMockSwitches } from '@/mocks/switches'
import { canEditProfile, checkMembershipRequest, MEMBERSHIP_BLOCK_MESSAGE } from '@/lib/membership'
import { canWithdraw } from '@/lib/roles'
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateStudentId,
  validateUsername,
} from '@/lib/validators'
import type { ObYb } from '@/types/auth'

/**
 * 블루프린트 §5.9. 라우터 전체에 인증이 걸린다.
 *
 * 구 구현에서 미완성이거나 어긋나 있던 것들을 여기서 바로잡는다.
 * - 비밀번호 변경이 아예 없었다(부록 A) → `PUT /password`
 * - 이메일을 바꿀 때 인증을 확인하지 않았다(§12-3) → 서버가 검사
 * - 학번을 "선택"이라 표기하고 서버는 필수로 요구했다(§12-13) → `lib/membership.ts` 한 곳에서 판정
 * - 탈퇴가 타인의 댓글·투표와 감사 로그까지 지웠다(§12-12) → 익명화
 */

const DEFAULT_SIZE = 15

const bad = (message: string) => HttpResponse.json({ message }, { status: 400 })
const forbidden = (message: string) => HttpResponse.json({ message }, { status: 403 })
const conflict = (message: string) => HttpResponse.json({ message }, { status: 409 })

const paging = (request: Request) => {
  const query = new URL(request.url).searchParams
  const page = Math.max(1, Number(query.get('page')) || 1)
  const size = Math.min(Math.max(1, Number(query.get('size')) || DEFAULT_SIZE), 50)
  return { page, size }
}

export const mypageHandlers = [
  /* ── 프로필 조회 ──────────────────────────────────────────────────────── */

  http.get('*/api/mypage/me', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response

    const override = await applyMockSwitches('auth')
    if (override && 'response' in override) return override.response

    return HttpResponse.json(toPublicUser(auth.user))
  }),

  /** 본인은 중복에서 제외한다 — 안 그러면 자기 아이디를 그대로 두고 저장할 수 없다. */
  http.get('*/api/mypage/check-username', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response

    const value = (new URL(request.url).searchParams.get('username') ?? '').trim()
    const check = validateUsername(value)
    if (!check.valid) return bad(check.error)

    const found = findByUsername(value)
    return HttpResponse.json({ available: !found || found.id === auth.user.id })
  }),

  http.get('*/api/mypage/check-email', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response

    const value = (new URL(request.url).searchParams.get('email') ?? '').trim()
    const check = validateEmail(value)
    if (!check.valid) return bad(check.error)

    const found = findByEmail(value)
    return HttpResponse.json({ available: !found || found.id === auth.user.id })
  }),

  /* ── 계정 정보 ────────────────────────────────────────────────────────── */

  http.put('*/api/mypage/account', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const user = auth.user

    const body = (await request.json()) as {
      username?: string
      email?: string
      phone?: string | null
      phoneCountry?: string
    }

    const username = (body.username ?? '').trim()
    const email = (body.email ?? '').trim()

    const usernameCheck = validateUsername(username)
    if (!usernameCheck.valid) return bad(usernameCheck.error)
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return bad(emailCheck.error)

    const phone = body.phone?.trim() ? body.phone.trim().replace(/\D/g, '') : null
    if (phone !== null) {
      const phoneCheck = validatePhone(phone)
      if (!phoneCheck.valid) return bad(phoneCheck.error)
    }

    const byUsername = findByUsername(username)
    if (byUsername && byUsername.id !== user.id) return conflict('이미 사용 중인 아이디입니다.')
    const byEmail = findByEmail(email)
    if (byEmail && byEmail.id !== user.id) return conflict('이미 사용 중인 이메일입니다.')

    // **§12-3 을 여기서도 막는다.** 구 구현은 가입만 고쳐도 이 경로가 열려 있어
    // API 를 직접 부르면 인증 없이 임의 주소로 바꿀 수 있었다.
    const emailChanged = email.toLowerCase() !== user.email.toLowerCase()
    if (emailChanged && !isEmailVerified(email)) {
      return bad('이메일 인증을 먼저 완료해 주세요.')
    }

    user.username = username
    user.email = email
    user.phone = phone
    user.phoneCountry = (body.phoneCountry ?? user.phoneCountry).trim() || '82'
    if (emailChanged) consumeVerifiedEmail(email)

    return HttpResponse.json(toPublicUser(user))
  }),

  /** 비밀번호 변경 — 구 구현에는 `disabled` 버튼만 있었다(부록 A). */
  http.put('*/api/mypage/password', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const user = auth.user

    const body = (await request.json()) as { current?: string; next?: string }
    const current = body.current ?? ''
    const next = body.next ?? ''

    // 현재 비밀번호를 확인한다. 세션만 믿고 바꿔 주면 자리를 비운 사이 탈취당한다
    if (current !== user.password) return bad('현재 비밀번호가 일치하지 않습니다.')
    if (next === current) return bad('현재 비밀번호와 다른 비밀번호를 입력해 주세요.')

    const check = validatePassword(next)
    if (!check.valid) return bad(check.error)

    changePassword(user, next)
    return HttpResponse.json({ message: '비밀번호가 변경되었습니다.' })
  }),

  /* ── 프로필 · 멤버 신청 ───────────────────────────────────────────────── */

  http.put('*/api/mypage/profile', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const user = auth.user

    // 승인된 뒤에는 사용자가 스스로 못 바꾼다. 로스터가 학번으로 엮여 있다(§7.1)
    if (!canEditProfile(user.membershipStatus)) {
      return forbidden('승인된 뒤에는 실명·학번·OB/YB 를 수정할 수 없습니다. 관리자에게 문의해 주세요.')
    }

    const body = (await request.json()) as {
      name?: string
      studentId?: string | null
      obYb?: ObYb | null
    }

    const name = (body.name ?? '').trim()
    if (!name) return bad('실명을 입력해 주세요.')
    if (body.obYb !== 'ob' && body.obYb !== 'yb') return bad('OB/YB 를 선택해 주세요.')

    const studentId = body.studentId?.trim() ?? ''
    if (studentId) {
      const check = validateStudentId(studentId)
      if (!check.valid) return bad(check.error)
    }

    user.name = name
    user.obYb = body.obYb
    user.studentId = studentId || null

    return HttpResponse.json(toPublicUser(user))
  }),

  http.post('*/api/mypage/membership-request', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const user = auth.user

    // 전제조건 4가지를 `lib/membership.ts` 한 곳에서 판정한다.
    // 화면도 같은 함수로 버튼 활성화를 정하므로 둘이 어긋날 수 없다(§12-13)
    const blocked = checkMembershipRequest(user.membershipStatus, user)
    if (blocked) return bad(MEMBERSHIP_BLOCK_MESSAGE[blocked])

    user.membershipStatus = 'pending'
    return HttpResponse.json(toPublicUser(user))
  }),

  /* ── 활동 (member+) ───────────────────────────────────────────────────── */

  http.get('*/api/mypage/roster-history', async ({ request }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    // **userId 로 잇는다.** 구 구현은 학번 문자열 매칭이라 학번을 고치면
    // 연동이 조용히 끊겼다(§12-17)
    return HttpResponse.json(listRosterByUser(auth.user.id))
  }),

  http.get('*/api/mypage/posts', async ({ request }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const override = await applyMockSwitches('posts')
    if (override && 'response' in override) return override.response

    const { page, size } = paging(request)
    return HttpResponse.json(listPostsByUser(auth.user.id, page, size))
  }),

  http.get('*/api/mypage/comments', async ({ request }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const { page, size } = paging(request)
    return HttpResponse.json(listCommentsByUser(auth.user.id, page, size))
  }),

  http.get('*/api/mypage/votes', async ({ request }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    // 익명 투표는 myChoices 가 null 이다 — 서버가 선택을 저장하지 않기 때문(§12-9)
    return HttpResponse.json(listVotesByUser(auth.user.id))
  }),

  /**
   * 내 활동 로그.
   *
   * **§8.4 의 열람 규칙은 "열람자 권한 > 대상 권한" 이라 등호가 없어 아무도
   * 자기 로그를 볼 수 없었다.** 본인은 언제나 볼 수 있어야 한다.
   */
  http.get('*/api/mypage/logs', async ({ request }) => {
    const auth = requireRole(request, 'member')
    if ('response' in auth) return auth.response

    const { page, size } = paging(request)
    return HttpResponse.json(listLogs({ userId: auth.user.id, page, size }))
  }),

  /* ── 탈퇴 ─────────────────────────────────────────────────────────────── */

  http.delete('*/api/mypage/withdraw', async ({ request }) => {
    const auth = requireAuth(request)
    if ('response' in auth) return auth.response
    const user: MockUser = auth.user

    if (!canWithdraw(user.authority)) {
      return forbidden('root 권한 계정은 탈퇴할 수 없습니다.')
    }

    // 순서가 중요하다. 계정을 지우기 전에 로그를 남겨야 username 스냅샷이 남는다
    log(user, 'user_withdraw', 'user', user.id, { username: user.username, name: user.name })

    // 글·댓글은 지우지 않고 연결만 끊는다(§12-12).
    // 구 구현은 글을 DELETE 해서 그 글에 달린 타인의 댓글·투표까지 함께 지웠다
    anonymizeAuthor(user.id)
    anonymizeLogsOf(user.id)
    // 로스터 기록은 남기고 연결만 끊는다 — 그 해에 뛰었다는 사실은 계정과 무관하다
    unlinkUser(user.id)
    removeUser(user.id)

    return HttpResponse.json({ message: '탈퇴가 완료되었습니다.' })
  }),
]
