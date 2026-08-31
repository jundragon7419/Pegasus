import type { ReactNode } from 'react'

import styles from './ErrorPage.module.css'

type ErrorPageProps = {
  /** 401 · 403 · 404 · 500 */
  code: number
  title: string
  description: ReactNode
  /** 서버 메시지나 예외 내용처럼 참고용으로만 보여줄 것 */
  detail?: string
  actions: ReactNode
}

export function ErrorPage({ code, title, description, detail, actions }: ErrorPageProps) {
  return (
    <main className={styles.wrap}>
      <p className={styles.code}>{code}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {detail && <pre className={styles.detail}>{detail}</pre>}
      <div className={styles.actions}>{actions}</div>
    </main>
  )
}
