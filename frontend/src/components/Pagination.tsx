import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'

import { cx } from '@/lib/cx'
import { pageWindow } from '@/lib/pagination'

import styles from './Pagination.module.css'

type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  // 페이지가 하나뿐이면 조작할 것이 없다
  if (totalPages <= 1) return null

  return (
    <nav className={styles.root} aria-label="페이지">
      <button
        type="button"
        className={styles.arrow}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        <ChevronLeftIcon />
      </button>

      {pageWindow(page, totalPages).map((n) => (
        <button
          key={n}
          type="button"
          className={cx(styles.page, n === page && styles.current)}
          onClick={() => onChange(n)}
          // 현재 페이지를 색만으로 알리지 않는다
          aria-current={n === page ? 'page' : undefined}
        >
          {n}
        </button>
      ))}

      <button
        type="button"
        className={styles.arrow}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
      >
        <ChevronRightIcon />
      </button>
    </nav>
  )
}
