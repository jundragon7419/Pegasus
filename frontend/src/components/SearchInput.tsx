import { Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons'

import styles from './SearchInput.module.css'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 스크린리더용 레이블. 시각적으로는 아이콘만 보이므로 반드시 필요하다 */
  label: string
}

export function SearchInput({ value, onChange, placeholder, label }: SearchInputProps) {
  return (
    <div className={styles.wrap}>
      <MagnifyingGlassIcon className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {value && (
        <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label="검색어 지우기">
          <Cross2Icon />
        </button>
      )}
    </div>
  )
}
