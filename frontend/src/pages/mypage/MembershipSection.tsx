import { useState } from 'react'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, api } from '@/lib/api'
import { MEMBERSHIP_BLOCK_MESSAGE, canEditProfile, checkMembershipRequest } from '@/lib/membership'
import { validateStudentId } from '@/lib/validators'
import type { ObYb, User } from '@/types/auth'

import styles from './MyPage.module.css'

/**
 * 멤버 신청. 블루프린트 §7.1.
 *
 * **판정을 `lib/membership.ts` 한 곳에서 한다.** 버튼 활성화 조건과 서버 검사가
 * 같은 함수를 쓰므로 어긋날 수 없다 — 구 구현은 UI 가 학번을 "선택"으로 표기하고
 * 서버는 없으면 400 을 반환해 서로 달랐다(§12-13).
 */
export function MembershipSection({ me, onChanged }: { me: User; onChanged: () => void }) {
  const { refresh } = useAuth()
  const handleError = useApiErrorHandler()

  const [name, setName] = useState(me.name ?? '')
  const [studentId, setStudentId] = useState(me.studentId ?? '')
  const [obYb, setObYb] = useState<ObYb | ''>(me.obYb ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 이미 멤버이거나 신청 중이면 신청 폼을 보여줄 이유가 없다
  const editable = canEditProfile(me.membershipStatus)

  // **저장된 프로필로 판정한다.** 입력창의 값으로 판정하면 저장 전에 버튼이
  // 활성화되어 서버에서 400 을 맞는다 — 화면과 서버가 다른 것을 보는 셈이다
  const blocked = checkMembershipRequest(me.membershipStatus, me)

  async function saveProfile() {
    setError(null)
    if (studentId) {
      const check = validateStudentId(studentId)
      if (!check.valid) {
        setError(check.error)
        return
      }
    }
    setBusy(true)
    try {
      await api.put('/api/mypage/profile', { name, studentId: studentId || null, obYb: obYb || null })
      onChanged()
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '저장하지 못했습니다.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function request() {
    setError(null)
    setBusy(true)
    try {
      await api.post('/api/mypage/membership-request')
      onChanged()
      await refresh()
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '신청하지 못했습니다.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (me.membershipStatus === 'approved') return null

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>멤버 신청</h2>
      <p className={styles.sectionNote}>
        {me.membershipStatus === 'pending'
          ? '신청이 접수되었습니다. 매니저가 확인하면 게시판과 활동 기능을 쓸 수 있습니다.'
          : me.membershipStatus === 'rejected'
            ? '신청이 거부되었습니다. 프로필을 확인한 뒤 다시 신청할 수 있습니다.'
            : '실명·학번·OB/YB 를 입력하면 멤버로 신청할 수 있습니다.'}
      </p>

      {editable && (
        <div className={styles.fields}>
          <TextField
            label="실명"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={busy}
          />
          <TextField
            label="학번"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            /* 구 UI 는 "선택"이라 적었지만 서버는 필수로 요구했다(§12-13) */
            required
            hint="숫자 10자리"
            disabled={busy}
          />
          <div>
            <label className={styles.label} htmlFor="mypage-obyb">
              OB/YB
            </label>
            <select
              id="mypage-obyb"
              className={styles.select}
              value={obYb}
              onChange={(event) => setObYb(event.target.value as ObYb | '')}
              disabled={busy}
            >
              <option value="">선택해 주세요</option>
              <option value="yb">재학생</option>
              <option value="ob">졸업생</option>
            </select>
          </div>
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {/* 막힌 이유를 버튼 위에 그대로 보여준다. 눌리지 않는 버튼만 두면 왜 안 되는지 알 수 없다 */}
      {editable && blocked && blocked !== 'already-pending' && blocked !== 'already-member' && (
        <p className={styles.hint}>{MEMBERSHIP_BLOCK_MESSAGE[blocked]}</p>
      )}

      {editable && (
        <div className={styles.actions}>
          <Button variant="secondary" onClick={saveProfile} disabled={busy}>
            프로필 저장
          </Button>
          <Button onClick={request} disabled={busy || blocked !== null}>
            멤버 신청
          </Button>
        </div>
      )}
    </section>
  )
}
