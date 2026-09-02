/**
 * 반응형 통합 회귀 검사.
 *
 * 화면마다 따로 적으면 조합을 빠뜨린다(실제로 기록 화면의 기본 탭과 다크 테마를
 * 모바일에서 잰 적이 없었다). 폭 × 화면 × 탭 × 테마 × 로그인 상태를 한 번에 돈다.
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1024, 1440]
const THEMES = ['light', 'dark']

/** [경로, 라벨, 로그인 필요 여부] */
const PAGES = [
  ['/', '홈', false],
  ['/roster', '선수단', false],
  ['/records', '기록', false],
  ['/schedule', '일정', false],
  ['/schedule/write', '일정관리', true],
  ['/schedule/write?tab=edit', '일정관리·수정', true],
  ['/login', '로그인', false],
  ['/signup', '회원가입', false],
  ['/401', '401', false],
  ['/403', '403', false],
  ['/404', '404', false],
  ['/500', '500', false],
  ['/board', '게시판', true],
  ['/board/1000', '게시글', true],
  ['/board/write', '글쓰기', true],
  ['/mypage', '마이페이지', true],
  ['/mypage#settings', '마이페이지·설정', true],
  ['/admin', '관리자', true],
  ['/user/player01', '활동내역', true],
]

const SCAN = () => {
  const docW = document.documentElement.clientWidth
  const over = document.documentElement.scrollWidth - docW
  if (over <= 0) return { over: 0, culprits: [] }
  const culprits = [...document.querySelectorAll('*')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.right > docW + 0.5 || r.left < -0.5)
    .map(({ el, r }) => ({
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 44),
      L: Math.round(r.left),
      R: Math.round(r.right),
      w: Math.round(r.width),
      depth: (() => { let d = 0, n = el; while ((n = n.parentElement)) d++; return d })(),
    }))
    .sort((a, b) => a.depth - b.depth)
  return { over, culprits }
}

const browser = await chromium.launch({ headless: true })
let checks = 0
let fails = 0

async function check(page, label) {
  checks++
  const r = await page.evaluate(SCAN)
  if (r.over <= 0) return
  fails++
  console.log(`  ✗ ${label} — ${r.over}px 넘침`)
  for (const c of r.culprits.slice(0, 5)) {
    console.log(`       d${c.depth} <${c.tag} class="${c.cls}"> L${c.L} R${c.R} w${c.w}`)
  }
}

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 915 } })

  // 로그인 상태를 만든다 (매니저 — 헤더 메뉴가 가장 많다)
  await page.goto(B + '/', { waitUntil: 'networkidle' })
  const token = await page.evaluate(async () => {
    const res = await fetch('http://localhost:3001/api/__dev/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager01' }),
    })
    return (await res.json()).token
  })

  for (const theme of THEMES) {
    for (const [path, label, needsAuth] of PAGES) {
      await page.evaluate(
        ([t, tk, auth]) => {
          localStorage.setItem('theme', t)
          if (auth) sessionStorage.setItem('token', tk)
          else sessionStorage.removeItem('token')
          localStorage.removeItem('token')
        },
        [theme, token, needsAuth],
      )

      await page.goto(B + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      await check(page, `${width}px ${theme} ${label}`)

      // 기록은 탭마다 렌더가 다르다 — 기본 탭만 재면 나머지를 놓친다
      if (path === '/records') {
        for (const tab of ['타자', '투수']) {
          await page.getByRole('tab', { name: tab, exact: true }).click()
          await page.waitForTimeout(300)
          await check(page, `${width}px ${theme} 기록·${tab}`)
        }
      }
    }

    // 로그인 상태의 헤더는 항목이 가장 많다. 별도로 확인한다
    await page.evaluate((tk) => sessionStorage.setItem('token', tk), token)
    await page.goto(B + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await check(page, `${width}px ${theme} 홈(로그인·매니저)`)
  }

  await page.close()
  process.stdout.write(`  ${width}px 완료\n`)
}

console.log(`\n${checks}개 조합 검사 — ${fails === 0 ? '가로 넘침 없음' : `넘침 ${fails}건`}`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
