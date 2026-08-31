import { ArchiveIcon } from '@radix-ui/react-icons'
import type { ReactNode } from 'react'

import styles from './States.module.css'

type EmptyStateProps = {
  /** 무엇이 없는지 구체적으로 쓴다. "데이터가 없습니다" 는 아무것도 알려주지 않는다 */
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.panel}>
      <ArchiveIcon width={24} height={24} className={styles.icon} />
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  )
}
