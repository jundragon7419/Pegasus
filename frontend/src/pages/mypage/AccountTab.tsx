import { useState } from 'react'

import { Button } from '@/components/Button'
import { PhoneField } from '@/components/PhoneField'
import { TextField } from '@/components/TextField'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useApiResource } from '@/hooks/useApiResource'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, api } from '@/lib/api'
import { cx } from '@/lib/cx'
import { MEMBERSHIP_STATUS_LABEL, OB_YB_LABEL, ROSTER_ROLE_LABEL, roleLabelOf } from '@/lib/labels'
import { canEditProfile } from '@/lib/membership'
import { validateEmail, validatePhone, validateUsername } from '@/lib/validators'
import type { User } from '@/types/auth'
import type { RosterEntry } from '@/types/roster'

import { MembershipSection } from './MembershipSection'
import { PasswordSection } from './PasswordSection'
import styles from './MyPage.module.css'

type CheckState = 'idle' | 'checking' | 'ok' | 'taken'

const messageOf = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback

/**
 * 계정 정보 탭.
 *
 * 구 구현은 이 탭 아래에 "비밀번호 변경 (예시)" · "회원 탈퇴 (예시)" 섹션을
 * 달아 두었는데, 탈퇴는 설정 탭에 이미 있어 중복이자 혼동 요인이었다(§12-23).
 * 이식하지 않는다. 비밀번호 변경은 **예시가 아니라 실제로** 만든다.
 */
export function AccountTab({
  me,
  onSaved,
  active,
}: {
  me: User
  onSaved: () => void
  active: boolean
}) {
  const { refresh } = useAuth()
  const handleError = useApiErrorHandler()

  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState(me.username)
  const [email, setEmail] = useState(me.email)
  const [phone, setPhone] = useState(me.phone ?? '')
  const [phoneCountry, setPhoneCountry] = useState(me.phoneCountry)

  const [usernameState, setUsernameState] = useState<CheckState>('idle')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)

  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // 로스터 이력은 member+ 만 의미가 있다. 탭이 열릴 때 한 번만 부른다
  const history = useApiResource<RosterEntry[]>(active ? '/api/mypage/roster-history' : null)

  const usernameChanged = username.trim() !== me.username
  const emailChanged = email.trim().toLowerCase() !== me.email.toLowerCase()

  const startEdit = () => {
    setEditing(true)
    setSaved(false)
    setFormError(null)
    setErrors({})
    setUsernameState('idle')
    setCodeSent(false)
    setCode('')
    setEmailVerified(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setUsername(me.username)
    setEmail(me.email)
    setPhone(me.phone ?? '')
    setPhoneCountry(me.phoneCountry)
    setFormError(null)
    setErrors({})
  }

  async function checkUsername() {
    const check = validateUsername(username)
    if (!check.valid) {
      setErrors((e) => ({ ...e, username: check.error }))
      return
    }
    setErrors((e) => ({ ...e, username: null }))
    setUsernameState('checking')
    try {
      const { available } = await api.get<{ available: boolean }>(
        `/api/mypage/check-username?username=${encodeURIComponent(username)}`,
      )
      setUsernameState(available ? 'ok' : 'taken')
    } catch (error) {
      if (!handleError(error)) setErrors((e) => ({ ...e, username: messageOf(error, '확인하지 못했습니다.') }))
      setUsernameState('idle')
    }
  }

  async function sendCode() {
    const check = validateEmail(email)
    if (!check.valid) {
      setErrors((e) => ({ ...e, email: check.error }))
      return
    }
    setErrors((e) => ({ ...e, email: null }))
    try {
      await api.post('/api/auth/send-email-code', { email })
      setCodeSent(true)
    } catch (error) {
      if (!handleError(error)) setErrors((e) => ({ ...e, email: messageOf(error, '발송하지 못했습니다.') }))
    }
  }

  async function verifyCode() {
    try {
      await api.post('/api/auth/verify-email-code', { email, code })
      setEmailVerified(true)
      setErrors((e) => ({ ...e, code: null }))
    } catch (error) {
      if (!handleError(error)) setErrors((e) => ({ ...e, code: messageOf(error, '인증에 실패했습니다.') }))
    }
  }

  async function save() {
    setFormError(null)

    if (usernameChanged && usernameState !== 'ok') {
      setFormError('아이디 중복확인을 완료해 주세요.')
      return
    }
    // 화면에서 막더라도 서버가 다시 검사한다(§12-3). 여기서 막는 건 편의일 뿐이다
    if (emailChanged && !emailVerified) {
      setFormError('이메일 인증을 완료해 주세요.')
      return
    }
    if (phone) {
      const check = validatePhone(phone)
      if (!check.valid) {
        setErrors((e) => ({ ...e, phone: check.error }))
        return
      }
    }

    setSaving(true)
    try {
      await api.put('/api/mypage/account', {
        username: username.trim(),
        email: email.trim(),
        phone: phone || null,
        phoneCountry,
      })
      setEditing(false)
      setSaved(true)
      onSaved()
      // 헤더의 아이디·권한 배지도 최신으로 맞춘다
      await refresh()
    } catch (error) {
      // 409(중복) · 400(인증 미완료)은 화면을 옮기지 않는다
      if (!handleError(error)) setFormError(messageOf(error, '저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.panel}>
      {/* ── 계정 정보 ─────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>계정 정보</h2>

        <div className={styles.fields}>
          <TextField
            label="아이디"
            value={editing ? username : me.username}
            onChange={(event) => {
              setUsername(event.target.value)
              setUsernameState('idle')
            }}
            disabled={!editing}
            error={errors.username}
            success={usernameState === 'ok' ? '사용할 수 있는 아이디입니다.' : null}
            hint={
              usernameState === 'taken'
                ? undefined
                : editing
                  ? '5~15자의 영문·숫자·밑줄'
                  : undefined
            }
            trailing={
              editing && usernameChanged ? (
                <Button size="sm" variant="secondary" onClick={checkUsername}>
                  {usernameState === 'checking' ? '확인 중…' : '중복확인'}
                </Button>
              ) : undefined
            }
          />
          {usernameState === 'taken' && (
            <p className={styles.error} role="alert">
              이미 사용 중인 아이디입니다.
            </p>
          )}

          <TextField
            label="이메일"
            type="email"
            value={editing ? email : me.email}
            onChange={(event) => {
              setEmail(event.target.value)
              setCodeSent(false)
              setEmailVerified(false)
            }}
            disabled={!editing}
            error={errors.email}
            success={emailVerified ? '인증이 완료되었습니다.' : null}
            trailing={
              editing && emailChanged && !emailVerified ? (
                <Button size="sm" variant="secondary" onClick={sendCode}>
                  {codeSent ? '재발송' : '발송'}
                </Button>
              ) : undefined
            }
          />

          {editing && emailChanged && codeSent && !emailVerified && (
            <TextField
              label="인증 코드"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              maxLength={6}
              error={errors.code}
              hint="메일로 받은 6자리 숫자"
              trailing={
                <Button size="sm" variant="secondary" onClick={verifyCode}>
                  인증
                </Button>
              }
            />
          )}

          <div>
            <span className={styles.label}>전화번호</span>
            <PhoneField
              value={editing ? phone : (me.phone ?? '')}
              country={editing ? phoneCountry : me.phoneCountry}
              onChange={(value, country) => {
                setPhone(value)
                setPhoneCountry(country)
                setErrors((e) => ({ ...e, phone: null }))
              }}
              disabled={!editing}
              error={errors.phone}
            />
          </div>
        </div>

        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}
        {saved && <p className={styles.success}>저장되었습니다.</p>}

        <div className={styles.actions}>
          {editing ? (
            <>
              <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                취소
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={startEdit}>
              수정
            </Button>
          )}
        </div>
      </section>

      {/* ── 읽기 전용 정보 ─────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>회원 정보</h2>
        <p className={styles.sectionNote}>
          {canEditProfile(me.membershipStatus)
            ? '멤버 신청 전에는 아래 정보를 직접 수정할 수 있습니다.'
            : '승인된 뒤에는 실명·학번·OB/YB 를 수정할 수 없습니다. 로스터가 학번으로 연결되어 있기 때문입니다. 정정이 필요하면 관리자에게 문의해 주세요.'}
        </p>

        <div className={styles.readonlyGrid}>
          <div>
            <div className={styles.readonlyLabel}>권한</div>
            <div className={styles.readonlyValue}>{roleLabelOf(me.authority, me.staffType)}</div>
          </div>
          <div>
            <div className={styles.readonlyLabel}>멤버 상태</div>
            <div className={styles.readonlyValue}>
              <span
                className={cx(
                  styles.badge,
                  me.membershipStatus === 'approved' && styles.badgeApproved,
                  me.membershipStatus === 'pending' && styles.badgePending,
                  me.membershipStatus === 'rejected' && styles.badgeRejected,
                )}
              >
                {MEMBERSHIP_STATUS_LABEL[me.membershipStatus]}
              </span>
            </div>
          </div>
          <div>
            <div className={styles.readonlyLabel}>실명</div>
            <div className={styles.readonlyValue}>{me.name ?? '—'}</div>
          </div>
          <div>
            <div className={styles.readonlyLabel}>학번</div>
            <div className={styles.readonlyValue}>{me.studentId ?? '—'}</div>
          </div>
          <div>
            <div className={styles.readonlyLabel}>OB/YB</div>
            <div className={styles.readonlyValue}>{me.obYb ? OB_YB_LABEL[me.obYb] : '—'}</div>
          </div>
          <div>
            <div className={styles.readonlyLabel}>가입일</div>
            <div className={styles.readonlyValue}>{me.createdAt}</div>
          </div>
        </div>

        {/* 로스터 이력 — userId 로 잇는다(§12-17) */}
        {history.data && history.data.length > 0 && (
          <>
            <p className={styles.label} style={{ marginTop: 'var(--space-4)' }}>
              로스터 이력
            </p>
            <ul className={styles.history}>
              {history.data.map((entry) => (
                <li key={`${entry.year}-${entry.id}`} className={styles.historyItem}>
                  <span className={styles.historyYear}>{entry.year}</span>
                  <span className={styles.historyNumber}>{entry.number}</span>
                  <span>{ROSTER_ROLE_LABEL[entry.role]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <MembershipSection me={me} onChanged={onSaved} />
      <PasswordSection />
    </div>
  )
}
