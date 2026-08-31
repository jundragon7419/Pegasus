import { Link, useSearchParams } from 'react-router'

import { Button } from '@/components/Button'
import { RETURN_TO_PARAM, ROUTES } from '@/lib/routes'

import { ErrorPage } from './ErrorPage'

/**
 * 인증이 필요한 화면에 비로그인 상태로 접근했거나 토큰이 만료된 경우.
 * 원래 가려던 경로를 returnTo 로 받아 로그인 후 되돌려 보낸다.
 */
export default function Error401() {
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get(RETURN_TO_PARAM)

  const loginHref = returnTo
    ? `${ROUTES.login}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`
    : ROUTES.login

  return (
    <ErrorPage
      code={401}
      title="로그인이 필요합니다"
      description={
        returnTo
          ? '로그인이 필요한 페이지입니다. 로그인하면 원래 보시려던 곳으로 돌아갑니다.'
          : '로그인이 필요한 페이지입니다.'
      }
      actions={
        <>
          <Button asChild>
            <Link to={loginHref}>로그인</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to={ROUTES.home}>홈으로</Link>
          </Button>
        </>
      }
    />
  )
}
