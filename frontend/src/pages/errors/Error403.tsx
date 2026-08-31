import { Link } from 'react-router'

import { Button } from '@/components/Button'
import { ROUTES } from '@/lib/routes'

import { ErrorPage } from './ErrorPage'

/**
 * 로그인은 되어 있으나 권한이 부족한 경우.
 *
 * TODO(Phase 3): 인증 상태가 붙으면 현재 권한(basic/member/manager/staff/root)을
 * 함께 표시한다. 무엇이 부족한지 알려주는 편이 문의를 줄인다.
 */
export default function Error403() {
  return (
    <ErrorPage
      code={403}
      title="접근 권한이 없습니다"
      description="이 페이지를 볼 수 있는 권한이 계정에 없습니다. 동아리 회원 승인이 필요한 페이지일 수 있습니다."
      actions={
        <>
          <Button asChild>
            <Link to={ROUTES.home}>홈으로</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to={ROUTES.mypage}>내 권한 확인</Link>
          </Button>
        </>
      }
    />
  )
}
