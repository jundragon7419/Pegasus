import { describe, expect, it } from 'vitest'

import {
  validateComment,
  validateEmail,
  validateEmailCode,
  validatePassword,
  validatePasswordConfirm,
  validateRosterNumber,
  validateStudentId,
  validateUsername,
} from '@/lib/validators'

/** 통과 여부만 볼 때 쓰는 축약. */
const passes = (r: { valid: boolean }) => r.valid

describe('validateUsername — 영문·숫자·밑줄 5~15자', () => {
  it('경계값을 정확히 지킨다', () => {
    expect(passes(validateUsername('abcd'))).toBe(false) // 4자
    expect(passes(validateUsername('abcde'))).toBe(true) // 5자
    expect(passes(validateUsername('a'.repeat(15)))).toBe(true)
    expect(passes(validateUsername('a'.repeat(16)))).toBe(false)
  })

  it('허용 문자만 받는다', () => {
    expect(passes(validateUsername('user_01'))).toBe(true)
    expect(passes(validateUsername('user-01'))).toBe(false) // 하이픈 불가
    expect(passes(validateUsername('사용자이름'))).toBe(false)
    expect(passes(validateUsername('user 01'))).toBe(false)
  })

  it('빈 값은 별도 문구로 안내한다', () => {
    const r = validateUsername('')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.error).toContain('입력')
  })
})

describe('validatePassword — 8자 이상 + 영문·숫자·특수문자', () => {
  it('세 종류를 모두 포함해야 통과한다', () => {
    expect(passes(validatePassword('Pegasus!2026'))).toBe(true)
    expect(passes(validatePassword('abcd1234'))).toBe(false) // 특수문자 없음
    expect(passes(validatePassword('abcd!@#$'))).toBe(false) // 숫자 없음
    expect(passes(validatePassword('1234!@#$'))).toBe(false) // 영문 없음
  })

  it('길이 경계', () => {
    expect(passes(validatePassword('Ab1!efg'))).toBe(false) // 7자
    expect(passes(validatePassword('Ab1!efgh'))).toBe(true) // 8자
  })

  it('무엇이 빠졌는지 알려준다', () => {
    const r = validatePassword('abcd1234')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.error).toContain('특수문자')
  })

  it('§7.2 의 특수문자 집합을 전부 인정한다', () => {
    for (const ch of `!@#$%^&*()_-=[]{};:'",.<>?/\\|`) {
      expect(passes(validatePassword(`abcd123${ch}`))).toBe(true)
    }
  })
})

describe('validatePasswordConfirm', () => {
  it('일치할 때만 통과한다', () => {
    expect(passes(validatePasswordConfirm('Ab1!efgh', 'Ab1!efgh'))).toBe(true)
    expect(passes(validatePasswordConfirm('Ab1!efgh', 'Ab1!efgi'))).toBe(false)
  })
})

describe('validateEmail', () => {
  it('기본 형식을 검사한다', () => {
    expect(passes(validateEmail('a@b.co'))).toBe(true)
    expect(passes(validateEmail('a@b'))).toBe(false)
    expect(passes(validateEmail('a b@c.co'))).toBe(false)
    expect(passes(validateEmail('@b.co'))).toBe(false)
  })
})

describe('validateStudentId — 숫자 10자리', () => {
  it('자릿수를 정확히 본다', () => {
    expect(passes(validateStudentId('2026900001'))).toBe(true)
    expect(passes(validateStudentId('202690000'))).toBe(false) // 9자리
    expect(passes(validateStudentId('20269000012'))).toBe(false) // 11자리
    expect(passes(validateStudentId('20269OOOO1'))).toBe(false) // 영문 포함
  })
})

describe('validateEmailCode — 숫자 6자리', () => {
  it('자릿수를 본다', () => {
    expect(passes(validateEmailCode('123456'))).toBe(true)
    expect(passes(validateEmailCode('12345'))).toBe(false)
    expect(passes(validateEmailCode('12345a'))).toBe(false)
  })
})

describe('validateRosterNumber', () => {
  it("숫자 또는 'M' 만 허용한다", () => {
    expect(passes(validateRosterNumber('17'))).toBe(true)
    expect(passes(validateRosterNumber('M'))).toBe(true)
    expect(passes(validateRosterNumber('m'))).toBe(true) // 대문자로 정규화
    expect(passes(validateRosterNumber('MG'))).toBe(false)
  })
})

describe('validateComment — 1~500자', () => {
  it('공백만 있으면 막는다', () => {
    expect(passes(validateComment('   '))).toBe(false)
    expect(passes(validateComment(' 안녕 '))).toBe(true)
  })

  it('500자 경계', () => {
    expect(passes(validateComment('가'.repeat(500)))).toBe(true)
    expect(passes(validateComment('가'.repeat(501)))).toBe(false)
  })
})
