/**
 * 페이지 번호 계산. 프레임워크 의존이 없어 테스트로 직접 확인할 수 있다.
 */

/** 한 번에 보여줄 페이지 번호 개수(§10.4). */
export const PAGE_WINDOW = 5

/**
 * 페이지가 몇 개든 버튼 수를 일정하게 유지하는 슬라이딩 윈도우.
 *
 * 끝에 가까워지면 창을 밀어 항상 PAGE_WINDOW 개를 채운다 — 마지막 페이지에서
 * 버튼이 하나만 남는 화면을 피하기 위해서다. 전체가 창보다 적으면 그 수만큼만 낸다.
 */
export function pageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 0) return []
  const size = Math.min(PAGE_WINDOW, totalPages)
  const start = Math.max(1, Math.min(page - Math.floor(size / 2), totalPages - size + 1))
  return Array.from({ length: size }, (_, i) => start + i)
}

/** 전체 건수를 페이지 수로. 0건이면 0페이지가 아니라 1페이지다(빈 목록도 화면이 있다). */
export const pageCount = (total: number, size: number) => Math.max(1, Math.ceil(total / size))
