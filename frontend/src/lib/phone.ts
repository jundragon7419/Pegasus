/**
 * 전화번호 국가코드와 표시 형식.
 *
 * 국기는 **유니코드 지역 표시 문자**로 만든다 — 이미지 자산이 필요 없고
 * 번들도 늘지 않는다(`KR` → 🇰🇷).
 */

export type Country = {
  /** ISO 3166-1 alpha-2 */
  iso: string
  /** 국가번호. 하이픈 없이 숫자만 */
  dial: string
  name: string
}

/** 자주 쓰는 것 위주. 유학·교환학생을 감안해 몇 개 더 둔다. */
export const COUNTRIES: Country[] = [
  { iso: 'KR', dial: '82', name: '대한민국' },
  { iso: 'US', dial: '1', name: '미국' },
  { iso: 'JP', dial: '81', name: '일본' },
  { iso: 'CN', dial: '86', name: '중국' },
  { iso: 'TW', dial: '886', name: '대만' },
  { iso: 'HK', dial: '852', name: '홍콩' },
  { iso: 'SG', dial: '65', name: '싱가포르' },
  { iso: 'VN', dial: '84', name: '베트남' },
  { iso: 'TH', dial: '66', name: '태국' },
  { iso: 'PH', dial: '63', name: '필리핀' },
  { iso: 'ID', dial: '62', name: '인도네시아' },
  { iso: 'MY', dial: '60', name: '말레이시아' },
  { iso: 'IN', dial: '91', name: '인도' },
  { iso: 'AU', dial: '61', name: '호주' },
  { iso: 'NZ', dial: '64', name: '뉴질랜드' },
  { iso: 'GB', dial: '44', name: '영국' },
  { iso: 'DE', dial: '49', name: '독일' },
  { iso: 'FR', dial: '33', name: '프랑스' },
  { iso: 'NL', dial: '31', name: '네덜란드' },
  { iso: 'ES', dial: '34', name: '스페인' },
  { iso: 'IT', dial: '39', name: '이탈리아' },
  { iso: 'CA', dial: '1', name: '캐나다' },
  { iso: 'BR', dial: '55', name: '브라질' },
  { iso: 'AE', dial: '971', name: '아랍에미리트' },
]

/** ISO 코드를 국기 이모지로. 'A' 를 지역 표시 문자 시작점으로 옮긴다. */
export function flagOf(iso: string): string {
  const BASE = 0x1f1e6 // 🇦
  return [...iso.toUpperCase()]
    .map((ch) => String.fromCodePoint(BASE + ch.charCodeAt(0) - 65))
    .join('')
}

/** 국가번호로 나라를 찾는다. 1번(미국·캐나다)처럼 겹치면 먼저 나온 것을 쓴다. */
export const countryByDial = (dial: string) =>
  COUNTRIES.find((c) => c.dial === dial) ?? COUNTRIES[0]

/** 이름·국가번호·ISO 어느 쪽으로 쳐도 찾히게 한다. */
export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase().replace(/^\+/, '')
  if (!q) return COUNTRIES
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.iso.toLowerCase().includes(q) ||
      c.dial.startsWith(q),
  )
}

/**
 * 입력 중 표시 형식.
 *
 * 한국(82)만 `010-0000-0000` 로 끊는다. 다른 나라는 자릿수 규칙이 제각각이라
 * 섣불리 끊으면 오히려 잘못된 형태를 강요하게 되므로 숫자만 남긴다(§7.2 는
 * 저장값을 "숫자만 7~15자리"로 규정한다).
 */
export function formatPhone(digits: string, dial: string): string {
  const only = digits.replace(/\D/g, '').slice(0, 15)
  if (dial !== '82') return only

  if (only.length <= 3) return only
  if (only.length <= 7) return `${only.slice(0, 3)}-${only.slice(3)}`
  return `${only.slice(0, 3)}-${only.slice(3, 7)}-${only.slice(7, 11)}`
}

/** 저장·전송용. 표시 문자를 걷어낸다. */
export const toDigits = (value: string) => value.replace(/\D/g, '')
