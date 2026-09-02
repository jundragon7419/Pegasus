import { chromium } from 'playwright'
const B = 'http://localhost:5173'
const API = 'http://localhost:3001'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
let fails = 0
const ok = (l, c, x = '') => { if (!c) fails++; console.log(`  ${c ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`) }

await page.goto(B + '/', { waitUntil: 'networkidle' })
await page.evaluate(async (api) => {
  const res = await fetch(api + '/api/__dev/impersonate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'player01' }),
  })
  sessionStorage.setItem('token', (await res.json()).token)
}, API)

for (const [path, label] of [['/board/999999', '없는 글'], ['/board/999999/edit', '없는 글 수정']]) {
  await page.goto(B + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  ok(`${label} → /404`, new URL(page.url()).pathname === '/404', new URL(page.url()).pathname)
}
console.log(fails === 0 ? '통과' : `실패 ${fails}건`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
