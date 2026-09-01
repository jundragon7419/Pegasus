import { useEffect, useState } from 'react'
import { DropdownMenu } from 'radix-ui'

import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { roleLabelOf } from '@/lib/labels'
import { setToken } from '@/lib/token'
import type { LoginResponse, MembershipStatus, Role, StaffType } from '@/types/auth'

import styles from '@/layouts/Header.module.css'

type DevAccount = {
  username: string
  authority: Role
  staffType: StaffType | null
  membershipStatus: MembershipStatus
  isBanned: boolean
}

/**
 * 개발 전용 역할 전환기.
 *
 * §4.4 권한 매트릭스와 `docs/error-screens.md` 의 도달 표를 화면에서 직접
 * 걸어보기 위한 장치다. 비밀번호 없이 목 계정의 토큰을 받아 바로 전환한다.
 *
 * **계정 목록을 픽스처에서 import 하지 않고 목 서버에 물어본다.**
 * `Header` 가 이 파일을 정적으로 import 하므로, 여기서 픽스처를 끌어오면
 * 프로덕션 번들까지 딸려 들어간다(실제로 목 비밀번호가 섞여 나왔다).
 *
 * `import.meta.env.DEV` 안에서만 렌더되며 목 서버가 없으면 목록이 비어 있다.
 */
export function DevRoleSwitcher() {
  const { user, logout, refresh } = useAuth()
  const [accounts, setAccounts] = useState<DevAccount[]>([])

  useEffect(() => {
    const controller = new AbortController()
    api
      .get<DevAccount[]>('/api/__dev/users', { signal: controller.signal })
      .then(setAccounts)
      .catch(() => {
        // 목 서버가 없으면 전환기를 쓸 수 없다. 조용히 비워 둔다
      })
    return () => controller.abort()
  }, [])

  async function switchTo(username: string) {
    const result = await api.post<LoginResponse>(
      '/api/__dev/impersonate',
      { username },
      { skipAuth: true },
    )
    setToken(result.token, false)
    await refresh()
  }

  return (
    <>
      <DropdownMenu.Label className={styles.menuLabel}>역할 전환 (개발용)</DropdownMenu.Label>

      {accounts.map((account) => (
        <DropdownMenu.Item
          key={account.username}
          className={styles.menuItem}
          onSelect={() => void switchTo(account.username)}
        >
          <span>
            {user?.username === account.username ? '● ' : ''}
            {account.username}
            <span className={styles.menuMeta}>
              {roleLabelOf(account.authority, account.staffType)}
              {account.isBanned && ' · 차단'}
              {account.membershipStatus === 'pending' && ' · 승인대기'}
              {account.membershipStatus === 'none' && ' · 프로필미입력'}
            </span>
          </span>
        </DropdownMenu.Item>
      ))}

      <DropdownMenu.Item className={styles.menuItem} onSelect={() => logout()}>
        <span>
          로그아웃 <span className={styles.menuMeta}>비로그인 상태로</span>
        </span>
      </DropdownMenu.Item>
    </>
  )
}
