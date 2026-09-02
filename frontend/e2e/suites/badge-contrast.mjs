/**
 * 상태 배지 대비 측정.
 *
 * 팔레트를 늘리지 않기로 했으므로 기존 토큰이 실제로 읽히는지 확인해야 한다.
 *
 * 토큰이 전부 `rgba(--overlay-rgb, alpha)` 라서 **알파를 무시하면 안 된다.**
 * 요소부터 body 까지의 배경을 순서대로 합성한 뒤, 그 위에 글자색을 합성한다.
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5173', API = 'http://localhost:3001'
const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } })

const lum = ([r, g, bl]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl)
}
const ratio = (a, c) => {
  const [x, y] = [lum(a), lum(c)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
/** src(알파 포함)를 dst(불투명) 위에 올린다. */
const over = (src, dst) => dst.map((d, i) => Math.round(src[i] * src[3] + d * (1 - src[3])))

let fails = 0
const results = []

await p.goto(B + '/', { waitUntil: 'networkidle' })
const token = await p.evaluate(async (api) => {
  const r = await fetch(api + '/api/__dev/impersonate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'rootadmin' }),
  })
  const { token } = await r.json()
  sessionStorage.setItem('token', token)
  return token
}, API)

for (const theme of ['light', 'dark']) {
  await p.evaluate(([t, tk]) => { localStorage.setItem('theme', t); sessionStorage.setItem('token', tk) }, [theme, token])
  await p.goto(B + '/admin', { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)

  for (const tab of ['일반유저', '멤버', '차단 계정']) {
    await p.getByRole('tab', { name: tab, exact: true }).click()
    await p.waitForTimeout(800)

    const samples = await p.evaluate(() => {
      const rgba = (s) => {
        const n = s.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]
        return [n[0], n[1], n[2], n[3] ?? 1]
      }
      const out = []
      for (const el of document.querySelectorAll('main [class*="badge"], main [class*="Badge"]')) {
        // 요소 → body 까지의 배경을 바깥부터 안쪽으로 합성해야 하므로 순서를 뒤집어 모은다
        const layers = []
        for (let n = el; n; n = n.parentElement) layers.push(rgba(getComputedStyle(n).backgroundColor))
        layers.push(rgba(getComputedStyle(document.body).backgroundColor))
        out.push({ text: el.textContent.trim(), color: rgba(getComputedStyle(el).color), layers })
      }
      return out
    })

    const seen = new Set()
    for (const s of samples) {
      const key = `${theme}:${s.text}`
      if (seen.has(s.text) || results.some((r) => r.key === key)) continue
      seen.add(s.text)

      // 가장 바깥(불투명)부터 안쪽으로 합성한다
      let bg = [255, 255, 255]
      for (const layer of [...s.layers].reverse()) {
        if (layer[3] === 0) continue
        bg = layer[3] === 1 ? layer.slice(0, 3) : over(layer, bg)
      }
      const fg = s.color[3] === 1 ? s.color.slice(0, 3) : over(s.color, bg)
      const r = ratio(fg, bg)
      const pass = r >= 4.5
      if (!pass) fails++
      results.push({ key, line: `  ${pass ? '✓' : '✗'} ${theme.padEnd(5)} "${s.text}" ${r.toFixed(2)}:1` })
    }
  }
}

results.forEach((r) => console.log(r.line))
console.log(fails === 0 ? '\n전 배지 4.5:1 이상' : `\n미달 ${fails}건`)
await b.close()
process.exit(fails === 0 ? 0 : 1)
