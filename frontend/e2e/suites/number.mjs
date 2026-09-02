/** §12-17 — 동명이인이면 등번호를 찍지 않는다. */
import { chromium } from 'playwright'
const B = 'http://localhost:5173', API = 'http://localhost:3001'

const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } })
let fails = 0
const ok = (l, c, x = '') => { if (!c) fails++; console.log(`  ${c ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`) }

await p.goto(B + '/', { waitUntil: 'networkidle' })
const get = (path) => p.evaluate(async ([a, u]) => (await (await fetch(a + u)).json()), [API, path])

const roster = await get('/api/roster?year=2026')
const counts = {}
for (const e of roster) counts[e.name] = (counts[e.name] ?? 0) + 1
const dupNames = Object.keys(counts).filter((n) => counts[n] > 1)
ok('2026 명단에 동명이인이 있다 (이 경로를 시험하려면 필요하다)', dupNames.length > 0, dupNames.join(','))

const batting = await get('/api/records/batting')
const pitching = await get('/api/records/pitching')
const all = [...batting, ...pitching]

const dupRecords = all.filter((r) => dupNames.includes(r.user.name))
ok('동명이인 이름이 기록에도 있다', dupRecords.length > 0, dupRecords.map((r) => r.user.name).join(','))
ok('동명이인은 등번호가 null — 남의 번호를 찍지 않는다',
  dupRecords.every((r) => r._number === null),
  dupRecords.map((r) => `${r.user.name}:${r._number}`).join(','))

const unique = all.filter((r) => counts[r.user.name] === 1)
ok('명단에 한 명뿐인 선수는 번호가 붙는다',
  unique.length > 0 && unique.every((r) => r._number !== null),
  `${unique.filter((r) => r._number !== null).length}/${unique.length}`)

const notInRoster = all.filter((r) => !(r.user.name in counts))
ok('명단에 없는 선수는 null', notInRoster.every((r) => r._number === null), `${notInRoster.length}명`)

// 화면에서도 확인 — 등번호 방패가 안 그려져야 한다
await p.goto(B + '/records', { waitUntil: 'networkidle' })
await p.waitForTimeout(1000)
await p.getByRole('tab', { name: '타자', exact: true }).click()
await p.waitForTimeout(800)
const dupName = dupNames[0]
const row = p.locator('main tbody tr', { hasText: dupName }).first()
if (await row.count()) {
  const text = await row.innerText()
  ok(`표에서 "${dupName}" 행에 등번호 칸이 비어 있다`, !/^\s*\d+\s/.test(text.split('\t')[0]), text.slice(0, 24).replace(/\n/g, ' '))
} else {
  ok(`"${dupName}" 이 타자 표에 있다`, false, '행을 찾지 못함')
}

// 활성 연도를 2025 로 바꾸면 매핑 기준도 따라가야 한다
const token = await p.evaluate(async (api) => {
  const r = await fetch(api + '/api/__dev/impersonate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'president' }),
  })
  return (await r.json()).token
}, API)
await p.evaluate(async ([api, t]) => {
  await fetch(api + '/api/admin/roster-year', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ year: 2025 }),
  })
}, [API, token])
const batting2025 = await get('/api/records/batting')
const changed = batting2025.filter((r, i) => r._number !== batting[i]._number).length
ok('활성 연도를 바꾸면 매핑 기준도 따라간다', changed > 0, `${changed}명 변동`)

console.log('\n' + (fails === 0 ? '전 항목 통과' : `실패 ${fails}건`))
await b.close()
process.exit(fails === 0 ? 0 : 1)
