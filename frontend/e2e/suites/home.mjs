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
const B='http://localhost:5173'

console.log('[히어로]')
await page.goto(B + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const hero = await page.evaluate(() => {
  const img = document.querySelector('main img')
  return img ? { loaded: img.complete && img.naturalWidth > 0, w: img.naturalWidth, alt: img.alt, fit: getComputedStyle(img).objectFit } : null
})
ok('히어로 이미지 로드', hero?.loaded === true, `${hero?.w}px, object-fit: ${hero?.fit}`)
ok('대체 텍스트에 문구 포함', (hero?.alt ?? '').includes('THINK WIN'))

console.log('\n[게시판 위젯]')
const rows = await page.locator('main section').first().locator('a[href^="/board/"]').count()
ok('8줄 채움', rows === 8, rows + '줄')
const divider = await page.locator('main [class*="pinnedDivider"]').count()
ok('고정글 구분선', divider === 1, divider + '개')
const types = await page.locator('main [class*="postType"]').allInnerTexts()
ok('유형 배지 표시', types.length === 8, types.slice(0,4).join(', ') + ' …')

console.log('\n[미니 캘린더]')
const cal = await page.evaluate(() => {
  const grid = document.querySelector('main div[class*="calendarGrid"]')
  if (!grid) return null
  const cells = [...grid.children].slice(7)
  const dayCells = cells.filter((c) => c.textContent.trim() !== '')
  return {
    total: cells.length,
    days: dayCells.length,
    multipleOf7: cells.length % 7 === 0,
    withDots: cells.filter((c) => c.querySelector('span[class*="dot"]')).length,
    today: !!grid.querySelector('[class*="cellToday"]'),
    red: grid.querySelectorAll('[class*="cellRed"]').length,
  }
})
const now = new Date()
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
ok('셀 수가 7의 배수', cal?.multipleOf7 === true, cal?.total + '칸')
ok('이번 달 일수와 일치', cal?.days === daysInMonth, `${cal?.days} (기대 ${daysInMonth})`)
ok('오늘 강조', cal?.today === true)
ok('일정 점 표시', (cal?.withDots ?? 0) > 0, cal?.withDots + '일')
ok('일요일·공휴일 빨강', (cal?.red ?? 0) > 0, cal?.red + '일')

console.log('\n[빈 상태 · 에러 상태]')
await page.goto(B + '/?mockEmpty=posts', { waitUntil: 'networkidle' }); await page.waitForTimeout(500)
ok('게시글 빈 상태', (await page.getByText('아직 게시글이 없습니다').count()) === 1)
await page.goto(B + '/?mockFail=schedule:500', { waitUntil: 'networkidle' }); await page.waitForTimeout(600)
ok('일정 에러 상태', (await page.getByText('일정을 불러오지 못했습니다').count()) === 1)
ok('조사 처리 정확 ("일정을")', (await page.getByText('일정를 불러오지 못했습니다').count()) === 0)

console.log('\n[모바일 375px]')
await page.setViewportSize({ width: 375, height: 812 })
await page.goto(B + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(600)
const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
ok('가로 넘침 없음', over <= 0, over > 0 ? over + 'px' : '')
const oneCol = await page.evaluate(() => {
  const el = document.querySelector('main div[class*="content"]')
  return el ? getComputedStyle(el).gridTemplateColumns.split(' ').length : 0
})
ok('모바일 1열', oneCol === 1, oneCol + '열')
const heroH = await page.evaluate(() => document.querySelector('main div[class*="hero"]').getBoundingClientRect().height)
ok('히어로 높이 적정', heroH >= 150 && heroH <= 400, heroH.toFixed(0) + 'px')

console.log('\n' + (errs.length ? '오류:\n  ' + errs.join('\n  ') : '콘솔 오류 없음'))
await browser.close()
process.exit(fails === 0 ? 0 : 1)
