import { Link } from 'react-router'

import { Button } from '@/components/Button'
import { ROUTES } from '@/lib/routes'

import { ErrorPage } from './ErrorPage'

/** 없는 경로이거나, 요청한 리소스(게시글·유저·로그)가 존재하지 않는 경우. */
export default function Error404() {
  return (
    <ErrorPage
      code={404}
      title="페이지를 찾을 수 없습니다"
      description="주소가 바뀌었거나 삭제된 페이지입니다. 주소를 다시 확인해 주세요."
      actions={
        <Button asChild>
          <Link to={ROUTES.home}>홈으로</Link>
        </Button>
      }
    />
  )
}
