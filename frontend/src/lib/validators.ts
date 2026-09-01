/**
 * 입력 검증. 블루프린트 §7.2 의 표를 그대로 옮긴 것이다.
 *
 * 결과를 `{ valid, error }` 한 가지 형태로 통일한다 — 호출부가 매번 다른 모양을
 * 다루지 않아도 되고, 에러 문구가 규칙 옆에 붙어 있어 어긋나지 않는다.
 *
 * `roles.ts` 와 같은 이유로 프레임워크 의존성을 넣지 않는다. 백엔드가 그대로
 * import 해서 써야 프론트와 서버의 검증이 갈라지지 않는다.
 */

export type ValidationResult = { valid: true } | { valid: false; error: string }

const ok: ValidationResult = { valid: true }
const fail = (error: string): ValidationResult => ({ valid: false, error })

/**
 * 아이디: 영문·숫자·밑줄 5~15자.
 *
 * 구 구현은 가입에서 5자, 계정 수정에서 1자를 요구해 하한이 달랐다(§7.2 ⚠️).
 * 같은 값에 규칙이 둘일 이유가 없으므로 **5자로 통일**한다.
 */
const USERNAME_RE = /^[a-zA-Z0-9_]{5,15}$/

export function validateUsername(value: string): ValidationResult {
  if (!value) return fail('아이디를 입력해 주세요.')
  if (!USERNAME_RE.test(value)) {
    return fail('아이디는 영문·숫자·밑줄 5~15자여야 합니다.')
  }
  return ok
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): ValidationResult {
  if (!value) return fail('이메일을 입력해 주세요.')
  if (!EMAIL_RE.test(value)) return fail('이메일 형식이 올바르지 않습니다.')
  return ok
}

/** §7.2 가 규정한 특수문자 집합. */
const SPECIAL_RE = /[!@#$%^&*()_\-=[\]{};:'",.<>?/\\|]/

/** 비밀번호: 8자 이상이면서 영문·숫자·특수문자를 각각 하나 이상 포함. */
export function validatePassword(value: string): ValidationResult {
  if (!value) return fail('비밀번호를 입력해 주세요.')
  if (value.length < 8) return fail('비밀번호는 8자 이상이어야 합니다.')
  if (!/[a-zA-Z]/.test(value)) return fail('비밀번호에 영문을 포함해 주세요.')
  if (!/\d/.test(value)) return fail('비밀번호에 숫자를 포함해 주세요.')
  if (!SPECIAL_RE.test(value)) return fail('비밀번호에 특수문자를 포함해 주세요.')
  return ok
}

export function validatePasswordConfirm(password: string, confirm: string): ValidationResult {
  if (!confirm) return fail('비밀번호를 한 번 더 입력해 주세요.')
  if (password !== confirm) return fail('비밀번호가 일치하지 않습니다.')
  return ok
}

/** 학번: 숫자 10자리. 로스터 연동 키이므로 형식이 어긋나면 연결이 끊긴다. */
export function validateStudentId(value: string): ValidationResult {
  if (!value) return fail('학번을 입력해 주세요.')
  if (!/^\d{10}$/.test(value)) return fail('학번은 숫자 10자리여야 합니다.')
  return ok
}

/** 전화번호: 숫자만 7~15자리. 화면에서 넣은 하이픈은 미리 제거해서 넘긴다. */
export function validatePhone(value: string): ValidationResult {
  if (!value) return fail('전화번호를 입력해 주세요.')
  if (!/^\d{7,15}$/.test(value)) return fail('전화번호는 숫자 7~15자리여야 합니다.')
  return ok
}

/** 이메일 인증 코드: 숫자 6자리. */
export function validateEmailCode(value: string): ValidationResult {
  if (!value) return fail('인증번호를 입력해 주세요.')
  if (!/^\d{6}$/.test(value)) return fail('인증번호는 숫자 6자리입니다.')
  return ok
}

/** 로스터 등번호: 'M'(매니저) 또는 숫자. */
export function validateRosterNumber(value: string): ValidationResult {
  if (!value) return fail('등번호를 입력해 주세요.')
  const normalized = value.toUpperCase()
  if (normalized !== 'M' && !/^\d+$/.test(normalized)) {
    return fail("등번호는 숫자이거나 매니저를 뜻하는 'M' 이어야 합니다.")
  }
  return ok
}

/** 댓글: 1~500자. 공백만 있는 경우도 막는다. */
export function validateComment(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) return fail('내용을 입력해 주세요.')
  if (trimmed.length > 500) return fail('댓글은 500자를 넘을 수 없습니다.')
  return ok
}

/** 일정 이름: 1~100자 (컬럼 제약). */
export function validateEventName(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) return fail('일정 이름을 입력해 주세요.')
  if (trimmed.length > 100) return fail('일정 이름은 100자를 넘을 수 없습니다.')
  return ok
}
