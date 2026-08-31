import { useTheme } from '@/hooks/useTheme'

import styles from './ThemeToggle.module.css'

type ThemeToggleProps = {
  /** 라벨 텍스트를 숨기고 스위치만 보인다. 헤더가 좁을 때 쓴다. */
  hideLabel?: boolean
}

export function ThemeToggle({ hideLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={styles.wrap}>
      {!hideLabel && <span className={styles.label}>{isDark ? '다크' : '라이트'}</span>}
      <button
        type="button"
        className={styles.toggle}
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        onClick={toggleTheme}
      >
        <span className={styles.knob} />
      </button>
    </div>
  )
}
