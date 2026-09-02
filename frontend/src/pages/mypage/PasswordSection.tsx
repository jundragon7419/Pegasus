import { useState } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { ApiError, api } from '@/lib/api'
import { validatePassword, validatePasswordConfirm } from '@/lib/validators'

import styles from './MyPage.module.css'

/**
 * 비밀번호 변경.
 *
 * 구 구현에는 `disabled` 버튼과 "(예시)" 라벨만 있었다(부록 A · §12-23).
 * `validators.ts` 의 `validatePassword` 는 회원가입에서만 쓰이던 죽은 코드에
 * 가까웠는데, 여기서 두 번째 사용처를 갖는다.
 *
 * **현재 비밀번호를 반드시 확인한다.** 세션만 믿고 바꿔 주면 자리를 비운 사이
 * 계정을 통째로 빼앗긴다.
 */
export function PasswordSection() {
  const handleError = useApiErrorHandler()

  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setOpen(false)
    setCurrent('')
    setNext('')
    setConfirm('')
    setErrors({})
    setFormError(null)
  }

  async function submit() {
    setFormError(null)
    setDone(false)

    const nextCheck = validatePassword(next)
    const confirmCheck = validatePasswordConfirm(next, confirm)
    const found = {
      next: nextCheck.valid ? null : nextCheck.error,
      confirm: confirmCheck.valid ? null : confirmCheck.error,
    }
    setErrors(found)
    if (found.next || found.confirm) return

    setBusy(true)
    try {
      await api.put('/api/mypage/password', { current, next })
      reset()
      setDone(true)
    } catch (caught) {
      // 400(현재 비밀번호 불일치·규칙 위반)은 화면을 옮기지 않는다
      if (!handleError(caught)) {
        setFormError(caught instanceof ApiError ? caught.message : '변경하지 못했습니다.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>비밀번호 변경</h2>
      <p className={styles.sectionNote}>
        8자 이상이며 영문·숫자·특수문자를 각각 하나 이상 포함해야 합니다.
      </p>

      {done && <p className={styles.success}>비밀번호가 변경되었습니다.</p>}

      {open ? (
        <>
          <div className={styles.fields}>
            <TextField
              label="현재 비밀번호"
              type="password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              autoComplete="current-password"
              disabled={busy}
              required
            />
            <TextField
              label="새 비밀번호"
              type="password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              autoComplete="new-password"
              error={errors.next}
              disabled={busy}
              required
            />
            <TextField
              label="새 비밀번호 확인"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              error={errors.confirm}
              disabled={busy}
              required
            />
          </div>

          {formError && (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          )}

          <div className={styles.actions}>
            <Button variant="ghost" onClick={reset} disabled={busy}>
              취소
            </Button>
            <Button onClick={submit} disabled={busy || !current || !next || !confirm}>
              {busy ? '변경 중…' : '변경'}
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(true)
              setDone(false)
            }}
          >
            비밀번호 변경
          </Button>
        </div>
      )}
    </section>
  )
}
