import { useState } from 'react'
import { LockClosedIcon, PersonIcon } from '@radix-ui/react-icons'
import { Checkbox as RadixCheckbox, RadioGroup } from 'radix-ui'

import { Button } from '@/components/Button'
import { VoterModal } from '@/components/VoterModal'
import { cx } from '@/lib/cx'
import type { PollOption, PollResponse } from '@/types/board'

import styles from './PollVote.module.css'

type PollVoteProps = {
  data: PollResponse
  /** 없으면 읽기 전용이다(권한이 없거나 보기 전용 화면) */
  onVote?: (optionIds: number[]) => Promise<void>
  /** 서버가 거절한 사유. 익명 재투표(409) 같은 것 */
  error?: string | null
}

export function PollVote({ data, onVote, error }: PollVoteProps) {
  const { poll, options, totalVotes, userVotes, hasVoted, canSeeResults } = data

  const [selected, setSelected] = useState<number[]>(userVotes)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [voterOption, setVoterOption] = useState<PollOption | null>(null)

  // 익명 투표는 이전 선택을 서버가 모르므로 되돌릴 수 없다(§12-9)
  const canRevote = hasVoted && !poll.isAnonymous
  const showForm = Boolean(onVote) && (!hasVoted || editing)

  const toggle = (optionId: number, on: boolean) => {
    setSelected((prev) => {
      if (!poll.isMultiple) return on ? [optionId] : []
      return on ? [...prev, optionId] : prev.filter((id) => id !== optionId)
    })
  }

  const submit = async () => {
    if (!onVote || selected.length === 0) return
    setSubmitting(true)
    try {
      await onVote(selected)
      setEditing(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.root} aria-label="투표">
      <div className={styles.head}>
        <h3 className={styles.title}>{poll.title}</h3>
        <div className={styles.badges}>
          {poll.isMultiple && <span className={styles.badge}>복수 선택</span>}
          {poll.isAnonymous && <span className={styles.badge}>익명</span>}
          {poll.isPrivate && (
            <span className={styles.badge}>
              <LockClosedIcon /> 비공개
            </span>
          )}
        </div>
      </div>

      {showForm ? (
        <PollForm
          poll={poll}
          options={options}
          selected={selected}
          onToggle={toggle}
        />
      ) : (
        <ul className={styles.results}>
          {options.map((option) => (
            <li key={option.id}>
              <ResultRow
                option={option}
                mine={userVotes.includes(option.id)}
                canSeeResults={canSeeResults}
                onShowVoters={
                  // 익명이면 명단 자체가 존재하지 않는다
                  option.voters.length > 0 ? () => setVoterOption(option) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.footer}>
        <span className={styles.total}>
          {canSeeResults
            ? `총 ${totalVotes ?? 0}표`
            : '결과는 작성자와 임원진만 볼 수 있습니다'}
        </span>

        <div className={styles.actions}>
          {showForm ? (
            <>
              {editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  취소
                </Button>
              )}
              <Button size="sm" onClick={submit} disabled={selected.length === 0 || submitting}>
                {submitting ? '전송 중…' : '투표하기'}
              </Button>
            </>
          ) : hasVoted && poll.isAnonymous ? (
            <span className={styles.note}>익명 투표는 다시 선택할 수 없습니다</span>
          ) : canRevote && onVote ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelected(userVotes)
                setEditing(true)
              }}
            >
              다시 선택
            </Button>
          ) : null}
        </div>
      </div>

      <VoterModal
        option={voterOption}
        onClose={() => setVoterOption(null)}
      />
    </section>
  )
}

/* ── 선택 폼 ────────────────────────────────────────────────────────────── */

type PollFormProps = {
  poll: PollResponse['poll']
  options: PollOption[]
  selected: number[]
  onToggle: (optionId: number, on: boolean) => void
}

function PollForm({ poll, options, selected, onToggle }: PollFormProps) {
  if (poll.isMultiple) {
    return (
      <ul className={styles.options}>
        {options.map((option) => (
          <li key={option.id}>
            <label className={styles.option}>
              <RadixCheckbox.Root
                className={styles.control}
                checked={selected.includes(option.id)}
                onCheckedChange={(value) => onToggle(option.id, value === true)}
              >
                <RadixCheckbox.Indicator className={styles.indicator} />
              </RadixCheckbox.Root>
              <span className={styles.optionText}>{option.text}</span>
            </label>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <RadioGroup.Root
      className={styles.options}
      value={selected[0] !== undefined ? String(selected[0]) : ''}
      onValueChange={(value) => onToggle(Number(value), true)}
    >
      {options.map((option) => (
        <label key={option.id} className={styles.option}>
          <RadioGroup.Item className={cx(styles.control, styles.radio)} value={String(option.id)}>
            <RadioGroup.Indicator className={cx(styles.indicator, styles.radioIndicator)} />
          </RadioGroup.Item>
          <span className={styles.optionText}>{option.text}</span>
        </label>
      ))}
    </RadioGroup.Root>
  )
}

/* ── 결과 한 줄 ─────────────────────────────────────────────────────────── */

type ResultRowProps = {
  option: PollOption
  mine: boolean
  canSeeResults: boolean
  onShowVoters?: () => void
}

function ResultRow({ option, mine, canSeeResults, onShowVoters }: ResultRowProps) {
  return (
    <div className={cx(styles.result, mine && styles.resultMine)}>
      {/* 막대는 배경으로만 쓴다. 숫자를 반드시 함께 보여준다 */}
      {canSeeResults && (
        <span className={styles.bar} style={{ width: `${option.percentage ?? 0}%` }} aria-hidden />
      )}

      <span className={styles.resultText}>
        {option.text}
        {mine && <span className={styles.mineMark}>내 선택</span>}
      </span>

      {canSeeResults ? (
        <span className={styles.resultCount}>
          {onShowVoters ? (
            <button type="button" className={styles.votersButton} onClick={onShowVoters}>
              <PersonIcon />
              {option.votes ?? 0}표
            </button>
          ) : (
            `${option.votes ?? 0}표`
          )}
          <span className={styles.percent}>{option.percentage ?? 0}%</span>
        </span>
      ) : (
        <span className={styles.resultCount}>–</span>
      )}
    </div>
  )
}
