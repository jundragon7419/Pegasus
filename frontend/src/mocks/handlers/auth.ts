import { HttpResponse, http } from 'msw'

import { requireAuth } from '@/mocks/authGuard'
import {
  consumeVerifiedEmail,
  createUser,
  findByEmail,
  findByUsername,
  isEmailVerified,
  issueEmailCode,
  issueToken,
  listUsers,
  toAuthUser,
  toPublicUser,
  verifyEmailCode,
} from '@/mocks/authState'
import { applyMockSwitches } from '@/mocks/switches'
import { validateEmail, validatePassword, validateUsername } from '@/lib/validators'

/** 블루프린트 §5.1. */

const bad = (message: string) => HttpResponse.json({ message }, { status: 400 })
const conflict = (message: string) => HttpResponse.json({ message }, { status: 409 })

export const authHandlers = [
  /**
   * 로그인.
   *
   * 실패 문구를 **아이디·비밀번호로 구분하지 않는다.** 구분하면 어떤 아이디가
   * 존재하는지 알려주는 셈이 된다(계정 열거). 차단 계정만 403 으로 구분한다.
   */
  http.post('*/api/auth/login', async ({ request }) => {
    const override = await applyMockSwitches('auth')
    if (override && 'response' in override) return override.response

    const body = (await request.json()) as { username?: string; password?: string }
    const user = findByUsername(body.username ?? '')

    if (!user || user.password !== body.password) {
      return HttpResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      )
    }

    if (user.isBanned) {
      return HttpResponse.json(
        { message: '차단된 계정입니다. 관리자에게 문의해 주세요.' },
        { status: 403 },
      )
    }

    return HttpResponse.json({ token: issueToken(user), user: toAuthUser(user) })
  }),

  /**
   * 회원가입.
   *
   * **§12-3 결함을 여기서 고친다.** 구 구현은 이메일 인증 성공 사실을 서버에
   * 남기지 않아 API 를 직접 호출하면 임의 이메일로 가입할 수 있었다.
   * 인증된 주소인지 서버가 검사한다.
   */
  http.post('*/api/auth/signup', async ({ request }) => {
    const override = await applyMockSwitches('auth')
    if (override && 'response' in override) return override.response

    const body = (await request.json()) as {
      username?: string
      password?: string
      email?: string
      marketingAgreed?: boolean
    }
    const username = body.username ?? ''
    const email = body.email ?? ''
    const password = body.password ?? ''

    for (const result of [
      validateUsername(username),
      validateEmail(email),
      validatePassword(password),
    ]) {
      if (!result.valid) return bad(result.error)
    }

    if (findByUsername(username)) return conflict('이미 사용 중인 아이디입니다.')
    if (findByEmail(email)) return conflict('이미 사용 중인 이메일입니다.')

    if (!isEmailVerified(email)) {
      return bad('이메일 인증을 먼저 완료해 주세요.')
    }

    const user = createUser({ username, email, marketingEmail: body.marketingAgreed === true })
    user.password = password
    consumeVerifiedEmail(email)

    return HttpResponse.json({ message: '회원가입이 완료되었습니다.' }, { status: 201 })
  }),

  /** 현재 로그인한 사용자. 토큰이 없거나 무효면 401. */
  http.get('*/api/auth/me', async ({ request }) => {
    const override = await applyMockSwitches('auth')
    if (override && 'response' in override) return override.response

    const result = requireAuth(request)
    if ('response' in result) return result.response
    return HttpResponse.json(toPublicUser(result.user))
  }),

  http.get('*/api/auth/check-username', async ({ request }) => {
    await applyMockSwitches('auth')
    const username = new URL(request.url).searchParams.get('username') ?? ''
    return HttpResponse.json({ available: !findByUsername(username) })
  }),

  http.get('*/api/auth/check-email', async ({ request }) => {
    await applyMockSwitches('auth')
    const email = new URL(request.url).searchParams.get('email') ?? ''
    return HttpResponse.json({ available: !findByEmail(email) })
  }),

  /** 인증번호 발송. 실제로는 메일을 보내지만 목은 콘솔에 찍는다. */
  http.post('*/api/auth/send-email-code', async ({ request }) => {
    const override = await applyMockSwitches('auth')
    if (override && 'response' in override) return override.response

    const body = (await request.json()) as { email?: string }
    const email = body.email ?? ''

    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return bad(emailCheck.error)
    if (findByEmail(email)) return conflict('이미 사용 중인 이메일입니다.')

    const code = issueEmailCode(email)
    // 목 서버에서는 메일을 보낼 수 없으므로 콘솔로 전달한다
    console.info(`[목] ${email} 인증번호: ${code} (5분 유효)`)

    return HttpResponse.json({ message: '인증번호를 발송했습니다. 개발자 콘솔을 확인해 주세요.' })
  }),

  http.post('*/api/auth/verify-email-code', async ({ request }) => {
    const override = await applyMockSwitches('auth')
    if (override && 'response' in override) return override.response

    const body = (await request.json()) as { email?: string; code?: string }
    if (!verifyEmailCode(body.email ?? '', body.code ?? '')) {
      return bad('인증번호가 올바르지 않거나 만료되었습니다.')
    }
    return HttpResponse.json({ message: '이메일 인증이 완료되었습니다.' })
  }),

  /**
   * 개발 전용: 역할 전환기에 보여줄 계정 목록.
   *
   * 전환기가 픽스처를 직접 import 하면 `Header` → `devAuth` → 픽스처로 이어져
   * **목 데이터가 프로덕션 번들에 딸려 들어간다**(실제로 목 비밀번호가 섞여 나왔다).
   * 서버에 물어보게 하면 앱 그래프에서 완전히 끊긴다.
   */
  http.get('*/api/__dev/users', () =>
    HttpResponse.json(
      listUsers().map((u) => ({
        username: u.username,
        authority: u.authority,
        staffType: u.staffType,
        membershipStatus: u.membershipStatus,
        isBanned: u.isBanned,
      })),
    ),
  ),

  /**
   * 개발 전용: 역할 전환기가 쓴다. 비밀번호 없이 해당 계정의 토큰을 발급한다.
   * 블루프린트에 없는 엔드포인트이며 목에만 존재한다.
   */
  http.post('*/api/__dev/impersonate', async ({ request }) => {
    const body = (await request.json()) as { username?: string }
    const user = findByUsername(body.username ?? '')
    if (!user) return HttpResponse.json({ message: '없는 계정입니다.' }, { status: 404 })
    return HttpResponse.json({ token: issueToken(user), user: toAuthUser(user) })
  }),
]
