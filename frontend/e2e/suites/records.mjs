import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 140)))
page.on('console', (m) => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('console: '+m.text().slice(0,140)) })
let fails = 0
const ok = (l, p, x = '') => {
  if (!p) fails++
  console.log(`  ${p ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`)
}
const B = 'http://localhost:5173'

console.log('[팀 탭 · 포디움]')
await page.goto(B + '/records', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
ok('시즌 표기가 active-year 참조', (await page.locator('main p').first().innerText()).includes('2026'))
const podiumCards = await page.locator('main [class*="podiumCard"]').count()
ok('포디움 카드 6장 (타자3+투수3)', podiumCards === 6, podiumCards + '장')
const medals = await page.locator('main [class*="medalLabel"]').allInnerTexts()
ok('메달 라벨', medals.join(',') === '1ST,2ND,3RD,1ST,2ND,3RD', medals.join(','))

console.log('\n[타자 탭]')
await page.getByRole('tab', { name: '타자' }).click()
await page.waitForTimeout(300)
const cols = await page.locator('main thead th').count()
const rows = await page.locator('main tbody tr').count()
ok('컬럼 22개', cols === 22, cols + '개')
ok('행 22개', rows === 22, rows + '행')

const firstCell = () => page.locator('main tbody tr').first().locator('td').nth(1).innerText()
const beforeSort = await firstCell()
await page.locator('main thead th').nth(1).click()   // oWAR 재클릭 → asc
await page.waitForTimeout(200)
const afterSort = await firstCell()
ok('정렬 방향 토글 (desc↔asc)', beforeSort !== afterSort, `${beforeSort} → ${afterSort}`)

console.log('\n[규정타석 필터]')
await page.getByText('규정타석 이상만').click()
await page.waitForTimeout(250)
const filtered = await page.locator('main tbody tr').count()
ok('행이 줄어듦', filtered === 19, `22 → ${filtered} (기대 19)`)
await page.getByText('규정타석 이상만').click()
await page.waitForTimeout(250)

console.log('\n[투수 탭]')
await page.getByRole('tab', { name: '투수' }).click()
await page.waitForTimeout(300)
const pcols = await page.locator('main thead th').count()
const prows = await page.locator('main tbody tr').count()
ok('컬럼 19개', pcols === 19, pcols + '개')
ok('행 12개', prows === 12, prows + '행')
await page.getByText('규정이닝 이상만').click()
await page.waitForTimeout(250)
ok('규정이닝 필터', (await page.locator('main tbody tr').count()) === 9, `12 → ${await page.locator('main tbody tr').count()} (기대 9)`)

console.log('\n[미해결 항목 ③ — 둥근 모서리 + sticky 이름 열 @375px]')
await page.setViewportSize({ width: 375, height: 812 })
await page.goto(B + '/records', { waitUntil: 'networkidle' })
await page.getByRole('tab', { name: '타자' }).click()
await page.waitForTimeout(500)

const pageOver = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
ok('페이지 가로 넘침 없음', pageOver <= 0, pageOver > 0 ? pageOver + 'px' : '')

const scrollable = await page.evaluate(() => {
  const el = document.querySelector('main div[class*="tableScroll"]')
  return el ? { canScroll: el.scrollWidth > el.clientWidth, w: el.scrollWidth, c: el.clientWidth } : null
})
ok('테이블 컨테이너는 가로 스크롤 가능', scrollable?.canScroll === true, `${scrollable?.w} > ${scrollable?.c}`)

const radius = await page.evaluate(() => {
  const el = document.querySelector('main div[class*="tableFrame"]')
  return el ? { radius: getComputedStyle(el).borderTopLeftRadius, overflow: getComputedStyle(el).overflowX } : null
})
ok('모서리 라운딩 적용', radius?.radius !== '0px', `${radius?.radius}, overflow-x: ${radius?.overflow}`)

const sticky = await page.evaluate(async () => {
  const scroll = document.querySelector('main div[class*="tableScroll"]')
  const nameCell = document.querySelector('main tbody tr td[class*="nameCell"]')
  const before = nameCell.getBoundingClientRect().left
  scroll.scrollLeft = 400
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const after = nameCell.getBoundingClientRect().left
  return { before, after, scrolled: scroll.scrollLeft }
})
ok('스크롤 후에도 이름 열 고정', Math.abs(sticky.before - sticky.after) < 2,
   `left ${sticky.before.toFixed(0)} → ${sticky.after.toFixed(0)} (scrollLeft ${sticky.scrolled})`)

console.log('\n[다크 테마]')
await page.evaluate(() => localStorage.setItem('theme', 'dark'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
ok('다크 적용', bg.includes('1, 17, 38'), bg)
const medalColor = await page.evaluate(() => {
  const el = document.querySelector('main [class*="podiumCard"]')
  return el ? getComputedStyle(el).color : null
})
ok('메달 색이 다크용으로 바뀜', medalColor === 'rgb(208, 180, 115)', medalColor)
await page.evaluate(() => localStorage.setItem('theme', 'light'))

console.log('\n' + (errs.length ? '오류:\n  ' + errs.join('\n  ') : '콘솔 오류 없음'))
await browser.close()
process.exit(fails === 0 ? 0 : 1)
