import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, api } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import type { Post } from '@/types/board'

import { PostForm, type PostDraft } from './PostForm'
import styles from './PostForm.module.css'

const EMPTY: PostDraft = {
  type: 'normal',
  title: '',
  content: '',
  pinUntil: null,
  poll: null,
}

export default function BoardWrite() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const handleError = useApiErrorHandler()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 라우트 가드가 member+ 를 보장하지만 타입상으로는 null 일 수 있다
  if (!user) return null

  const submit = async (draft: PostDraft) => {
    setSubmitting(true)
    setError(null)
    try {
      const created = await api.post<Post>('/api/posts', draft)
      navigate(ROUTES.boardDetail(created.id), { replace: true })
    } catch (caught) {
      // 400 은 화면을 옮기지 않는다. 입력을 그대로 두고 그 자리에 사유를 알린다
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '저장하지 못했습니다.')
      }
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>글쓰기</h1>
      <PostForm
        role={user.authority}
        initial={EMPTY}
        submitLabel="등록"
        submitting={submitting}
        error={error}
        onSubmit={submit}
      />
    </main>
  )
}
