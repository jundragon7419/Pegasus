import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '@/lib/api'

export type ApiResource<T> = {
  data: T | null
  loading: boolean
  error: Error | null
  /** 실패했을 때 다시 시도한다. 에러 상태의 "다시 시도" 버튼이 쓴다 */
  reload: () => void
}

type State<T> = {
  /** 이 상태가 어떤 요청에 대한 것인지. path 나 재시도 횟수가 바뀌면 달라진다 */
  key: string
  data: T | null
  error: Error | null
  loading: boolean
}

/**
 * 화면 데이터를 불러온다. 구 프로젝트의 `useFetch`(§10.3)를 대체한다.
 *
 * **오류가 나도 화면을 옮기지 않는다.** 데이터 하나가 실패했다고 페이지 전체를
 * 500 화면으로 갈아치우면 나머지가 멀쩡한데도 아무것도 못 보게 된다.
 * 대신 `error` 를 돌려주고 호출부가 그 자리에 `ErrorState` 를 그린다.
 * 렌더 자체가 터지는 복구 불가 상황만 `ErrorBoundary` 가 500 화면으로 보낸다.
 *
 * `path` 가 null 이면 요청하지 않는다(다른 값에 의존하는 조건부 조회).
 */
export function useApiResource<T>(path: string | null): ApiResource<T> {
  const [attempt, setAttempt] = useState(0)
  const key = `${path ?? ''}#${attempt}`

  const [state, setState] = useState<State<T>>(() => ({
    key,
    data: null,
    error: null,
    loading: path !== null,
  }))

  // path 나 재시도가 바뀌면 렌더 중에 상태를 초기화한다.
  // 효과 안에서 setState 하면 렌더가 한 번 더 도는데, 이 패턴은 React 가
  // 커밋 전에 즉시 다시 렌더하므로 깜빡임도 연쇄 렌더도 없다.
  if (state.key !== key) {
    setState({ key, data: null, error: null, loading: path !== null })
  }

  useEffect(() => {
    if (path === null) return

    const controller = new AbortController()

    apiFetch<T>(path, { signal: controller.signal })
      .then((result) => {
        setState({ key, data: result, error: null, loading: false })
      })
      .catch((caught: unknown) => {
        // 언마운트·경로 변경으로 인한 취소는 오류가 아니다.
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setState({
          key,
          data: null,
          error: caught instanceof Error ? caught : new Error(String(caught)),
          loading: false,
        })
      })

    return () => controller.abort()
  }, [path, key])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  return { data: state.data, loading: state.loading, error: state.error, reload }
}
