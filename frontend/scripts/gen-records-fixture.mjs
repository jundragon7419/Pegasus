/**
 * 픽스처 생성기.
 *
 * 손으로 적으면 타율과 안타·타수가 어긋나 화면이 고장난 것처럼 보인다.
 * 여기서 계산해 내부 정합성을 맞춘다.
 *
 * 이름과 학번은 전부 가공값이다. 구 시드에는 실명과 실제 학번이 들어 있어
 * 공개 저장소에 옮길 수 없다.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// 저장소 안 상대 경로. 절대 경로를 박으면 다른 PC 에서 깨진다
const OUT = fileURLToPath(new URL('../src/mocks/fixtures', import.meta.url))

// 시드 고정 난수 — 다시 돌려도 같은 결과가 나오게 한다
let seed = 20260831
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
const ri = (min, max) => Math.floor(rnd() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전']
const GIVEN = ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서', '건우', '현우', '우진', '선우', '연우', '유준', '정우', '승현', '지환', '승우', '준혁', '도현', '지훈', '민재', '현준', '태윤', '재원', '동현', '성민', '규민', '재희', '한결', '가온', '시윤', '이준', '은우', '유찬', '윤호', '수현', '태민']

const usedNames = new Set()
function makeName() {
  for (let i = 0; i < 200; i++) {
    const n = pick(SURNAMES) + pick(GIVEN)
    if (!usedNames.has(n)) { usedNames.add(n); return n }
  }
  return pick(SURNAMES) + pick(GIVEN) + ri(1, 9)
}

/** 명백히 합성인 학번. 9 블록으로 실제 학번과 겹치지 않게 한다. */
let sidSeq = 1
const makeStudentId = (enrollYear) => `${enrollYear}9${String(sidSeq++).padStart(5, '0')}`

/* ── 로스터 ────────────────────────────────────────────────────────────── */

function makeRoster(year, counts) {
  const rows = []
  let id = year * 1000
  const push = (number, role, generation) =>
    rows.push({
      id: id++,
      year,
      number,
      name: makeName(),
      studentId: makeStudentId(year - ri(0, 4)),
      generation,
      userId: null,
      role,
    })

  push('0', 'roster_headcoach', ri(20, 26))
  push('1', 'roster_president', ri(38, 42))
  for (let i = 0; i < counts.players; i++) push(String(ri(2, 99)), 'roster_player', ri(38, 44))
  for (let i = 0; i < counts.managers; i++) push('M', 'roster_manager', ri(41, 44))
  for (let i = 0; i < counts.retired; i++) push(String(ri(2, 99)), 'roster_retired', ri(28, 36))

  // 등번호 중복 제거
  const seen = new Set()
  for (const r of rows) {
    if (r.number === 'M') continue
    while (seen.has(r.number)) r.number = String(ri(2, 99))
    seen.add(r.number)
  }
  return rows
}

const roster2026 = makeRoster(2026, { players: 32, managers: 3, retired: 3 })
const roster2025 = makeRoster(2025, { players: 26, managers: 2, retired: 2 })

/* ── 기록 ──────────────────────────────────────────────────────────────── */

const TEAM_GAMES = 18
const r3 = (n) => Number(n.toFixed(3))
const r2 = (n) => Number(n.toFixed(2))

/**
 * bench=true 면 출전이 적은 선수를 만든다.
 * 규정타석 필터가 실제로 행을 걸러내는지 화면에서 확인하려면 미달자가 있어야 한다.
 */
function makeBatter(name, number, bench = false) {
  const hgame = bench ? ri(1, 4) : ri(8, TEAM_GAMES)
  const hab = bench ? ri(2, 12) : ri(hgame * 2, hgame * 4) // 타수
  const h = ri(Math.floor(hab * 0.12), Math.floor(hab * 0.45)) // 안타
  const hr = ri(0, Math.max(0, Math.floor(h * 0.14)))
  const h3 = ri(0, Math.max(0, Math.floor(h * 0.06)))
  const h2 = ri(0, Math.max(0, Math.floor(h * 0.22)))
  const singles = Math.max(0, h - h2 - h3 - hr)
  const hbb = ri(0, Math.floor(hab * 0.15))
  const hibb = ri(0, Math.max(0, Math.floor(hbb * 0.15)))
  const hhitByPitch = ri(0, 4)
  const hsacf = ri(0, 3)
  const hsacb = ri(0, 3)
  const hso = ri(Math.floor(hab * 0.08), Math.floor(hab * 0.32))
  const sb = ri(0, 12)
  const sbo = ri(0, Math.max(0, Math.floor(sb * 0.5)))
  const dp = ri(0, 4)
  const her = ri(0, Math.floor(h * 0.8))

  const totalBases = singles + h2 * 2 + h3 * 3 + hr * 4
  const havg = hab > 0 ? h / hab : 0
  const obDen = hab + hbb + hhitByPitch + hsacf
  const obrate = obDen > 0 ? (h + hbb + hhitByPitch) / obDen : 0
  const srate = hab > 0 ? totalBases / hab : 0
  const ops = obrate + srate
  const htb = hab + hbb + hhitByPitch + hsacf + hsacb   // PA

  // 파생 지표는 OPS 와 상관되게 둔다. 실제 산식은 백엔드가 계산한다.
  const woba = 0.24 + (ops - 0.6) * 0.18 + rnd() * 0.02
  const wrcPlus = Math.round(60 + (ops - 0.6) * 140 + rnd() * 12)
  const owar = (ops - 0.65) * 2.4 + htb / 400 + rnd() * 0.2

  return {
    user: { name },
    _number: number,
    _woba: r3(Math.max(0.15, woba)),
    _wrcPlus: Math.max(0, wrcPlus),
    _owar: r2(owar),
    tgame: TEAM_GAMES,
    hgame, hab, htb, her, h, h2, h3, hr, sb, sbo,
    hbb, hibb, hhitByPitch, hsacf, hsacb, hso, do: dp,
    havg: r3(havg), obrate: r3(obrate), srate: r3(srate), ops: r3(ops),
  }
}

function makePitcher(name, number, bench = false) {
  const pgame = bench ? ri(1, 3) : ri(6, TEAM_GAMES)
  const fullIp = bench ? ri(1, 6) : ri(pgame * 2, pgame * 4)
  const outs = ri(0, 2)
  const ip = fullIp + outs / 3
  const innings = `${fullIp}.${outs}`
  const ph = ri(Math.floor(ip * 0.6), Math.floor(ip * 1.6))
  const phr = ri(0, Math.max(0, Math.floor(ip * 0.12)))
  const pbb = ri(Math.floor(ip * 0.15), Math.floor(ip * 0.7))
  const phitByPitch = ri(0, 5)
  const so = ri(Math.floor(ip * 0.4), Math.floor(ip * 1.4))
  const er = ri(0, Math.floor(ip * 0.7))
  const r = er + ri(0, 4)
  const win = ri(0, Math.floor(pgame * 0.4))
  const lose = ri(0, Math.floor(pgame * 0.35))
  const save = ri(0, 4)
  const hold = ri(0, 4)

  const era = ip > 0 ? (er * 9) / ip : 0
  const whip = ip > 0 ? (ph + pbb) / ip : 0
  const k7 = ip > 0 ? (so * 7) / ip : 0
  const fip = ip > 0 ? (13 * phr + 3 * (pbb + phitByPitch) - 2 * so) / ip + 3.1 : 0
  const pwar = ((4.2 - fip + 1.5) * ip) / 9 / 9

  return {
    user: { name },
    _number: number,
    _fip: r2(Math.max(0, fip)),
    _pwar: r2(pwar),
    tgame: TEAM_GAMES,
    pgame, win, lose, save, hold, innings,
    r, er, ph, phr, pbb, phitByPitch, so,
    era: r2(era), whip: r2(whip), k7: r2(k7),
  }
}

// 기록은 2026 시즌 선수 중 일부만 갖는다(전원이 출전하지는 않는다)
const playing = roster2026.filter((p) => p.role === 'roster_player')
// 뒤쪽 몇 명은 교체 선수로 만들어 규정 필터가 실제로 동작하는지 확인할 수 있게 한다
const batting = playing.slice(0, 22).map((p, i) => makeBatter(p.name, p.number, i >= 17))
const pitching = playing.slice(10, 22).map((p, i) => makePitcher(p.name, p.number, i >= 9))

/* ── 출력 ──────────────────────────────────────────────────────────────── */

const header = `/**
 * 자동 생성된 픽스처입니다. 손으로 고치지 마세요.
 * 생성기: npm run gen:records
 *
 * 이름과 학번은 전부 가공값입니다. 구 프로젝트 시드에는 실명과 실제 학번이
 * 들어 있어 공개 저장소에 옮길 수 없습니다. 구성(인원·역할 분포·기수 체계)만
 * 참고했습니다. 학번의 5번째 자리 9 는 합성값 표식입니다.
 *
 * 타율·출루율·장타율·OPS·ERA·WHIP 는 안타·타수·이닝에서 실제로 계산한 값이라
 * 화면에서 숫자가 서로 어긋나지 않습니다.
 */
`

writeFileSync(
  `${OUT}/roster.ts`,
  header +
    `\nimport type { RosterEntry } from '@/types/roster'\n\n` +
    `export const ROSTER_BY_YEAR: Record<number, RosterEntry[]> = ${JSON.stringify(
      { 2026: roster2026, 2025: roster2025 },
      null,
      2,
    )}\n\n` +
    `export const ROSTER_YEARS = [2026, 2025]\nexport const ACTIVE_ROSTER_YEAR = 2026\n`,
)

writeFileSync(
  `${OUT}/records.ts`,
  header +
    `\nexport const BATTING_RECORDS = ${JSON.stringify(batting, null, 2)}\n\n` +
    `export const PITCHING_RECORDS = ${JSON.stringify(pitching, null, 2)}\n`,
)

console.log('roster 2026:', roster2026.length, '· 2025:', roster2025.length)
console.log('batting:', batting.length, '· pitching:', pitching.length)
console.log('팀 경기수(tgame):', TEAM_GAMES, '→ 규정타석', TEAM_GAMES, '· 규정이닝', Math.floor((TEAM_GAMES * 5) / 9))
