import type { ReactNode } from 'react'
import { Popover as RadixPopover } from 'radix-ui'

import styles from './Popover.module.css'

type PopoverProps = {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'center' | 'end'
  /** 스크린리더에 이 팝오버가 무엇인지 알린다 */
  label: string
}

/**
 * Radix Popover 에 우리 스타일만 입힌 얇은 래퍼.
 *
 * 외부 클릭 닫기, ESC, 포커스 관리, 화면 경계 회피를 Radix 가 처리한다.
 * 구 구현은 `document` 에 클릭 리스너를 직접 달아 이걸 흉내 냈다.
 */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  label,
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          className={styles.content}
          sideOffset={6}
          align={align}
          collisionPadding={12}
          aria-label={label}
        >
          {children}
          <RadixPopover.Arrow className={styles.arrow} />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
