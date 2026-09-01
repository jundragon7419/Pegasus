import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { TextField } from '@/components/TextField'
import { ApiError, NetworkError, api } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import {
  validateEmail,
  validateEmailCode,
  validatePassword,
  validatePasswordConfirm,
  validateUsername,
} from '@/lib/validators'

import styles from './Auth.module.css'

type CheckState = 'idle' | 'checking' | 'available' | 'taken'

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return fallback
}

export default function Signup() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [usernameState, setUsernameState] = useState<CheckState>('idle')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [marketingAgreed, setMarketingAgreed] = useState(false)

  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const setError = (field: string, message: string | null) =>
    setErrors((prev) => ({ ...prev, [field]: message }))

  /* ── 아이디 중복 확인 ─────────────────────────────────────────────────── */

  async function checkUsername() {
    const result = validateUsername(username)
    if (!result.valid) {
      setError('username', result.error)
      setUsernameState('idle')
      return
    }
    setError('username', null)
    setUsernameState('checking')
    try {
      const { available } = await api.get<{ available: boolean }>(
        `/api/auth/check-username?username=${encodeURIComponent(username)}`,
        { skipAuth: true },
      )
      setUsernameState(available ? 'available' : 'taken')
      if (!available) setError('username', '이미 사용 중인 아이디입니다.')
    } catch (error) {
      setUsernameState('idle')
      setError('username', messageOf(error, '확인하지 못했습니다.'))
    }
  }

  /* ── 이메일 인증 ──────────────────────────────────────────────────────── */

  async function sendCode() {
    const result = validateEmail(email)
    if (!result.valid) {
      setError('email', result.error)
      return
    }
    setError('email', null)
    try {
      await api.post('/api/auth/send-email-code', { email }, { skipAuth: true })
      setCodeSent(true)
    } catch (error) {
      // 중복 이메일(409)도 여기로 온다. 필드 인라인으로 표시한다
      setError('email', messageOf(error, '인증번호를 보내지 못했습니다.'))
    }
  }

  async function verifyCode() {
    const result = validateEmailCode(code)
    if (!result.valid) {
      setError('code', result.error)
      return
    }
    setError('code', null)
    try {
      await api.post('/api/auth/verify-email-code', { email, code }, { skipAuth: true })
      setEmailVerified(true)
    } catch (error) {
      setError('code', messageOf(error, '인증하지 못했습니다.'))
    }
  }

  /* ── 제출 ─────────────────────────────────────────────────────────────── */

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const checks: Array<[string, ReturnType<typeof validateUsername>]> = [
      ['username', validateUsername(username)],
      ['password', validatePassword(password)],
      ['passwordConfirm', validatePasswordConfirm(password, passwordConfirm)],
      ['email', validateEmail(email)],
    ]
    const next: Record<string, string | null> = {}
    let hasError = false
    for (const [field, result] of checks) {
      next[field] = result.valid ? null : result.error
      if (!result.valid) hasError = true
    }
    setErrors(next)
    if (hasError) return

    setFormError(null)
    setSubmitting(true)
    try {
      await api.post(
        '/api/auth/signup',
        { username, password, email, marketingAgreed },
        { skipAuth: true },
      )
      navigate(ROUTES.login, { replace: true })
    } catch (error) {
      // 409(중복)는 해당 필드로 보낸다. 그 외는 폼 하단에 둔다
      if (error instanceof ApiError && error.status === 409) {
        setError(error.message.includes('아이디') ? 'username' : 'email', error.message)
      } else {
        setFormError(messageOf(error, '가입하지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      }
      setSubmitting(false)
    }
  }

  const canSubmit =
    !submitting && usernameState === 'available' && emailVerified && Boolean(password && passwordConfirm)

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>회원가입</h1>
      <p className={styles.subtitle}>가입 후 동아리 회원 신청을 하면 게시판을 이용할 수 있습니다.</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="아이디"
          name="username"
          required
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setUsernameState('idle')
          }}
          autoComplete="username"
          hint="영문·숫자·밑줄 5~15자"
          error={errors.username}
          success={usernameState === 'available' ? '사용할 수 있는 아이디입니다.' : null}
          disabled={submitting}
          trailing={
            <Button variant="secondary" onClick={checkUsername} disabled={submitting || !username}>
              {usernameState === 'checking' ? '확인 중' : '중복확인'}
            </Button>
          }
        />

        <TextField
          label="비밀번호"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          hint="8자 이상, 영문·숫자·특수문자 포함"
          error={errors.password}
          disabled={submitting}
        />

        <TextField
          label="비밀번호 확인"
          name="passwordConfirm"
          type="password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          autoComplete="new-password"
          error={errors.passwordConfirm}
          disabled={submitting}
        />

        <TextField
          label="이메일"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setCodeSent(false)
            setEmailVerified(false)
          }}
          autoComplete="email"
          error={errors.email}
          success={emailVerified ? '이메일 인증이 완료되었습니다.' : null}
          disabled={submitting || emailVerified}
          trailing={
            <Button
              variant="secondary"
              onClick={sendCode}
              disabled={submitting || emailVerified || !email}
            >
              {codeSent ? '재발송' : '발송'}
            </Button>
          }
        />

        {codeSent && !emailVerified && (
          <TextField
            label="인증번호"
            name="emailCode"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            hint="메일로 받은 6자리 숫자를 입력해 주세요."
            error={errors.code}
            disabled={submitting}
            trailing={
              <Button variant="secondary" onClick={verifyCode} disabled={submitting || !code}>
                인증
              </Button>
            }
          />
        )}

        <Checkbox checked={marketingAgreed} onCheckedChange={setMarketingAgreed}>
          동아리 소식 메일 수신에 동의합니다 (선택)
        </Checkbox>

        {formError && (
          <p className={styles.formError} role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            {formError}
          </p>
        )}

        <div className={styles.actions}>
          <Button type="submit" size="lg" className={styles.submit} disabled={!canSubmit}>
            {submitting ? '가입 중…' : '가입하기'}
          </Button>
          {!emailVerified && (
            <p className={styles.subtitle} style={{ marginTop: 0, textAlign: 'center' }}>
              이메일 인증을 완료해야 가입할 수 있습니다.
            </p>
          )}
        </div>
      </form>

      <p className={styles.footer}>
        이미 계정이 있으신가요? <Link to={ROUTES.login}>로그인</Link>
      </p>
    </main>
  )
}
