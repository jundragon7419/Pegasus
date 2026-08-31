/**
 * 라우트 경로의 단일 출처.
 * 문자열을 컴포넌트마다 흩어놓으면 경로가 바뀔 때 조용히 깨진다.
 */

export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',

  schedule: '/schedule',
  scheduleWrite: '/schedule/write',

  roster: '/roster',
  records: '/records',

  board: '/board',
  boardWrite: '/board/write',
  boardDetail: (id: number | string) => `/board/${id}`,
  boardEdit: (id: number | string) => `/board/${id}/edit`,

  mypage: '/mypage',
  admin: '/admin',

  userActivity: (username: string) => `/user/${username}`,
  logDetail: (username: string, logId: number | string) => `/user/${username}/log/${logId}`,

  /** 에러 화면은 전부 숫자다. docs/error-screens.md 참고. */
  error401: '/401',
  error403: '/403',
  error404: '/404',
  error500: '/500',
} as const

/** 라우트 정의에 쓰는 패턴(파라미터 포함). ROUTES 의 함수형과 짝을 이룬다. */
export const ROUTE_PATTERNS = {
  boardDetail: '/board/:id',
  boardEdit: '/board/:id/edit',
  userActivity: '/user/:username',
  logDetail: '/user/:username/log/:logId',
} as const

/** 로그인 후 원래 가려던 곳으로 돌려보내기 위한 쿼리 키. */
export const RETURN_TO_PARAM = 'returnTo'
