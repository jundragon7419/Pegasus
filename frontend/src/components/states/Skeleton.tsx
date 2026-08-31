import type { CSSProperties } from 'react'

import { cx } from '@/lib/cx'

import styles from './States.module.css'

type SkeletonProps = {
  width?: string | number
  height?: string | number
  radius?: string
  className?: string
}

/**
 * 로딩 중 자리를 잡아두는 회색 블록.
 * 실제 콘텐츠와 같은 크기를 주어야 데이터가 도착할 때 레이아웃이 튀지 않는다.
 */
export function Skeleton({ width = '100%', height = '1rem', radius, className }: SkeletonProps) {
  const style: CSSProperties = { width, height }
  if (radius) style.borderRadius = radius

  return <div className={cx(styles.skeleton, className)} style={style} aria-hidden="true" />
}
