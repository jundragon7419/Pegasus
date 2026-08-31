import type { ComponentPropsWithoutRef } from 'react'
import { Slot } from 'radix-ui'

import { cx } from '@/lib/cx'

import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'positive' | 'negative'
export type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /**
   * 자식 요소를 그대로 렌더하면서 버튼 스타일만 입힌다.
   * 링크를 버튼처럼 보이게 할 때 쓴다: <Button asChild><Link to="/">홈</Link></Button>
   * 이렇게 해야 <a> 안에 <button> 이 들어가는 잘못된 마크업을 피할 수 있다.
   */
  asChild?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  asChild = false,
  className,
  type,
  ...props
}: ButtonProps) {
  const classes = cx(styles.btn, styles[variant], size !== 'md' && styles[size], className)

  if (asChild) {
    return <Slot.Root className={classes} {...props} />
  }

  // 폼 안에서 의도치 않게 submit 되는 것을 막는다.
  return <button type={type ?? 'button'} className={classes} {...props} />
}
