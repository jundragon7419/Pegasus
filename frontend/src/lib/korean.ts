/**
 * 한국어 조사 처리.
 *
 * 앞 글자의 받침 유무에 따라 조사가 달라진다. 문자열을 그냥 이어 붙이면
 * "명단를", "선수가" 같은 어색한 문장이 나온다.
 */

/** 마지막 글자에 받침이 있는가. 한글이 아니면 false. */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1)
  if (!last) return false

  const code = last.charCodeAt(0)
  // 한글 음절 영역이 아니면 판단하지 않는다(영문·숫자로 끝나는 경우).
  if (code < 0xac00 || code > 0xd7a3) return false

  return (code - 0xac00) % 28 !== 0
}

type ParticlePair = '을/를' | '이/가' | '은/는' | '과/와' | '으로/로'

/**
 * 단어에 맞는 조사를 붙인다.
 *
 *   withParticle('명단', '을/를')  // '명단을'
 *   withParticle('선수', '이/가')  // '선수가'
 */
export function withParticle(word: string, pair: ParticlePair): string {
  const [withBatchim, withoutBatchim] = pair.split('/')
  return word + (hasFinalConsonant(word) ? withBatchim : withoutBatchim)
}
