import { Link } from 'react-router'

import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/routes'

import styles from './UserLink.module.css'

/**
 * 사용자 이름 링크. 본인이면 마이페이지, 아니면 활동 내역으로 간다.
 *
 * 구 구현은 `"username(name)"` 문자열에서 정규식으로 username 을 뽑아 썼다.
 * 이름에 괄호가 들어가면 깨지므로 여기서는 username 을 그대로 받는다.
 */
export function UserLink({
  username,
  label,
}: {
  username: string
  /** 표시 문자열. 없으면 username 그대로 */
  label?: string
}) {
  const { user } = useAuth()
  const isMe = user?.username === username

  return (
    <Link to={isMe ? ROUTES.mypage : ROUTES.userActivity(username)} className={styles.link}>
      {label ?? username}
    </Link>
  )
}
