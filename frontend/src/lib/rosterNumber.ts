/**
 * 기록 화면의 등번호 매핑. 블루프린트 §9.2 · §12-17.
 *
 * 외부 리그 API(Unique Play)는 **선수 이름만** 준다 — 학번이 없다. 그래서
 * 로스터를 이름으로 뒤져 등번호를 붙일 수밖에 없다. 여기까지는 구 구현과 같다.
 *
 * 문제는 그 다음이다. **구 구현은 같은 해 명단에 동명이인이 있으면 먼저 찾은
 * 사람의 번호를 그냥 붙였다.** 화면에는 남의 등번호가 아무 표시 없이 나온다.
 * 틀린 번호를 자신 있게 보여주는 것보다 안 보여주는 편이 낫다.
 *
 * 프레임워크 의존이 없다 — 백엔드가 그대로 import 한다.
 */

type NamedEntry = { name: string; number: string }

/**
 * 이름 → 등번호 맵. **이름이 겹치는 사람은 아예 넣지 않는다.**
 *
 * 반환된 맵에서 못 찾으면 두 가지 경우다: 명단에 없거나, 동명이인이라 특정할 수
 * 없거나. 둘 다 "번호를 모른다"는 같은 결론이므로 호출부는 구분할 필요가 없다.
 */
export function buildNumberMap(entries: readonly NamedEntry[]): Map<string, string> {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const key = normalizeName(entry.name)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const map = new Map<string, string>()
  for (const entry of entries) {
    const key = normalizeName(entry.name)
    if (counts.get(key) === 1) map.set(key, entry.number)
  }
  return map
}

/** 맵에서 번호를 찾는다. 없거나 동명이인이면 null. */
export const numberOf = (map: Map<string, string>, name: string): string | null =>
  map.get(normalizeName(name)) ?? null

/**
 * 이름 비교 기준. 외부 API 와 로스터에 공백이 다르게 들어갈 수 있어
 * 앞뒤 공백과 중간 공백을 없앤 뒤 비교한다.
 */
const normalizeName = (name: string) => name.replace(/\s+/g, '')
