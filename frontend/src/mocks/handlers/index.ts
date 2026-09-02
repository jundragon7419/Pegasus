import { adminHandlers } from './admin'
import { authHandlers } from './auth'
import { commentHandlers } from './comments'
import { mypageHandlers } from './mypage'
import { pollHandlers } from './polls'
import { postHandlers } from './posts'
import { recordHandlers } from './records'
import { rosterHandlers } from './roster'
import { scheduleHandlers } from './schedule'
import { userHandlers } from './users'

/**
 * 조회는 권한별로 나뉘어 있고 쓰기는 전부 서버가 판정한다.
 * 목이 401/403/409 를 실제로 반환해야 프론트 가드에만 의존하는 실수를 막을 수 있다.
 */
export const handlers = [
  ...authHandlers,
  ...postHandlers,
  ...commentHandlers,
  ...pollHandlers,
  ...mypageHandlers,
  ...adminHandlers,
  ...userHandlers,
  ...rosterHandlers,
  ...scheduleHandlers,
  ...recordHandlers,
]
