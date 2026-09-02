import { useState } from 'react'
import { AlertDialog } from 'radix-ui'

import { Button, type ButtonVariant } from '@/components/Button'
import { TextField } from '@/components/TextField'

import styles from './ConfirmModal.module.css'

type ConfirmModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** 줄바꿈(`\n`)이 그대로 보인다 */
  description: string
  /**
   * 값이 있으면 **정확히 일치하게 입력해야** 확인 버튼이 활성화된다(§10.4).
   * 회원 탈퇴처럼 되돌릴 수 없는 동작에 쓴다.
   */
  requiredValue?: string
  confirmLabel?: string
  confirmVariant?: ButtonVariant
  loading?: boolean
  onConfirm: () => void
}

/**
 * 되돌릴 수 없는 동작 앞에 세우는 확인 모달.
 *
 * Radix `AlertDialog` 를 쓴다 — 포커스 트랩, ESC, 스크롤 락, `role="alertdialog"`,
 * 열릴 때 취소 버튼으로 포커스 이동을 직접 만들지 않기 위해서다.
 */
export function ConfirmModal({ open, onOpenChange, ...rest }: ConfirmModalProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.overlay} />
        <AlertDialog.Content className={styles.content}>
          {/* Radix 는 닫히면 Content 를 언마운트한다. 입력 상태를 이 안에 두면
              열 때마다 새로 마운트되어 저절로 비워진다 — 효과로 지울 필요가 없다. */}
          <ConfirmBody {...rest} />
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

type ConfirmBodyProps = Omit<ConfirmModalProps, 'open' | 'onOpenChange'>

function ConfirmBody({
  title,
  description,
  requiredValue,
  confirmLabel = '확인',
  confirmVariant = 'negative',
  loading = false,
  onConfirm,
}: ConfirmBodyProps) {
  const [typed, setTyped] = useState('')
  const confirmable = !loading && (!requiredValue || typed === requiredValue)

  return (
    <>
      <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
      <AlertDialog.Description className={styles.description}>{description}</AlertDialog.Description>

      {requiredValue && (
        <div className={styles.confirmField}>
          <TextField
            label={`계속하려면 "${requiredValue}" 를 입력해 주세요`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={loading}
            autoComplete="off"
          />
        </div>
      )}

      <div className={styles.actions}>
        <AlertDialog.Cancel asChild>
          <Button variant="ghost" disabled={loading}>
            취소
          </Button>
        </AlertDialog.Cancel>
        {/* AlertDialog.Action 은 누르면 무조건 닫힌다. 삭제가 실패했을 때는
            모달이 남아 메시지를 보여줘야 하므로 일반 버튼을 쓴다. */}
        <Button variant={confirmVariant} disabled={!confirmable} onClick={onConfirm}>
          {loading ? '처리 중…' : confirmLabel}
        </Button>
      </div>
    </>
  )
}
