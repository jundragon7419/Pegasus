import { useState } from 'react'

import { Button } from '@/components/Button'
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { useApiResource } from '@/hooks/useApiResource'
import { ApiError, api } from '@/lib/api'
import type { ActiveYear } from '@/types/roster'

import styles from './Admin.module.css'

const MIN_YEAR = 2000
const MAX_YEAR = new Date().getFullYear() + 1

/**
 * 설정. staff+ (§5.10).
 *
 * - **활성 로스터 연도**(§7.6) — 선수단 화면의 기본 연도, 로스터 추가 폼의 기본값,
 *   기록 화면의 등번호 매핑 연도가 전부 이 값을 본다
 * - **공휴일 동기화**(§12-6) — 구 구현은 데이터 없는 연도를 **조회하기만 해도**
 *   외부 API 를 호출하고 DB 를 갈아엎었다. 인증 없는 요청으로 쿼터를 태울 수
 *   있었으므로, 자동 동기화를 없애고 여기서만 수동으로 돌린다
 */
export function SettingsTab({ active }: { active: boolean }) {
  const handleError = useApiErrorHandler()
  const activeYear = useApiResource<ActiveYear>(active ? '/api/roster/active-year' : null)
  const years = useApiResource<number[]>(active ? '/api/roster/years' : null)

  const [busy, setBusy] = useState<'year' | 'holiday' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncYear, setSyncYear] = useState(String(new Date().getFullYear()))

  async function saveYear(year: number) {
    setBusy('year')
    setError(null)
    setMessage(null)
    try {
      await api.put('/api/admin/roster-year', { year })
      activeYear.reload()
      setMessage(`활성 연도를 ${year} 시즌으로 바꿨습니다.`)
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '변경하지 못했습니다.')
      }
    } finally {
      setBusy(null)
    }
  }

  async function syncHolidays() {
    setBusy('holiday')
    setError(null)
    setMessage(null)
    try {
      const result = await api.post<{ year: number; count: number }>('/api/admin/sync-holidays', {
        year: Number(syncYear),
      })
      setMessage(`${result.year}년 공휴일 ${result.count}건을 동기화했습니다.`)
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '동기화하지 못했습니다.')
      }
    } finally {
      setBusy(null)
    }
  }

  const options = years.data ?? []
  const current = activeYear.data?.year

  return (
    <div className={styles.panel}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && <p className={styles.success}>{message}</p>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>활성 로스터 연도</h2>
        <p className={styles.note}>
          선수단 화면의 기본 연도, 로스터 추가 폼의 기본값, 기록 화면의 등번호 매핑이 이 값을
          따릅니다.
        </p>

        <div className={styles.yearRow}>
          {options.map((year) => (
            <Button
              key={year}
              size="sm"
              variant={year === current ? 'primary' : 'secondary'}
              disabled={busy !== null || year === current}
              onClick={() => saveYear(year)}
            >
              {year}
            </Button>
          ))}
          {options.length === 0 && <span className={styles.muted}>선택할 연도가 없습니다.</span>}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>공휴일 동기화</h2>
        <p className={styles.note}>
          공휴일은 자동으로 갱신되지 않습니다. 새 연도가 시작되거나 임시공휴일이 지정되면
          여기서 직접 동기화해 주세요.
        </p>

        <div className={styles.yearRow}>
          <input
            type="number"
            className={styles.yearInput}
            value={syncYear}
            min={MIN_YEAR}
            max={MAX_YEAR}
            onChange={(event) => setSyncYear(event.target.value)}
            aria-label="동기화할 연도"
          />
          <Button disabled={busy !== null} onClick={syncHolidays}>
            {busy === 'holiday' ? '동기화 중…' : '동기화'}
          </Button>
        </div>
      </section>
    </div>
  )
}
