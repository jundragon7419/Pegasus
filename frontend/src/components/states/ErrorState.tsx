import { ExclamationTriangleIcon } from '@radix-ui/react-icons'

import { Button } from '@/components/Button'
import { ApiError, NetworkError } from '@/lib/api'
import { withParticle } from '@/lib/korean'

import styles from './States.module.css'

type ErrorStateProps = {
  error: Error
  onRetry?: () => void
  /** 무엇을 못 불러왔는지. "선수단 명단" 처럼 구체적으로 */
  what?: string
}

/**
 * 데이터 조회 실패를 그 자리에 표시한다.
 * 화면을 500 으로 갈아치우지 않는 이유는 useApiResource 주석 참고.
 */
export function ErrorState({ error, onRetry, what }: ErrorStateProps) {
  const subject = what ?? '데이터'

  let description: string
  if (error instanceof NetworkError) {
    description = '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'
  } else if (error instanceof ApiError) {
    description = error.message
  } else {
    description = `${withParticle(subject, '을/를')} 불러오지 못했습니다.`
  }

  return (
    <div className={styles.panel} role="alert">
      <ExclamationTriangleIcon width={24} height={24} className={styles.errorIcon} />
      <p className={styles.title}>{withParticle(subject, '을/를')} 불러오지 못했습니다</p>
      <p className={styles.description}>{description}</p>
      {error instanceof ApiError && <p className={styles.detail}>HTTP {error.status}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}
