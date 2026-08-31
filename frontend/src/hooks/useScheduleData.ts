import { useMemo } from 'react'

import { useApiResource } from '@/hooks/useApiResource'
import type { Holiday, TeamEvent } from '@/types/schedule'

export type ScheduleData = {
  /** 'YYYY-MM-DD' → 그날의 공휴일들 */
  holidayMap: Map<string, Holiday[]>
  /** 'YYYY-MM-DD' → 그날의 일정들 */
  eventMap: Map<string, TeamEvent[]>
  loading: boolean
  error: Error | null
  reload: () => void
}

function groupByDate<T extends { date: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const list = map.get(row.date)
    if (list) list.push(row)
    else map.set(row.date, [row])
  }
  return map
}

/**
 * 한 해의 공휴일과 팀 일정을 가져와 날짜별로 인덱싱한다(§10.3).
 * 미니 캘린더와 월간 캘린더가 함께 쓴다.
 *
 * 구 구현은 공휴일을 'MM-DD', 일정을 'DD' 로 서로 다르게 키를 잡았다.
 * 스키마에서 날짜 표현이 달랐기 때문인데(§12-20), 새 타입은 둘 다
 * 'YYYY-MM-DD' 문자열이라 키를 통일할 수 있다.
 */
export function useScheduleData(year: number): ScheduleData {
  const holidays = useApiResource<Holiday[]>(`/api/holidays?year=${year}`)
  const events = useApiResource<TeamEvent[]>(`/api/events?year=${year}`)

  const holidayMap = useMemo(() => groupByDate(holidays.data ?? []), [holidays.data])
  const eventMap = useMemo(() => groupByDate(events.data ?? []), [events.data])

  return {
    holidayMap,
    eventMap,
    loading: holidays.loading || events.loading,
    error: holidays.error ?? events.error,
    reload: () => {
      holidays.reload()
      events.reload()
    },
  }
}
