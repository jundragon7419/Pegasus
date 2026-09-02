import { useState } from 'react'

import { useApiErrorHandler } from '@/hooks/useApiErrorHandler'
import { ApiError } from '@/lib/api'

/**
 * 관리자 탭의 행 액션 공통 처리.
 *
 * 일곱 개 탭이 전부 "행 버튼을 누른다 → API 를 부른다 → 목록을 새로 고친다"
 * 라서, try/catch 와 진행 중 표시를 탭마다 다시 쓰지 않는다.
 *
 * **409 는 화면을 옮기지 않고 그 자리에 알린다.** 대상 조건이 어긋났다는 뜻이며
 * (§12-10), 대개 목록이 낡아서 생긴다 — 그때 사용자에게 필요한 것은 에러 화면이
 * 아니라 "새로 고쳐 보라"는 안내다.
 */
export function useAdminAction(reload: () => void) {
  const handleError = useApiErrorHandler()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(id: number, action: () => Promise<unknown>) {
    setPendingId(id)
    setError(null)
    try {
      await action()
      reload()
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : '처리하지 못했습니다.')
      }
    } finally {
      setPendingId(null)
    }
  }

  return { run, pendingId, error, clearError: () => setError(null) }
}
