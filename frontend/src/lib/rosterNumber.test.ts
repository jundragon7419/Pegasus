import { describe, expect, it } from 'vitest'

import { buildNumberMap, numberOf } from './rosterNumber'

/** §12-17 — 동명이인이면 등번호를 찍지 않는다. */
describe('buildNumberMap', () => {
  const roster = [
    { name: '김민준', number: '16' },
    { name: '이서준', number: 'M' },
    { name: '박지우', number: '7' },
    { name: '박지우', number: '23' }, // 동명이인
  ]

  it('이름이 하나뿐이면 번호를 붙인다', () => {
    const map = buildNumberMap(roster)
    expect(numberOf(map, '김민준')).toBe('16')
  })

  it('매니저의 M 도 그대로 다룬다', () => {
    expect(numberOf(buildNumberMap(roster), '이서준')).toBe('M')
  })

  it('동명이인은 null — 먼저 찾은 사람의 번호를 찍지 않는다', () => {
    // 구 구현은 여기서 '7' 을 붙였다. 화면에는 남의 등번호가 표시 없이 나온다
    expect(numberOf(buildNumberMap(roster), '박지우')).toBeNull()
  })

  it('명단에 없는 이름도 null', () => {
    expect(numberOf(buildNumberMap(roster), '없는사람')).toBeNull()
  })

  it('동명이인이 셋 이상이어도 null', () => {
    const map = buildNumberMap([
      { name: '최은우', number: '1' },
      { name: '최은우', number: '2' },
      { name: '최은우', number: '3' },
    ])
    expect(numberOf(map, '최은우')).toBeNull()
  })

  it('공백 차이는 같은 이름으로 본다 — 외부 API 와 로스터의 표기가 다를 수 있다', () => {
    const map = buildNumberMap([{ name: '김 민준', number: '16' }])
    expect(numberOf(map, '김민준')).toBe('16')
    expect(numberOf(map, ' 김민준 ')).toBe('16')
  })

  it('빈 명단이면 무엇을 찾아도 null', () => {
    expect(numberOf(buildNumberMap([]), '김민준')).toBeNull()
  })

  it('동명이인이 있어도 다른 사람은 영향을 받지 않는다', () => {
    const map = buildNumberMap(roster)
    expect(numberOf(map, '김민준')).toBe('16')
    expect(numberOf(map, '이서준')).toBe('M')
  })
})
