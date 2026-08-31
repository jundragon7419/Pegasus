import { describe, expect, it } from 'vitest'

import { hasFinalConsonant, withParticle } from '@/lib/korean'

describe('hasFinalConsonant', () => {
  it('받침이 있는 글자를 구분한다', () => {
    expect(hasFinalConsonant('명단')).toBe(true)
    expect(hasFinalConsonant('기록')).toBe(true)
    expect(hasFinalConsonant('일정')).toBe(true)
  })

  it('받침이 없는 글자를 구분한다', () => {
    expect(hasFinalConsonant('선수')).toBe(false)
    expect(hasFinalConsonant('데이터')).toBe(false)
    expect(hasFinalConsonant('투표')).toBe(false)
  })

  it('한글이 아니면 받침 없음으로 본다', () => {
    expect(hasFinalConsonant('WAR')).toBe(false)
    expect(hasFinalConsonant('2026')).toBe(false)
  })
})

describe('withParticle', () => {
  it('을/를', () => {
    expect(withParticle('명단', '을/를')).toBe('명단을')
    expect(withParticle('선수', '을/를')).toBe('선수를')
  })

  it('이/가', () => {
    expect(withParticle('기록', '이/가')).toBe('기록이')
    expect(withParticle('투표', '이/가')).toBe('투표가')
  })

  it('은/는', () => {
    expect(withParticle('일정', '은/는')).toBe('일정은')
    expect(withParticle('경기', '은/는')).toBe('경기는')
  })
})
