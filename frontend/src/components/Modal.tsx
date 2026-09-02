import { Cross2Icon } from '@radix-ui/react-icons'
import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'

import styles from './Modal.module.css'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** 스크린 리더용 설명. 화면에 보일 필요가 없으면 생략한다 */
  description?: string
  children: ReactNode
}

/**
 * 일반 모달. 되돌릴 수 없는 동작에는 `ConfirmModal`(AlertDialog)을 쓴다.
 *
 * Radix `Dialog` 를 쓰는 이유는 `ConfirmModal` 과 같다 — 포커스 트랩, ESC,
 * 스크롤 락, 접근성 속성을 직접 만들지 않기 위해서다.
 */
export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={description ? undefined : ''}>
          <div className={styles.head}>
            <Dialog.Title className={styles.title}>{title}</Dialog.Title>
            <Dialog.Close className={styles.close} aria-label="닫기">
              <Cross2Icon />
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description className={styles.description}>{description}</Dialog.Description>
          )}

          <div className={styles.body}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
