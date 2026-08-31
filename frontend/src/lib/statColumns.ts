import type { BattingRecord, PitchingRecord } from '@/types/records'

/**
 * 스탯 테이블 컬럼 정의.
 * 구 `Records.jsx` 의 BATTING_COLS(22) · PITCHING_COLS(18)을 그대로 옮긴 것이다.
 */

export type StatColumn<T> = {
  key: keyof T | 'name'
  label: string
  /** 툴팁으로 보여줄 한국어 설명. 약어만으로는 알기 어려운 것에만 붙인다 */
  title?: string
}

export const BATTING_COLUMNS: Array<StatColumn<BattingRecord>> = [
  { key: 'name', label: '이름' },
  { key: '_owar', label: 'oWAR', title: '공격 대체 선수 대비 승리 기여' },
  { key: '_wrcPlus', label: 'wRC+', title: '리그 평균을 100 으로 본 창출 득점' },
  { key: '_woba', label: 'wOBA', title: '가중 출루율' },
  { key: 'hgame', label: 'G' },
  { key: 'htb', label: 'PA', title: '타석' },
  { key: 'her', label: 'R' },
  { key: 'h', label: 'H' },
  { key: 'h2', label: '2B' },
  { key: 'h3', label: '3B' },
  { key: 'hr', label: 'HR' },
  { key: 'sb', label: 'SB' },
  { key: 'sbo', label: 'CS', title: '도루 실패' },
  { key: 'hbb', label: 'BB' },
  { key: 'hhitByPitch', label: 'HP' },
  { key: 'hibb', label: 'IB', title: '고의사구' },
  { key: 'hso', label: 'SO' },
  { key: 'do', label: 'GDP', title: '병살타' },
  { key: 'havg', label: '타율' },
  { key: 'obrate', label: '출루율' },
  { key: 'srate', label: '장타율' },
  { key: 'ops', label: 'OPS' },
]

export const PITCHING_COLUMNS: Array<StatColumn<PitchingRecord>> = [
  { key: 'name', label: '이름' },
  { key: '_pwar', label: 'pWAR', title: '투구 대체 선수 대비 승리 기여' },
  { key: 'era', label: 'ERA', title: '평균자책점' },
  { key: '_fip', label: 'FIP', title: '수비 무관 평균자책점' },
  { key: 'whip', label: 'WHIP', title: '이닝당 출루 허용' },
  { key: 'pgame', label: 'G' },
  { key: 'win', label: 'W' },
  { key: 'lose', label: 'L' },
  { key: 'save', label: 'SV' },
  { key: 'hold', label: 'HLD' },
  { key: 'innings', label: 'IP', title: '소수점 뒤는 아웃 카운트 (5.2 = 5⅔이닝)' },
  { key: 'r', label: 'R' },
  { key: 'er', label: 'ER' },
  { key: 'ph', label: 'H' },
  { key: 'phr', label: 'HR' },
  { key: 'pbb', label: 'BB' },
  { key: 'phitByPitch', label: 'HP' },
  { key: 'so', label: 'SO' },
  { key: 'k7', label: 'K/7' },
]

/** 소수 자리를 3자리로 보여줄 컬럼. 타율 .341 처럼 야구 관례를 따른다. */
const THREE_DECIMALS = new Set(['havg', 'obrate', 'srate', 'ops', '_woba'])

/** 셀에 표시할 문자열. 정렬용 원시값은 sortValue 가 따로 뽑는다. */
export function formatCell(row: Record<string, unknown>, key: string): string {
  if (key === 'name') {
    const name = (row.user as { name?: string } | undefined)?.name ?? '—'
    const number = row._number
    return number == null ? name : `${name} (${number})`
  }

  const value = row[key]
  if (value == null) return '—'
  if (typeof value === 'number' && THREE_DECIMALS.has(key)) return value.toFixed(3)
  return String(value)
}
