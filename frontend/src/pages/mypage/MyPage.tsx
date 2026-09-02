import { useState } from 'react'

import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/Tabs'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { useAuth } from '@/hooks/useAuth'
import { isMemberRole } from '@/lib/roles'
import type { User } from '@/types/auth'

import { AccountTab } from './AccountTab'
import { LogsTab } from './LogsTab'
import { MyCommentsTab } from './MyCommentsTab'
import { MyPostsTab } from './MyPostsTab'
import { MyVotesTab } from './MyVotesTab'
import { SettingsTab } from './SettingsTab'
import styles from './MyPage.module.css'

/**
 * 마이페이지. 블루프린트 §6.3.
 *
 * **탭 구성을 구 구현에서 하나 바꿨다.** 구 "활동 내역" 탭은 "내 게시글"·"내 댓글"
 * 탭의 앞 5건을 그대로 보여주는 순수 중복이었다(전용 엔드포인트까지 따로 있었다).
 * 그 자리에 **활동 로그**를 넣는다 — §8.4 의 열람 규칙이 "열람자 > 대상"이라
 * 등호가 없어 구 구현에서는 **아무도 자기 로그를 볼 수 없었다.**
 *
 * 탭은 처음 열릴 때 조회한다. `useApiResource(path | null)` 이 조건부 조회를
 * 지원하므로 각 탭이 열리기 전에는 `null` 을 넘긴다.
 */
export default function MyPage() {
  const { user } = useAuth()
  const me = useApiResource<User>('/api/mypage/me')
  const [tab, setTab] = useState('account')

  /** 회원 전용 기능의 산출물이라 basic 에게는 항상 비어 있다. 탭 자체를 감춘다 */
  const showActivity = isMemberRole(user?.authority)

  if (me.error) {
    return (
      <main className={styles.page}>
        <ErrorState error={me.error} what="내 정보" onRetry={me.reload} />
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>마이페이지</h1>

      {me.loading || !me.data ? (
        <div className={styles.skeleton}>
          <Skeleton height="2.5rem" />
          <Skeleton height="14rem" />
        </div>
      ) : (
        <TabsRoot value={tab} onValueChange={setTab} className={styles.tabs}>
          <TabsList>
            <TabsTrigger value="account">계정</TabsTrigger>
            {showActivity && <TabsTrigger value="posts">내 게시글</TabsTrigger>}
            {showActivity && <TabsTrigger value="comments">내 댓글</TabsTrigger>}
            {showActivity && <TabsTrigger value="votes">내 투표</TabsTrigger>}
            {showActivity && <TabsTrigger value="logs">활동 로그</TabsTrigger>}
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountTab me={me.data} onSaved={me.reload} active={tab === 'account'} />
          </TabsContent>

          {showActivity && (
            <>
              <TabsContent value="posts">
                <MyPostsTab active={tab === 'posts'} />
              </TabsContent>
              <TabsContent value="comments">
                <MyCommentsTab active={tab === 'comments'} />
              </TabsContent>
              <TabsContent value="votes">
                <MyVotesTab active={tab === 'votes'} />
              </TabsContent>
              <TabsContent value="logs">
                <LogsTab active={tab === 'logs'} />
              </TabsContent>
            </>
          )}

          <TabsContent value="settings">
            <SettingsTab me={me.data} />
          </TabsContent>
        </TabsRoot>
      )}
    </main>
  )
}
