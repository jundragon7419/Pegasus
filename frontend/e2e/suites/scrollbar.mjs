/**
 * 스크롤바 검증.
 *
 * 핵심은 하나다 — **스크롤 가능 여부와 무관하게 콘텐츠 폭이 같아야 한다.**
 * 그것을 `documentElement.clientWidth` 로 잰다(clientWidth 는 스크롤바를 뺀 값이다).
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const API = 'http://localhost:3001'
const OUT = new URL('../artifacts', import.meta.url).pathname.replace(/^\//, '')

// 헤드리스 Chromium 은 오버레이 스크롤바를 쓴다 — 폭 변화가 아예 일어나지 않아
// 이 문제를 재현할 수 없다. 실제 데스크톱과 같은 조건으로 재려면 headed 여야 한다.
const browser = await chromium.launch({ headless: false })

let fails = 0
const ok = (l, c, x = '') => {
  if (!c) fails++
  console.log(`  ${c ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`)
}

/** 스크롤 가능 여부와 실제 콘텐츠 폭. */
const MEASURE = () => {
  const el = document.documentElement
  return {
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollable: el.scrollHeight > el.clientHeight,
    // 가운데 정렬된 본문이 실제로 어디에 놓였는지
    mainLeft: Math.round(document.querySelector('main')?.getBoundingClientRect().left ?? -1),
  }
}

/* ── 1. 데스크톱(pointer: fine) ──────────────────────────────────────────── */
console.log('[데스크톱 — 스크롤 가능 여부와 무관하게 폭이 같은가]')

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(B + '/', { waitUntil: 'networkidle' })
const token = await page.evaluate(async (api) => {
  const res = await fetch(api + '/api/__dev/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'player01' }),
  })
  const { token } = await res.json()
  sessionStorage.setItem('token', token)
  return token
}, API)

const PAGES = [
  ['/', '홈'],
  ['/records', '기록'],
  ['/board', '게시판'],
  ['/403', '403(짧음)'],
  ['/401', '401(짧음)'],
  ['/404', '404(짧음)'],
]

const widths = []
for (const [path, label] of PAGES) {
  await page.evaluate((t) => sessionStorage.setItem('token', t), token)
  await page.goto(B + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const m = await page.evaluate(MEASURE)
  widths.push({ label, ...m })
  console.log(
    `    ${label.padEnd(12)} clientWidth ${m.clientWidth}  main.left ${m.mainLeft}  ${m.scrollable ? '스크롤 가능' : '스크롤 불가'}`,
  )
}

const uniqueWidths = [...new Set(widths.map((w) => w.clientWidth))]
ok('모든 화면의 clientWidth 가 동일', uniqueWidths.length === 1, uniqueWidths.join(' / '))
ok('스크롤 불가 화면이 실제로 섞여 있다', widths.some((w) => !w.scrollable) && widths.some((w) => w.scrollable))
ok('뷰포트(1280)보다 스크롤바만큼 좁다', uniqueWidths[0] === 1280 - 10, `${uniqueWidths[0]}px`)

// 수정 전 동작을 같은 페이지에서 재현해 대조한다.
// overflow-y: auto 로 되돌리면 스크롤 불가 화면만 폭이 넓어져야 한다 — 그게 신고된 증상이다
console.log('\n[대조 — overflow-y: auto 로 되돌렸을 때 (수정 전 동작)]')
const before = []
for (const [path, label] of PAGES) {
  await page.evaluate((t) => sessionStorage.setItem('token', t), token)
  await page.goto(B + path, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    document.documentElement.style.overflowY = 'auto'
  })
  await page.waitForTimeout(400)
  const m = await page.evaluate(MEASURE)
  before.push({ label, ...m })
  console.log(`    ${label.padEnd(12)} clientWidth ${m.clientWidth}  ${m.scrollable ? '스크롤 가능' : '스크롤 불가'}`)
}
const beforeWidths = [...new Set(before.map((w) => w.clientWidth))]
ok('수정 전에는 폭이 두 가지였다 (= 신고된 증상)', beforeWidths.length === 2, beforeWidths.join(' / '))
ok('그 차이가 스크롤바 폭과 같다', Math.abs(beforeWidths[0] - beforeWidths[1]) === 10, `${Math.abs(beforeWidths[0] - beforeWidths[1])}px`)

/* ── 2. 모달 — Radix 스크롤 락이 폭을 흔들지 않는가 ─────────────────────── */
console.log('\n[모달을 열었을 때 폭 유지]')

const managerToken = await page.evaluate(async (api) => {
  const res = await fetch(api + '/api/__dev/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager01' }),
  })
  const { token } = await res.json()
  sessionStorage.setItem('token', token)
  return token
}, API)

const list = await page.evaluate(
  async ([api, t]) => {
    const res = await fetch(api + '/api/posts?page=1&size=50', { headers: { Authorization: `Bearer ${t}` } })
    return (await res.json()).items
  },
  [API, managerToken],
)
const target = list.find((p) => p.author.startsWith('headcoach'))

await page.goto(B + `/board/${target.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const beforeModal = await page.evaluate(MEASURE)
await page.locator('[class*="ownerActions"] button', { hasText: '삭제' }).click()
await page.waitForTimeout(500)
const duringModal = await page.evaluate(MEASURE)
ok(
  '모달을 열어도 clientWidth 가 그대로',
  beforeModal.clientWidth === duringModal.clientWidth,
  `${beforeModal.clientWidth} → ${duringModal.clientWidth}`,
)
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const afterModal = await page.evaluate(MEASURE)
ok('닫아도 그대로', afterModal.clientWidth === beforeModal.clientWidth, `${afterModal.clientWidth}`)

/* ── 3. 스크린샷 — 썸이 트랙을 채우는가 ─────────────────────────────────── */
console.log('\n[스크린샷 — 우측 스크롤바]')

for (const theme of ['light', 'dark']) {
  for (const [path, label] of [
    ['/403', 'short'],
    ['/records', 'long'],
  ]) {
    await page.evaluate((t) => localStorage.setItem('theme', t), theme)
    await page.goto(B + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    // 우측 가장자리 24px 만 잘라 저장한다
    await page.screenshot({
      path: `${OUT}/sb-${theme}-${label}.png`,
      clip: { x: 1280 - 24, y: 0, width: 24, height: 900 },
    })
  }
}
console.log('    sb-{light,dark}-{short,long}.png 저장')

await page.close()

/* ── 4. 터치 기기는 제외되는가 ──────────────────────────────────────────── */
console.log('\n[터치 기기 — 스크롤바를 강제하지 않는다]')

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
})
await mobile.goto(B + '/', { waitUntil: 'networkidle' })
await mobile.waitForTimeout(600)
const m = await mobile.evaluate(MEASURE)
ok('폭을 그대로 다 쓴다 (오버레이 스크롤바)', m.clientWidth === 390, `${m.clientWidth}px`)
const coarse = await mobile.evaluate(() => matchMedia('(pointer: coarse)').matches)
ok('pointer: coarse 로 인식된다', coarse === true)
await mobile.close()

console.log('\n' + (fails === 0 ? '전 항목 통과' : `실패 ${fails}건`))
await browser.close()
process.exit(fails === 0 ? 0 : 1)
