import { AdminTable } from '@/components/AdminTable'

import type { AdminUser } from './types'

/**
 * 사용자 표. 탭들이 이 위에 액션만 얹는다.
 *
 * `getKey` 를 매번 넘기지 않기 위한 얇은 래퍼다. 열 정의는 `columns.tsx` 에 있다
 * — 컴포넌트와 상수를 한 파일에 두면 Fast Refresh 가 깨진다.
 */
export function UserTable(props: Omit<Parameters<typeof AdminTable<AdminUser>>[0], 'getKey'>) {
  return <AdminTable<AdminUser> {...props} getKey={(row) => row.id} />
}
