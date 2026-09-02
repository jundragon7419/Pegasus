import { Link } from 'react-router'
import { LockClosedIcon } from '@radix-ui/react-icons'

import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiResource } from '@/hooks/useApiResource'
import { ROUTES } from '@/lib/routes'

import styles from './MyPage.module.css'

/**
 * 서버 응답. `myChoices` 가 null 이면 익명 투표라 선택을 알 수 없다는 뜻이다.
 */
type MyVote = {
  pollId: number
  pollTitle: string
  postId: number
  postTitle: string
  isAnonymous: boolean
  isPrivate: boolean
  myChoices: string[] | null
}

/**
 * 내가 참여한 투표.
 *
 * **§12-9 의 귀결이 여기서 눈에 보인다.** 기명 투표는 내가 무엇을 골랐는지
 * 보여줄 수 있지만, 익명 투표는 서버가 선택을 저장하지 않으므로 "참여함"까지만
 * 말할 수 있다. 구 구현은 익명 투표에도 `user_id` 를 저장하고 조회 시점에만
 * 가렸기 때문에 여기서도 선택을 보여줄 수 있었다 — 그게 익명이 아니었다는 증거다.
 */
export function MyVotesTab({ active }: { active: boolean }) {
  const votes = useApiResource<MyVote[]>(active ? '/api/mypage/votes' : null)

  if (votes.error) {
    return <ErrorState error={votes.error} what="내 투표" onRetry={votes.reload} />
  }

  if (votes.loading || !votes.data) {
    return (
      <div className={styles.panel}>
        <Skeleton height="8rem" />
      </div>
    )
  }

  if (votes.data.length === 0) {
    return (
      <div className={styles.panel}>
        <EmptyState
          title="참여한 투표가 없습니다"
          description="게시글에 투표가 있으면 참여할 수 있습니다."
        />
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <ul className={styles.voteList}>
        {votes.data.map((vote) => (
          <li key={vote.pollId} className={styles.voteItem}>
            <div className={styles.voteHead}>
              <span className={styles.voteTitle}>{vote.pollTitle}</span>
              <div className={styles.voteBadges}>
                {vote.isAnonymous && <span className={styles.badge}>익명</span>}
                {vote.isPrivate && (
                  <span className={styles.badge}>
                    <LockClosedIcon /> 비공개
                  </span>
                )}
              </div>
            </div>

            <Link to={ROUTES.boardDetail(vote.postId)} className={styles.voteSource}>
              {vote.postTitle}
            </Link>

            {vote.myChoices === null ? (
              <p className={styles.voteAnonymous}>
                참여함 · 익명 투표라 어떤 선택을 했는지는 저장되지 않습니다.
              </p>
            ) : (
              <div className={styles.voteChoices}>
                {vote.myChoices.map((choice, index) => (
                  <span key={index} className={styles.voteChoice}>
                    {choice}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
