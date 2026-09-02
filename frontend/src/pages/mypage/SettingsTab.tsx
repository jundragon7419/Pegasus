import { startTransition, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, api } from '@/lib/api'
import { canWithdraw } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import type { User } from '@/types/auth'

import styles from './MyPage.module.css'

/** §7.4 가 요구하는 확인 문구. 정확히 일치해야 탈퇴가 진행된다. */
const CONFIRM_PHRASE = '동의합니다'

/**
 * 설정 — 회원 탈퇴.
 *
 * **탈퇴 정책을 익명화로 바꿨다(§12-12).** 구 구현은 트랜잭션으로 그 사람의
 * 글을 통째로 DELETE 했는데, `posts.user_id ON DELETE SET NULL`(글 보존)이라는
 * 스키마 의도와 정면으로 충돌했고 **그 글에 달린 타인의 댓글과 투표까지
 * CASCADE 로 사라졌다.** 감사 로그도 함께 소멸했다.
 *
 * 이제 계정만 지우고 글·댓글·로그는 남는다. 작성자 표시는 작성 시점 스냅샷을
 * 그대로 쓴다.
 */
export function SettingsTab({ me }: { me: User }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const handleError = useApiErrorHandler()

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allowed = canWithdraw(me.authority)

  async function withdraw() {
    setBusy(true)
    setError(null)
    try {
      await api.delete('/api/mypage/withdraw')
      // **둘을 같은 transition 에 넣어야 한다.**
      // react-router 의 navigate 는 transition(낮은 우선순위)이고 setUser(null) 은
      // 긴급 업데이트다. 그냥 나란히 호출하면 긴급 업데이트가 앞질러서
      // **아직 /mypage 인 상태로 user 가 null 인 렌더**가 생기고,
      // ProtectedRoute 가 그걸 보고 /401 로 보낸다. 방금 스스로 탈퇴한 사람에게
      // "로그인이 필요합니다" 를 띄우는 것은 맞지 않는다.
      startTransition(() => {
        navigate(ROUTES.home, { replace: true })
        logout()
      })
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '탈퇴하지 못했습니다.')
      }
      setOpen(false)
      setBusy(false)
    }
  }

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>회원 탈퇴</h2>
        <p className={styles.sectionNote}>
          탈퇴하면 계정이 삭제되어 다시 로그인할 수 없습니다. 작성한 글과 댓글은 다른
          회원의 대화를 지우지 않기 위해 그대로 남으며, 작성자만 &ldquo;탈퇴한 회원&rdquo;으로
          바뀝니다.
        </p>

        {!allowed && (
          <p className={styles.hint}>
            root 권한 계정은 탈퇴할 수 없습니다. 계정 관리는 관리자에게 문의해 주세요.
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {allowed && (
          <div className={styles.actions}>
            <Button variant="negative" onClick={() => setOpen(true)}>
              회원 탈퇴
            </Button>
          </div>
        )}
      </section>

      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        title="정말 탈퇴하시겠습니까?"
        description={
          '계정이 삭제되며 되돌릴 수 없습니다.\n작성한 글과 댓글은 남고 작성자만 "탈퇴한 회원"으로 바뀝니다.'
        }
        requiredValue={CONFIRM_PHRASE}
        confirmLabel="탈퇴"
        loading={busy}
        onConfirm={withdraw}
      />
    </div>
  )
}
