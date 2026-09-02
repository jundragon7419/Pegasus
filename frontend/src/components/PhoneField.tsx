import { useState } from 'react'
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons'

import { Popover } from '@/components/Popover'
import { SearchInput } from '@/components/SearchInput'
import { cx } from '@/lib/cx'
import { countryByDial, flagOf, formatPhone, searchCountries, toDigits } from '@/lib/phone'

import styles from './PhoneField.module.css'

type PhoneFieldProps = {
  /** 숫자만. 표시 형식은 이 컴포넌트가 붙인다 */
  value: string
  country: string
  onChange: (value: string, country: string) => void
  disabled?: boolean
  error?: string | null
}

/**
 * 국가번호 + 전화번호 입력.
 *
 * 국가 목록은 `Popover` 안에 `SearchInput` 을 넣어 검색한다 — 둘 다 이미 있는
 * 컴포넌트다. 국기는 유니코드 지역 표시 문자라 이미지 자산이 없다.
 *
 * **저장값은 언제나 숫자만이다.** 하이픈은 보여줄 때만 붙인다(§7.2).
 */
export function PhoneField({ value, country, onChange, disabled, error }: PhoneFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = countryByDial(country)
  const results = searchCountries(query)

  const pick = (dial: string) => {
    setOpen(false)
    setQuery('')
    onChange(value, dial)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setQuery('')
          }}
          align="start"
          label="국가 선택"
          trigger={
            <button type="button" className={styles.trigger} disabled={disabled}>
              <span className={styles.flag} aria-hidden>
                {flagOf(selected.iso)}
              </span>
              <span className={styles.dial}>+{selected.dial}</span>
              <CaretSortIcon />
            </button>
          }
        >
          <div className={styles.picker}>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="국가 또는 번호"
              label="국가 검색"
            />
            <ul className={styles.options}>
              {results.length === 0 ? (
                <li className={styles.noResult}>검색 결과가 없습니다.</li>
              ) : (
                results.map((option) => (
                  <li key={option.iso}>
                    <button
                      type="button"
                      className={cx(
                        styles.option,
                        option.dial === selected.dial && styles.optionActive,
                      )}
                      onClick={() => pick(option.dial)}
                    >
                      <span aria-hidden>{flagOf(option.iso)}</span>
                      <span className={styles.optionName}>{option.name}</span>
                      <span className={styles.optionDial}>+{option.dial}</span>
                      {option.dial === selected.dial && <CheckIcon />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </Popover>

        <input
          type="tel"
          inputMode="numeric"
          className={styles.input}
          value={formatPhone(value, selected.dial)}
          onChange={(event) => onChange(toDigits(event.target.value).slice(0, 15), country)}
          placeholder={selected.dial === '82' ? '010-0000-0000' : '숫자만 입력'}
          disabled={disabled}
          aria-label="전화번호"
          aria-invalid={error ? true : undefined}
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
