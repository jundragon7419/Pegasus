import { describe, expect, it } from 'vitest'

import { addDaysISO, datesInRange, formatDateTime, toISODate, todayISO } from './date'

/**
 * 핵심은 **로컬 시간 기준**이라는 것이다.
 *
 * 이 테스트는 실행 환경의 시간대에서 돈다. UTC 로 도는 CI 에서는 UTC 방식과
 * 결과가 같아져서 버그를 못 잡으므로, **시간대에 의존하지 않는 방식**으로
 * 확인한다 — 같은 Date 객체의 로컬 연·월·일과 결과 문자열을 대조한다.
 */

describe('toISODate — 로컬 기준', () => {
  it('로컬 연·월·일을 그대로 쓴다', () => {
    const d = new Date(2026, 8, 2, 8, 0, 0) // 로컬 2026-09-02 08:00
    expect(toISODate(d)).toBe('2026-09-02')
  })

  it('한 자리 월·일에 0을 채운다', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('자정 직후에도 그날이다 — UTC 로 밀리지 않는다', () => {
    // toISOString 방식이었다면 UTC+9 에서 전날이 나온다
    const justAfterMidnight = new Date(2026, 8, 2, 0, 30, 0)
    expect(toISODate(justAfterMidnight)).toBe('2026-09-02')
  })

  it('시간대와 무관하게 로컬 필드와 일치한다', () => {
    for (const hour of [0, 1, 8, 12, 23]) {
      const d = new Date(2026, 8, 2, hour)
      const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(toISODate(d), `${hour}시`).toBe(expected)
    }
  })
})

describe('addDaysISO', () => {
  it('오전 이른 시각에도 정확히 n일 뒤다', () => {
    // 이 케이스가 원래 버그다. toISOString 방식은 08:00 KST 에서 하루 짧았다
    const base = new Date(2026, 8, 2, 8, 0, 0)
    expect(addDaysISO(7, base)).toBe('2026-09-09')
    expect(addDaysISO(7, new Date(2026, 8, 2, 0, 5, 0))).toBe('2026-09-09')
    expect(addDaysISO(7, new Date(2026, 8, 2, 23, 55, 0))).toBe('2026-09-09')
  })

  it('월·연 경계를 넘는다', () => {
    expect(addDaysISO(1, new Date(2026, 8, 30))).toBe('2026-10-01')
    expect(addDaysISO(1, new Date(2026, 11, 31))).toBe('2027-01-01')
  })

  it('윤년 2월을 넘는다', () => {
    expect(addDaysISO(1, new Date(2028, 1, 28))).toBe('2028-02-29')
  })

  it('음수면 이전 날짜', () => {
    expect(addDaysISO(-1, new Date(2026, 8, 1))).toBe('2026-08-31')
  })

  it('기본값은 오늘 기준', () => {
    expect(addDaysISO(0)).toBe(todayISO())
  })
})

describe('datesInRange', () => {
  it('양끝을 포함한다', () => {
    expect(datesInRange('2026-09-01', '2026-09-03')).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ])
  })

  it('하루짜리 범위는 한 건', () => {
    expect(datesInRange('2026-09-01', '2026-09-01')).toEqual(['2026-09-01'])
  })

  it('월 경계를 넘는다', () => {
    expect(datesInRange('2026-08-30', '2026-09-02')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
    ])
  })

  it('시작이 종료보다 뒤면 빈 배열', () => {
    expect(datesInRange('2026-09-05', '2026-09-01')).toEqual([])
  })

  it('날짜만 있는 문자열을 UTC 자정으로 읽지 않는다', () => {
    // `new Date('2026-09-01')` 은 UTC 자정이라 UTC+9 에서는 09:00,
    // UTC-5 같은 곳에서는 **전날 19:00** 이 되어 하루가 밀린다
    expect(datesInRange('2026-09-01', '2026-09-01')).toEqual(['2026-09-01'])
  })
})

describe('formatDateTime', () => {
  it('날짜와 시:분을 로컬로 보여준다', () => {
    const iso = new Date(2026, 8, 2, 14, 5).toISOString()
    expect(formatDateTime(iso)).toBe('2026-09-02 14:05')
  })
})
