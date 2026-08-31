/**
 * 경기 기록. 블루프린트 §5.11 · §9.2.
 *
 * 외부 리그 API 의 필드명을 그대로 쓴다(`hab`, `htb`, `sbo` …). 이름이 직관적이지
 * 않지만 바꾸면 백엔드가 매번 변환해야 하고 원본과 대조하기도 어려워진다.
 * `_` 로 시작하는 필드는 서버가 계산해 붙인 파생 지표다.
 */

/** 두 기록에 공통인 부분. */
type RecordBase = {
  user: { name: string }
  /** 로스터에서 이름으로 찾아 붙인 등번호. 못 찾으면 null(§12-17 동명이인 문제) */
  _number: string | null
  /** 팀 경기 수. 규정타석·규정이닝 계산의 기준이다 */
  tgame: number
}

export type BattingRecord = RecordBase & {
  _woba: number
  _wrcPlus: number
  _owar: number

  hgame: number
  /** 타수 (AB) */
  hab: number
  /** 타석 (PA) */
  htb: number
  /** 득점 (R) */
  her: number
  /** 안타 (H) */
  h: number
  h2: number
  h3: number
  hr: number
  sb: number
  /** 도루 실패 (CS) */
  sbo: number
  hbb: number
  hibb: number
  hhitByPitch: number
  hsacf: number
  hsacb: number
  hso: number
  /** 병살타 (GDP) */
  do: number

  havg: number
  obrate: number
  srate: number
  ops: number
}

export type PitchingRecord = RecordBase & {
  _fip: number
  _pwar: number

  pgame: number
  win: number
  lose: number
  save: number
  hold: number
  /** "5.2" = 5와 3분의 2 이닝. 소수가 아니므로 그대로 계산하면 안 된다 */
  innings: string
  r: number
  er: number
  ph: number
  phr: number
  pbb: number
  phitByPitch: number
  so: number

  era: number
  whip: number
  k7: number
}

export type StatRecord = BattingRecord | PitchingRecord

/**
 * "5.2" 를 5.667 로 바꾼다. 소수점 뒤는 10진수가 아니라 **아웃 카운트**다.
 * 그냥 Number("5.2") 로 읽으면 규정이닝 판정이 틀린다.
 */
export function parseInnings(value: string): number {
  const [full, outs = '0'] = String(value).split('.')
  const fullNumber = Number(full)
  const outsNumber = Number(outs)
  if (!Number.isFinite(fullNumber)) return 0
  return fullNumber + (Number.isFinite(outsNumber) ? outsNumber / 3 : 0)
}
