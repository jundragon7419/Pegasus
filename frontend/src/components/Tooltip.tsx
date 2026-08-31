import { InfoCircledIcon } from '@radix-ui/react-icons'
import type { ReactNode } from 'react'
import { Tooltip as RadixTooltip } from 'radix-ui'

import styles from './Tooltip.module.css'

type InfoTooltipProps = {
  /** 툴팁 내용 */
  children: ReactNode
  /** 스크린리더가 읽을 설명. 아이콘만으로는 무엇인지 알 수 없다 */
  label: string
}

/**
 * 물음표 아이콘에 붙는 설명 툴팁.
 *
 * 툴팁은 마우스 사용자 전용이 되기 쉽다. Radix 가 키보드 포커스와 ESC 를
 * 처리해 주고, 트리거에 aria-label 을 달아 스크린리더에도 내용을 전한다.
 */
export function InfoTooltip({ children, label }: InfoTooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <button type="button" className={styles.trigger} aria-label={label}>
            <InfoCircledIcon />
          </button>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content className={styles.content} sideOffset={6} collisionPadding={12}>
            {children}
            <RadixTooltip.Arrow className={styles.arrow} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
