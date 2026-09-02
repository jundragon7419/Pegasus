import { beforeEach, describe, expect, it } from 'vitest'

import { createPost, findPollByPost, pollResponse, upsertPoll, vote } from './boardState'
import type { Post } from '@/types/board'

/**
 * 목 저장소의 투표 규칙. 구 구현에서 깨져 있던 두 가지를 여기서 못 박는다.
 *
 * - §12-8 옵션 텍스트가 그대로면 표가 보존된다
 * - §12-9 익명 투표는 선택 내용을 사용자와 묶지 않는다
 *
 * 목의 상태는 모듈 단위 싱글턴이므로 테스트마다 새 게시글을 만들어 격리한다.
 */

const displayName = (userId: number) => `user${userId}`

let post: Post

function optionIdsOf(): number[] {
  const response = pollResponse(post.id, { id: 999, authority: 'staff' }, displayName)
  return response!.options.map((option) => option.id)
}

function tallyOf(): Record<string, number | null> {
  const response = pollResponse(post.id, { id: 999, authority: 'staff' }, displayName)
  return Object.fromEntries(response!.options.map((option) => [option.text, option.votes]))
}

function castVote(userId: number, optionIds: number[]) {
  return vote(findPollByPost(post.id)!, userId, optionIds)
}

beforeEach(() => {
  post = createPost({
    userId: 1,
    author: 'tester',
    type: 'normal',
    title: `테스트 글 ${Math.random()}`,
    content: '본문',
    pinUntil: null,
  })
})

describe('upsertPoll — 표 보존 (§12-8)', () => {
  it('옵션을 그대로 두고 제목만 바꾸면 표가 남는다', () => {
    upsertPoll(post.id, {
      title: '원래 제목',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['A', 'B'],
    })
    const [a] = optionIdsOf()
    castVote(10, [a])
    castVote(11, [a])
    expect(tallyOf()).toEqual({ A: 2, B: 0 })

    upsertPoll(post.id, {
      title: '바뀐 제목',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['A', 'B'],
    })

    // 구 구현은 여기서 전부 0 이 됐다
    expect(tallyOf()).toEqual({ A: 2, B: 0 })
  })

  it('선택지를 추가해도 기존 표는 남고 새 선택지만 0 이다', () => {
    upsertPoll(post.id, {
      title: 'T',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['A', 'B'],
    })
    castVote(10, [optionIdsOf()[0]])

    upsertPoll(post.id, {
      title: 'T',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['A', 'B', 'C'],
    })
    expect(tallyOf()).toEqual({ A: 1, B: 0, C: 0 })
  })

  it('선택지 문구를 바꾸면 그 선택지의 표만 사라진다', () => {
    upsertPoll(post.id, {
      title: 'T',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['A', 'B'],
    })
    const [a, b] = optionIdsOf()
    castVote(10, [a])
    castVote(11, [b])

    upsertPoll(post.id, {
      title: 'T',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['A', 'B2'],
    })
    expect(tallyOf()).toEqual({ A: 1, B2: 0 })
  })
})

describe('vote — 기명 투표', () => {
  beforeEach(() => {
    upsertPoll(post.id, {
      title: 'T',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['A', 'B'],
    })
  })

  it('다시 던지면 이전 표가 깎이고 새 표가 더해진다', () => {
    const [a, b] = optionIdsOf()
    castVote(10, [a])
    expect(tallyOf()).toEqual({ A: 1, B: 0 })

    expect(castVote(10, [b])).toBe('ok')
    expect(tallyOf()).toEqual({ A: 0, B: 1 })
  })

  it('내 선택과 투표자 명단이 남는다', () => {
    const [a] = optionIdsOf()
    castVote(10, [a])

    const response = pollResponse(post.id, { id: 10, authority: 'member' }, displayName)!
    expect(response.userVotes).toEqual([a])
    expect(response.hasVoted).toBe(true)
    expect(response.options[0].voters).toEqual(['user10'])
  })

  it('단일 선택 투표에 두 개를 보내면 거절한다', () => {
    expect(castVote(10, optionIdsOf())).toBe('invalid')
  })

  it('없는 선택지는 거절한다', () => {
    expect(castVote(10, [999999])).toBe('invalid')
  })
})

describe('vote — 익명 투표 (§12-9)', () => {
  beforeEach(() => {
    upsertPoll(post.id, {
      title: 'T',
      isMultiple: false,
      isAnonymous: true,
      isPrivate: false,
      options: ['A', 'B'],
    })
  })

  it('참여 사실은 남지만 무엇을 골랐는지는 남지 않는다', () => {
    const [a] = optionIdsOf()
    castVote(10, [a])

    const response = pollResponse(post.id, { id: 10, authority: 'member' }, displayName)!
    expect(response.hasVoted).toBe(true)
    // 서버가 저장하지 않으므로 본인조차 되돌려 받을 수 없다
    expect(response.userVotes).toEqual([])
    expect(response.options.flatMap((option) => option.voters)).toEqual([])
    // 집계는 정상이다
    expect(response.totalVotes).toBe(1)
  })

  it('다시 던질 수 없다 — 이전 표를 깎을 방법이 없기 때문이다', () => {
    const [a, b] = optionIdsOf()
    castVote(10, [a])
    expect(castVote(10, [b])).toBe('anonymous-locked')
    expect(tallyOf()).toEqual({ A: 1, B: 0 })
  })
})

describe('pollResponse — 비공개 (§5.4)', () => {
  beforeEach(() => {
    upsertPoll(post.id, {
      title: 'T',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: true,
      options: ['A', 'B'],
    })
    castVote(10, [optionIdsOf()[0]])
  })

  it('일반 회원에게는 결과를 감춘다', () => {
    const response = pollResponse(post.id, { id: 20, authority: 'member' }, displayName)!
    expect(response.canSeeResults).toBe(false)
    expect(response.totalVotes).toBeNull()
    expect(response.options.every((option) => option.votes === null)).toBe(true)
  })

  it('매니저도 볼 수 없다 — staff 이상이어야 한다', () => {
    const manager = pollResponse(post.id, { id: 21, authority: 'manager' }, displayName)!
    expect(manager.canSeeResults).toBe(false)

    const staff = pollResponse(post.id, { id: 22, authority: 'staff' }, displayName)!
    expect(staff.canSeeResults).toBe(true)
  })

  it('글 작성자는 볼 수 있다', () => {
    const owner = pollResponse(post.id, { id: 1, authority: 'member' }, displayName)!
    expect(owner.canSeeResults).toBe(true)
  })
})
