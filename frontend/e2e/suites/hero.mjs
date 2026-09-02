/** 히어로가 뷰포트별로 알맞은 변형을 받는지, 실제 전송량이 줄었는지 잰다. */
import { chromium } from 'playwright'
const B = 'http://localhost:5173'

const b = await chromium.launch({ headless: true })
let fails = 0
const ok = (l, c, x = '') => { if (!c) fails++; console.log(`  ${c ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`) }

for (const [w, label, expected] of [[390, '모바일 390px', 'hero-640.webp'], [1280, '데스크톱 1280px', 'hero-1317.webp']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 })
  const hits = []
  p.on('response', async (r) => {
    if (/hero.*\.(webp|jpg)/.test(r.url())) {
      let size = 0
      try { size = (await r.body()).length } catch { size = 0 }
      hits.push({ file: r.url().split('/').pop(), size })
    }
  })
  await p.goto(B + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)

  const total = hits.reduce((s, h) => s + h.size, 0)
  console.log(`\n[${label}]`)
  hits.forEach((h) => console.log(`    ${h.file}  ${(h.size / 1024).toFixed(1)}KB`))
  ok(`${expected} 를 받는다`, hits.some((h) => h.file === expected), hits.map((h) => h.file).join(',') || '(없음)')
  ok('JPEG 는 받지 않는다', !hits.some((h) => h.file.endsWith('.jpg')))
  ok('원본 207KB 보다 작다', total < 207 * 1024, `${(total / 1024).toFixed(1)}KB`)

  // 레이아웃이 그대로인지
  const box = await p.evaluate(() => {
    const el = document.querySelector('main div[class*="hero"]')
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(3) }
  })
  ok('비율이 1317/550 그대로', Math.abs(box.ratio - 1317 / 527) < 0.02, `${box.ratio} (기대 ${(1317 / 527).toFixed(3)})`)
  await p.close()
}
console.log('\n' + (fails === 0 ? '전 항목 통과' : `실패 ${fails}건`))
await b.close()
process.exit(fails === 0 ? 0 : 1)
