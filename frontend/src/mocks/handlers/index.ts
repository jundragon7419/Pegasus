import { authHandlers } from './auth'
import { postHandlers } from './posts'
import { recordHandlers } from './records'
import { rosterHandlers } from './roster'
import { scheduleHandlers } from './schedule'

/**
 * 공개 조회 + 인증. 게시글·댓글 등의 **쓰기** 핸들러는 아직 없다.
 */
export const handlers = [
  ...authHandlers,
  ...postHandlers,
  ...rosterHandlers,
  ...scheduleHandlers,
  ...recordHandlers,
]
