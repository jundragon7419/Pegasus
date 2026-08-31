import { postHandlers } from './posts'
import { recordHandlers } from './records'
import { rosterHandlers } from './roster'
import { scheduleHandlers } from './schedule'

/**
 * 이번 단계에서는 **공개 GET 만** 다룬다.
 * 인증·쓰기 핸들러는 다음 단계에서 추가한다.
 */
export const handlers = [
  ...postHandlers,
  ...rosterHandlers,
  ...scheduleHandlers,
  ...recordHandlers,
]
