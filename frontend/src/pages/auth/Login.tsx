import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, NetworkError } from '@/lib/api'
import { RETURN_TO_PARAM, ROUTES } from '@/lib/routes'

import styles from './Auth.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setFormError(null)
    setSubmitting(true)
    try {
      await login(username, password, remember)
      const returnTo = searchParams.get(RETURN_TO_PARAM)
      navigate(returnTo ?? ROUTES.home, { replace: true })
    } catch (error) {
      // 로그인 실패는 **화면을 옮기지 않는다**. 페이지를 갈아치우면 입력을 잃는다.
      // docs/error-screens.md 3절 참고.
      if (error instanceof ApiError) setFormError(error.message)
      else if (error instanceof NetworkError) setFormError(error.message)
      else setFormError('로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>로그인</h1>
      <p className={styles.subtitle}>동아리 계정으로 로그인해 주세요.</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="아이디"
          name="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          disabled={submitting}
        />

        <TextField
          label="비밀번호"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={submitting}
        />

        <Checkbox checked={remember} onCheckedChange={setRemember}>
          자동 로그인
        </Checkbox>

        {formError && (
          <p className={styles.formError} role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />
            {formError}
          </p>
        )}

        <div className={styles.actions}>
          <Button
            type="submit"
            size="lg"
            className={styles.submit}
            disabled={submitting || !username || !password}
          >
            {submitting ? '로그인 중…' : '로그인'}
          </Button>
        </div>
      </form>

      <p className={styles.footer}>
        아직 계정이 없으신가요? <Link to={ROUTES.signup}>회원가입</Link>
      </p>

      {import.meta.env.DEV && (
        <p className={styles.devNote}>
          목 계정: <code>newbie</code> · <code>applicant</code> · <code>player01</code> ·{' '}
          <code>manager01</code> · <code>president</code> · <code>rootadmin</code> ·{' '}
          <code>bannedone</code> — 비밀번호는 모두 <code>Pegasus!2026</code> 입니다. 헤더의 개발
          메뉴에서 바로 전환할 수도 있습니다.
        </p>
      )}
    </main>
  )
}
