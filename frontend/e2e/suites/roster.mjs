import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 140)))
page.on('console', (m) => { if (m.type()==='error' && !/503|Failed to load resource/.test(m.text())) errs.push('console: '+m.text().slice(0,140)) })
let fails = 0
const ok = (l, p, x = '') => {
  if (!p) fails++
  console.log(`  ${p ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`)
}
const B = 'http://localhost:5173'
const cards = () => page.locator('main article').count()

console.log('[정상 로드]')
await page.goto(B + '/roster', { waitUntil: 'networkidle' })
const n = await cards()
ok('카드 렌더', n === 40, `${n}장 (기대 40)`)
ok('시즌 표기', (await page.locator('main p').first().innerText()).includes('2026'))
const count = await page.locator('main p').nth(1).innerText()
ok('인원 표시', count.includes('40'), count)

console.log('\n[연도 전환]')
await page.getByRole('button', { name: '2025', exact: true }).click()
await page.waitForTimeout(700)
const n2025 = await cards()
ok('2025 로 전환', n2025 === 32, `${n2025}장 (기대 32)`)
await page.getByRole('button', { name: '2026', exact: true }).click()
await page.waitForTimeout(700)

console.log('\n[역할 필터]')
for (const [label, expect] of [['선수', 32], ['감독 · 회장', 2], ['매니저', 3], ['영구결번', 3]]) {
  await page.getByRole('button', { name: label, exact: true }).click()
  await page.waitForTimeout(150)
  const c = await cards()
  ok(`${label}`, c === expect, `${c}장 (기대 ${expect})`)
}
await page.getByRole('button', { name: '전체', exact: true }).click()
await page.waitForTimeout(150)

console.log('\n[검색]')
const firstName = await page.locator('main article span').nth(1).innerText()
await page.getByLabel('선수 이름 또는 등번호 검색').fill(firstName)
await page.waitForTimeout(200)
const searched = await cards()
ok(`"${firstName}" 검색`, searched >= 1 && searched < 40, `${searched}장`)
await page.getByLabel('선수 이름 또는 등번호 검색').fill('존재하지않는이름')
await page.waitForTimeout(200)
ok('결과 없음 → 빈 상태', (await page.locator('main [role]').count()) >= 0 && (await page.getByText('조건에 맞는 선수가 없습니다').count()) === 1)

console.log('\n[빈 상태 · 에러 상태]')
await page.goto(B + '/roster?mockEmpty=roster', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
ok('mockEmpty → 빈 상태', (await page.getByText(/명단이 없습니다/).count()) === 1)
await page.goto(B + '/roster?mockFail=roster:500', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
ok('mockFail → 에러 상태', (await page.getByText('선수단 명단을 불러오지 못했습니다').count()) === 1)
ok('다시 시도 버튼', (await page.getByRole('button', { name: '다시 시도' }).count()) === 1)

console.log('\n[모바일 375px]')
await page.setViewportSize({ width: 375, height: 812 })
await page.goto(B + '/roster', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
ok('가로 넘침 없음', over <= 0, over > 0 ? over + 'px' : '')
const cols = await page.evaluate(() => {
  const g = document.querySelector('main div[class*="grid"]')
  return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0
})
ok('모바일 2열', cols === 2, cols + '열')

console.log('\n' + (errs.length ? '오류:\n  ' + errs.join('\n  ') : '콘솔 오류 없음'))
await browser.close()
process.exit(fails === 0 ? 0 : 1)
