import type { ComponentPropsWithoutRef } from 'react'
import { Tabs as RadixTabs } from 'radix-ui'

import { cx } from '@/lib/cx'

import styles from './Tabs.module.css'

/**
 * Radix Tabs 에 우리 스타일만 입힌 얇은 래퍼.
 *
 * 직접 버튼으로 만들면 화살표 키 이동, `role="tab"`/`aria-selected`,
 * 포커스 관리가 전부 수작업이 된다. Radix 가 그것만 대신해 주고
 * 생김새는 100% 우리 CSS 다.
 */

export const TabsRoot = RadixTabs.Root

export function TabsList({ className, ...props }: ComponentPropsWithoutRef<typeof RadixTabs.List>) {
  return <RadixTabs.List className={cx(styles.list, className)} {...props} />
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Trigger>) {
  return <RadixTabs.Trigger className={cx(styles.trigger, className)} {...props} />
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cx(styles.content, className)} {...props} />
}
