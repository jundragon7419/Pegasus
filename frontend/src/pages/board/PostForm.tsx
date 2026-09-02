import { useState } from 'react'
import { Link } from 'react-router'
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons'

import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { TextField } from '@/components/TextField'
import { POST_TYPE_LABEL } from '@/lib/labels'
import { canPinPostType, canUsePostType } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import type { Role } from '@/types/auth'
import type { PostType } from '@/types/board'

import styles from './PostForm.module.css'

const ALL_TYPES: PostType[] = ['normal', 'notice', 'event', 'game', 'family_occasion']
const MAX_OPTIONS = 10

export type PollDraft = {
  title: string
  isMultiple: boolean
  isAnonymous: boolean
  isPrivate: boolean
  options: string[]
}

export type PostDraft = {
  type: PostType
  title: string
  content: string
  /** null = 고정 안 함, 'infinite' = 무기한, 그 외는 만료일 */
  pinUntil: string | 'infinite' | null
  poll: PollDraft | null
}

type PostFormProps = {
  role: Role
  initial: PostDraft
  /** 편집 중인 글의 id. 취소했을 때 돌아갈 곳을 정한다 */
  postId?: number
  submitLabel: string
  submitting: boolean
  error: string | null
  onSubmit: (draft: PostDraft) => void
}

const EMPTY_POLL: PollDraft = {
  title: '',
  isMultiple: false,
  isAnonymous: false,
  isPrivate: false,
  options: ['', ''],
}

/**
 * 글 작성·수정 폼. 블루프린트 §6.3.
 *
 * **UI 와 서버가 같은 규칙 함수를 쓴다.** 유형별 작성 권한은 `canUsePostType`,
 * 고정 가능 여부는 `canPinPostType` 으로 판정하고 목 서버도 같은 함수를 쓴다.
 * 화면에서 고를 수 있는데 저장하면 조용히 무시되는 상황을 막기 위해서다.
 */
export function PostForm({
  role,
  initial,
  postId,
  submitLabel,
  submitting,
  error,
  onSubmit,
}: PostFormProps) {
  const [draft, setDraft] = useState<PostDraft>(initial)

  const types = ALL_TYPES.filter((type) => canUsePostType(role, type))
  const pinnable = canPinPostType(role, draft.type)

  const patch = (changes: Partial<PostDraft>) => setDraft((prev) => ({ ...prev, ...changes }))

  const changeType = (type: PostType) => {
    // 고정할 수 없는 유형으로 바꾸면 고정을 함께 푼다.
    // 남겨 두면 서버가 조용히 null 로 만들어 화면과 결과가 어긋난다
    patch({ type, pinUntil: canPinPostType(role, type) ? draft.pinUntil : null })
  }

  const patchPoll = (changes: Partial<PollDraft>) => {
    setDraft((prev) => (prev.poll ? { ...prev, poll: { ...prev.poll, ...changes } } : prev))
  }

  const setOption = (index: number, value: string) => {
    if (!draft.poll) return
    patchPoll({ options: draft.poll.options.map((o, i) => (i === index ? value : o)) })
  }

  const filledOptions = draft.poll?.options.map((o) => o.trim()).filter(Boolean) ?? []
  const pollValid =
    draft.poll === null || (draft.poll.title.trim() !== '' && filledOptions.length >= 2)
  const canSubmit =
    !submitting && draft.title.trim() !== '' && draft.content.trim() !== '' && pollValid

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) onSubmit(draft)
      }}
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor="post-type">
          유형
        </label>
        <select
          id="post-type"
          className={styles.select}
          value={draft.type}
          onChange={(event) => changeType(event.target.value as PostType)}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {POST_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
      </div>

      <TextField
        label="제목"
        value={draft.title}
        onChange={(event) => patch({ title: event.target.value })}
        maxLength={200}
        required
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="post-content">
          내용
        </label>
        <textarea
          id="post-content"
          className={styles.textarea}
          value={draft.content}
          onChange={(event) => patch({ content: event.target.value })}
          rows={12}
          required
        />
        <p className={styles.hint}>
          평문으로 저장됩니다. 입력한 그대로 보이며 HTML 태그는 해석되지 않습니다.
        </p>
      </div>

      {/* 고정은 매니저+ 이고 유형 조건도 만족해야 한다 */}
      {pinnable && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>상단 고정</legend>

          <Checkbox
            checked={draft.pinUntil !== null}
            onCheckedChange={(on) => patch({ pinUntil: on ? 'infinite' : null })}
          >
            목록 맨 위에 고정
          </Checkbox>

          {draft.pinUntil !== null && (
            <div className={styles.pinRow}>
              <Checkbox
                checked={draft.pinUntil === 'infinite'}
                onCheckedChange={(on) => patch({ pinUntil: on ? 'infinite' : todayPlus(7) })}
              >
                무기한
              </Checkbox>

              {draft.pinUntil !== 'infinite' && (
                <input
                  type="date"
                  className={styles.date}
                  value={draft.pinUntil}
                  onChange={(event) => patch({ pinUntil: event.target.value })}
                  aria-label="고정 만료일"
                />
              )}
            </div>
          )}
        </fieldset>
      )}

      {/* ── 투표 ─────────────────────────────────────────────────────────── */}

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>투표</legend>

        <Checkbox
          checked={draft.poll !== null}
          onCheckedChange={(on) => patch({ poll: on ? EMPTY_POLL : null })}
        >
          투표 첨부
        </Checkbox>

        {draft.poll && (
          <div className={styles.poll}>
            <TextField
              label="투표 제목"
              value={draft.poll.title}
              onChange={(event) => patchPoll({ title: event.target.value })}
              maxLength={200}
            />

            <div className={styles.options}>
              {draft.poll.options.map((option, index) => (
                <div key={index} className={styles.optionRow}>
                  <input
                    className={styles.input}
                    value={option}
                    onChange={(event) => setOption(index, event.target.value)}
                    placeholder={`선택지 ${index + 1}`}
                    aria-label={`선택지 ${index + 1}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`선택지 ${index + 1} 삭제`}
                    disabled={draft.poll!.options.length <= 2}
                    onClick={() =>
                      patchPoll({ options: draft.poll!.options.filter((_, i) => i !== index) })
                    }
                  >
                    <TrashIcon />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              disabled={draft.poll.options.length >= MAX_OPTIONS}
              onClick={() => patchPoll({ options: [...draft.poll!.options, ''] })}
            >
              <PlusIcon />
              선택지 추가
            </Button>

            <div className={styles.pollOptions}>
              <Checkbox
                checked={draft.poll.isMultiple}
                onCheckedChange={(on) => patchPoll({ isMultiple: on })}
              >
                복수 선택 허용
              </Checkbox>
              <Checkbox
                checked={draft.poll.isAnonymous}
                onCheckedChange={(on) => patchPoll({ isAnonymous: on })}
              >
                익명 투표
              </Checkbox>
              <Checkbox
                checked={draft.poll.isPrivate}
                onCheckedChange={(on) => patchPoll({ isPrivate: on })}
              >
                결과 비공개 (작성자와 임원진만 열람)
              </Checkbox>
            </div>

            {draft.poll.isAnonymous && (
              <p className={styles.hint}>
                익명 투표는 누가 무엇을 골랐는지 저장하지 않습니다. 그래서 참여자는 한 번
                던지면 다시 선택할 수 없고, 투표자 명단도 남지 않습니다.
              </p>
            )}
          </div>
        )}
      </fieldset>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <Button asChild variant="ghost">
          <Link to={postId === undefined ? ROUTES.board : ROUTES.boardDetail(postId)}>취소</Link>
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? '저장 중…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
