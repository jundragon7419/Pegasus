/**
 * 좁은 데스크톱 폭 회귀.
 *
 * 스크롤바가 10px 을 가져가면 320px 창에서 콘텐츠 폭은 310px 이 된다.
 * 통합 스윕은 헤드리스(오버레이 스크롤바)라 이 손실을 재현하지 못하므로
 * 여기서만 headed 로 좁은 폭을 따로 잰다.
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const API = 'http://localhost:3001'
const SCAN = () => {
  const docW = document.documentElement.clientWidth
  const over = document.documentElement.scrollWidth - docW
  if (over <= 0) return { over: 0, docW, culprits: [] }
  const culprits = [...document.querySelectorAll('*')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.right > docW + 0.5 || r.left < -0.5)
    .map(({ el, r }) => `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 40)}"> R${Math.round(r.right)}`)
  return { over, docW, culprits: culprits.slice(0, 4) }
}

const browser = await chromium.launch({ headless: false })
let fails = 0

for (const width of [320, 360, 375, 412, 768]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto(B + '/', { waitUntil: 'networkidle' })
  const token = await page.evaluate(async (api) => {
    const res = await fetch(api + '/api/__dev/impersonate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager01' }),
    })
    return (await res.json()).token
  }, API)

  for (const theme of ['light', 'dark']) {
    for (const path of ['/', '/roster', '/records', '/schedule', '/board', '/board/1000', '/board/write', '/login', '/403']) {
      await page.evaluate(([t, tk]) => {
        localStorage.setItem('theme', t)
        sessionStorage.setItem('token', tk)
      }, [theme, token])
      await page.goto(B + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(350)
      const r = await page.evaluate(SCAN)
      if (r.over > 0) {
        fails++
        console.log(`  ✗ ${width}px ${theme} ${path} — ${r.over}px 넘침 (clientWidth ${r.docW})`)
        r.culprits.forEach((c) => console.log(`       ${c}`))
      }
    }
  }
  const cw = await page.evaluate(() => document.documentElement.clientWidth)
  console.log(`  ${width}px 완료 — clientWidth ${cw}`)
  await page.close()
}

console.log(fails === 0 ? '\n좁은 폭에서도 가로 넘침 없음' : `\n넘침 ${fails}건`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
