import { useState } from 'react'

import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/Tabs'
import { useAuth } from '@/hooks/useAuth'
import { isRoot, isStaffRole } from '@/lib/roles'

import { BannedTab } from './BannedTab'
import { BasicUsersTab } from './BasicUsersTab'
import { ManagersTab } from './ManagersTab'
import { MembersTab } from './MembersTab'
import { PendingTab } from './PendingTab'
import { RosterTab } from './RosterTab'
import { SettingsTab } from './SettingsTab'
import { StaffsTab } from './StaffsTab'
import styles from './Admin.module.css'

/**
 * 관리자. 블루프린트 §6.3 · §5.10.
 *
 * **권한 없는 탭은 렌더하지 않는다.** 존재를 알리고 막는 것보다 낫다는 기존
 * 결정을 따른다(`docs/error-screens.md` 4절). 라우트 단위 접근만 `/403` 으로 보낸다.
 *
 * 각 탭이 자기 데이터를 소유하고 **열릴 때** 조회한다 — 8개 탭을 한꺼번에 부르면
 * 진입이 느려지고 대부분은 보지도 않는다.
 */
export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('pending')

  const staff = isStaffRole(user?.authority)
  const root = isRoot(user?.authority)

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>관리자</h1>
      <p className={styles.subtitle}>
        모든 관리 행동은 활동 로그에 기록됩니다.
      </p>

      <TabsRoot value={tab} onValueChange={setTab} className={styles.tabs}>
        <TabsList>
          <TabsTrigger value="pending">멤버 승인</TabsTrigger>
          <TabsTrigger value="roster">로스터</TabsTrigger>
          {staff && <TabsTrigger value="managers">매니저</TabsTrigger>}
          {root && <TabsTrigger value="staffs">스태프</TabsTrigger>}
          {staff && <TabsTrigger value="basic">일반유저</TabsTrigger>}
          {staff && <TabsTrigger value="members">멤버</TabsTrigger>}
          {staff && <TabsTrigger value="banned">차단 계정</TabsTrigger>}
          {staff && <TabsTrigger value="settings">설정</TabsTrigger>}
        </TabsList>

        <TabsContent value="pending">
          <PendingTab active={tab === 'pending'} />
        </TabsContent>
        <TabsContent value="roster">
          <RosterTab active={tab === 'roster'} />
        </TabsContent>

        {staff && (
          <>
            <TabsContent value="managers">
              <ManagersTab active={tab === 'managers'} />
            </TabsContent>
            <TabsContent value="basic">
              <BasicUsersTab active={tab === 'basic'} />
            </TabsContent>
            <TabsContent value="members">
              <MembersTab active={tab === 'members'} />
            </TabsContent>
            <TabsContent value="banned">
              <BannedTab active={tab === 'banned'} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab active={tab === 'settings'} />
            </TabsContent>
          </>
        )}

        {root && (
          <TabsContent value="staffs">
            <StaffsTab active={tab === 'staffs'} />
          </TabsContent>
        )}
      </TabsRoot>
    </main>
  )
}
