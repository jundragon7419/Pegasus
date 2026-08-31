import { Link } from 'react-router'

import { Button } from '@/components/Button'
import { ROUTES } from '@/lib/routes'

import { ErrorPage } from './ErrorPage'

type Error500Props = {
  /** ErrorBoundary 가 잡은 예외. 라우트로 직접 들어온 경우에는 없다. */
  error?: Error
  /** 다시 렌더를 시도한다. ErrorBoundary 가 넘겨준다. */
  onRetry?: () => void
}

/** 서버 오류 또는 렌더 중 발생한 예외. */
export default function Error500({ error, onRetry }: Error500Props) {
  return (
    <ErrorPage
      code={500}
      title="문제가 발생했습니다"
      description="일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요."
      // 개발 중에만 예외 내용을 노출한다. 운영에서는 내부 구조가 드러나면 안 된다.
      detail={import.meta.env.DEV && error ? `${error.name}: ${error.message}` : undefined}
      actions={
        <>
          {onRetry && <Button onClick={onRetry}>다시 시도</Button>}
          <Button variant="ghost" asChild>
            <Link to={ROUTES.home}>홈으로</Link>
          </Button>
        </>
      }
    />
  )
}
