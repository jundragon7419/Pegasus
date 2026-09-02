import { useState } from 'react'

import { Button } from '@/components/Button'
import { ConfirmModal } from '@/components/ConfirmModal'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/Skeleton'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useApiResource } from '@/hooks/useApiResource'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, api } from '@/lib/api'
import { canEditComment, canModifyResource } from '@/lib/roles'
import { validateComment } from '@/lib/validators'
import type { Comment } from '@/types/board'

import styles from './CommentSection.module.css'

/** 컬럼 제약과 같은 값(§7.2). 카운터와 서버 검증이 같은 수를 본다. */
const MAX_LENGTH = 500

/**
 * 댓글. 블루프린트 §5.3 · §6.3.
 *
 * 수정은 소유자만, 삭제는 소유자 또는 manager+ 다. 게시글과 같은 규칙이고
 * 판정도 `lib/roles.ts` 의 같은 함수를 쓴다.
 */
export function CommentSection({ postId }: { postId: number }) {
  const { user } = useAuth()
  const handleError = useApiErrorHandler()
  const comments = useApiResource<Comment[]>(`/api/comments?postId=${postId}`)

  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [target, setTarget] = useState<Comment | null>(null)

  const check = validateComment(draft)

  const submit = async () => {
    if (!check.valid) {
      setError(check.error)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/api/comments', { postId, content: draft })
      setDraft('')
      comments.reload()
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '댓글을 남기지 못했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    if (!target) return
    try {
      await api.delete(`/api/comments/${target.id}`)
      setTarget(null)
      comments.reload()
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '삭제하지 못했습니다.')
      }
      setTarget(null)
    }
  }

  const list = comments.data ?? []

  return (
    <section className={styles.root} aria-label="댓글">
      <h2 className={styles.heading}>
        댓글 <span className={styles.count}>{list.length}</span>
      </h2>

      {comments.error ? (
        <ErrorState error={comments.error} what="댓글" onRetry={comments.reload} />
      ) : comments.loading ? (
        <div className={styles.list}>
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
        </div>
      ) : list.length === 0 ? (
        <p className={styles.empty}>첫 댓글을 남겨 보세요.</p>
      ) : (
        <ul className={styles.list}>
          {list.map((comment) => (
            <li key={comment.id}>
              <CommentRow
                comment={comment}
                canEdit={canEditComment(user, comment.userId)}
                canDelete={canModifyResource(user, comment.userId)}
                onSaved={comments.reload}
                onDelete={() => setTarget(comment)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className={styles.form}>
        <textarea
          className={styles.textarea}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="댓글을 입력해 주세요."
          maxLength={MAX_LENGTH}
          rows={3}
          aria-label="댓글 입력"
        />
        <div className={styles.formFoot}>
          <span className={styles.counter}>
            {draft.length} / {MAX_LENGTH}
          </span>
          <Button size="sm" onClick={submit} disabled={submitting || !check.valid}>
            {submitting ? '등록 중…' : '등록'}
          </Button>
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <ConfirmModal
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title="댓글을 삭제할까요?"
        description={
          target && target.userId === user?.id
            ? '삭제한 댓글은 되돌릴 수 없습니다.'
            : '다른 사람이 작성한 댓글입니다.\n이 행동은 로그에 기록됩니다.'
        }
        confirmLabel="삭제"
        onConfirm={remove}
      />
    </section>
  )
}

/* ── 댓글 한 줄 ─────────────────────────────────────────────────────────── */

type CommentRowProps = {
  comment: Comment
  canEdit: boolean
  canDelete: boolean
  onSaved: () => void
  onDelete: () => void
}

function CommentRow({ comment, canEdit, canDelete, onSaved, onDelete }: CommentRowProps) {
  const handleError = useApiErrorHandler()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(comment.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const check = validateComment(value)

  const save = async () => {
    if (!check.valid) return
    setSaving(true)
    setError(null)
    try {
      await api.put(`/api/comments/${comment.id}`, { content: value })
      setEditing(false)
      onSaved()
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '수정하지 못했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.comment}>
      <div className={styles.commentHead}>
        <span className={styles.commentAuthor}>{comment.author}</span>
        <span className={styles.commentDate}>
          {comment.createdAt.slice(0, 16).replace('T', ' ')}
          {comment.isEdited && <span className={styles.edited}>(수정)</span>}
        </span>
      </div>

      {editing ? (
        <>
          <textarea
            className={styles.textarea}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={MAX_LENGTH}
            rows={3}
            aria-label="댓글 수정"
          />
          <div className={styles.commentActions}>
            <span className={styles.counter}>
              {value.length} / {MAX_LENGTH}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue(comment.content)
                setEditing(false)
              }}
            >
              취소
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !check.valid}>
              저장
            </Button>
          </div>
        </>
      ) : (
        <p className={styles.commentBody}>{comment.content}</p>
      )}

      {!editing && (canEdit || canDelete) && (
        <div className={styles.commentActions}>
          {/* 수정은 소유자만. 매니저도 타인 댓글은 고칠 수 없다 */}
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              수정
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              삭제
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
