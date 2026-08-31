import { useLocation } from 'react-router'

import styles from './PagePlaceholder.module.css'

type PagePlaceholderProps = {
  title: string
  /** 이 화면을 구현하는 단계. docs/implementation-status.md 와 맞춘다. */
  phase: string
  note?: string
}

/**
 * 아직 구현되지 않은 화면의 자리표시자.
 * 라우팅이 제대로 걸렸는지 확인하는 용도이며, Phase 6 에서 하나씩 교체된다.
 */
export function PagePlaceholder({ title, phase, note }: PagePlaceholderProps) {
  const { pathname } = useLocation()

  return (
    <main className={styles.wrap}>
      <span className={styles.badge}>미구현 · Phase {phase}</span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.path}>{pathname}</p>
      {note && <p className={styles.note}>{note}</p>}
    </main>
  )
}
