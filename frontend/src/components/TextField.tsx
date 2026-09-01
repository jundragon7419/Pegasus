import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react'

import { cx } from '@/lib/cx'

import styles from './TextField.module.css'

type TextFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'id'> & {
  label: string
  /** 붉은 별표를 붙인다 */
  required?: boolean
  /** 있으면 입력을 붉게 표시하고 메시지를 아래에 보여준다 */
  error?: string | null
  /** 평상시 안내 문구. error 가 있으면 가려진다 */
  hint?: string
  /** 성공 문구(중복확인 통과, 인증 완료 등) */
  success?: string | null
  /** 입력 오른쪽에 붙는 버튼 */
  trailing?: ReactNode
}

/**
 * 레이블 · 입력 · 메시지를 한 묶음으로 다룬다.
 *
 * 오류 메시지를 `aria-describedby` 로 입력에 연결하고 `aria-invalid` 를 붙인다.
 * 색만으로 오류를 표시하면 스크린리더 사용자와 색각 이상 사용자가 알 수 없다.
 */
export function TextField({
  label,
  required,
  error,
  hint,
  success,
  trailing,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? success ?? hint

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className={styles.row}>
        <input
          id={id}
          className={cx(styles.input, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          aria-required={required}
          {...inputProps}
        />
        {trailing}
      </div>

      {message && (
        <p
          id={messageId}
          className={cx(
            styles.message,
            error ? styles.error : success ? styles.success : styles.hint,
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}
