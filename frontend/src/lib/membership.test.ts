import { describe, expect, it } from 'vitest'

import {
  canEditProfile,
  canRequestMembership,
  checkMembershipRequest,
  type MembershipProfile,
} from './membership'
import type { MembershipStatus } from '@/types/auth'

/** §7.1 의 전제조건을 모두 만족하는 프로필. */
const FULL: MembershipProfile = { name: '김민준', studentId: '2024900002', obYb: 'yb' }

describe('canEditProfile — 승인 후 프로필 잠금 (§7.1)', () => {
  it('none · rejected 에서만 고칠 수 있다', () => {
    expect(canEditProfile('none')).toBe(true)
    expect(canEditProfile('rejected')).toBe(true)
  })

  it('신청 중이거나 승인된 뒤에는 잠긴다 — 로스터가 학번으로 엮여 있다', () => {
    expect(canEditProfile('pending')).toBe(false)
    expect(canEditProfile('approved')).toBe(false)
  })
})

describe('checkMembershipRequest — 전제조건 4가지 (§7.1)', () => {
  it('none 상태에서 프로필이 다 있으면 통과', () => {
    expect(checkMembershipRequest('none', FULL)).toBeNull()
  })

  it('거부된 뒤 프로필을 고쳐 다시 신청할 수 있다', () => {
    expect(checkMembershipRequest('rejected', FULL)).toBeNull()
  })

  it('이미 신청 중', () => {
    expect(checkMembershipRequest('pending', FULL)).toBe('already-pending')
  })

  it('이미 멤버', () => {
    expect(checkMembershipRequest('approved', FULL)).toBe('already-member')
  })

  it('실명이 없으면 막힌다', () => {
    expect(checkMembershipRequest('none', { ...FULL, name: null })).toBe('missing-profile')
    // 공백만 채운 것도 없는 것으로 본다
    expect(checkMembershipRequest('none', { ...FULL, name: '   ' })).toBe('missing-profile')
  })

  it('OB/YB 가 없으면 막힌다', () => {
    expect(checkMembershipRequest('none', { ...FULL, obYb: null })).toBe('missing-profile')
  })

  it('학번이 없으면 막힌다 — 구 UI 는 "선택"이라 적었지만 서버는 필수였다(§12-13)', () => {
    expect(checkMembershipRequest('none', { ...FULL, studentId: null })).toBe('missing-student-id')
  })

  it('검사 순서가 §7.1 과 같다 — 상태를 프로필보다 먼저 본다', () => {
    // 프로필이 비어 있어도 pending 이면 "이미 신청 중"이 먼저다
    const empty: MembershipProfile = { name: null, studentId: null, obYb: null }
    expect(checkMembershipRequest('pending', empty)).toBe('already-pending')
    expect(checkMembershipRequest('approved', empty)).toBe('already-member')
  })

  it('실명·학번이 둘 다 없으면 실명을 먼저 알린다', () => {
    expect(checkMembershipRequest('none', { name: null, studentId: null, obYb: 'yb' })).toBe(
      'missing-profile',
    )
  })
})

describe('canRequestMembership', () => {
  it('checkMembershipRequest 와 결과가 일치한다', () => {
    const statuses: MembershipStatus[] = ['none', 'pending', 'approved', 'rejected']
    const profiles = [FULL, { ...FULL, studentId: null }, { name: null, studentId: null, obYb: null }]

    for (const status of statuses) {
      for (const profile of profiles) {
        expect(canRequestMembership(status, profile)).toBe(
          checkMembershipRequest(status, profile) === null,
        )
      }
    }
  })
})

