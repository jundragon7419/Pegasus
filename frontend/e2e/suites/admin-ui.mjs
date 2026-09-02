/**
 * 관리자 · 활동내역 **화면** 검증.
 *
 * API 계약은 verify-admin-api.mjs 가 본다. 여기서는 화면이 그 계약을 제대로
 * 반영하는지 — 탭 노출, 카드 전환, URL 직접 접근 — 를 본다.
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const API = 'http://localhost:3001'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })

const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 140)))
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
    errs.push('console: ' + m.text().slice(0, 140))
  }
})

let fails = 0
const ok = (label, cond, extra = '') => {
  if (!cond) fails++
  console.log(`  ${cond ? '✓' : '✗'} ${label}${extra ? '  — ' + extra : ''}`)
}

const tokenFor = (username) =>
  page.evaluate(
    async ([api, u]) => {
      const res = await fetch(api + '/api/__dev/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u }),
      })
      return (await res.json()).token
    },
    [API, username],
  )

async function loginAs(username) {
  await page.goto(B + '/', { waitUntil: 'networkidle' })
  const token = await tokenFor(username)
  await page.evaluate((t) => sessionStorage.setItem('token', t), token)
  return token
}

const tabNames = () => page.getByRole('tab').allInnerTexts()
const openTab = async (name) => {
  await page.getByRole('tab', { name, exact: true }).click()
  await page.waitForTimeout(700)
}

/* ── 1. 탭 노출 ─────────────────────────────────────────────────────────── */
console.log('[탭 노출 — 권한 없는 탭은 렌더하지 않는다]')

await loginAs('manager01')
await page.goto(B + '/admin', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
let tabs = await tabNames()
ok('manager 는 2탭', tabs.join(',') === '멤버 승인,로스터', tabs.join(','))

await loginAs('president')
await page.goto(B + '/admin', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
tabs = await tabNames()
ok('staff 는 7탭 (스태프 탭 없음)', tabs.length === 7 && !tabs.includes('스태프'), tabs.join(','))

await loginAs('rootadmin')
await page.goto(B + '/admin', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
tabs = await tabNames()
ok('root 는 8탭 (스태프 포함)', tabs.length === 8 && tabs.includes('스태프'), tabs.join(','))

await loginAs('player01')
await page.goto(B + '/admin', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
ok('member 가 /admin → /403', new URL(page.url()).pathname === '/403', new URL(page.url()).pathname)

/* ── 2. 멤버 승인 흐름 ──────────────────────────────────────────────────── */
console.log('\n[멤버 승인]')

await loginAs('manager01')
await page.goto(B + '/admin', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)

const rowCount = () => page.locator('main tbody tr').count()
const before = await rowCount()
ok('승인 대기 목록이 여러 행', before >= 3, `${before}행`)

await page.locator('main tbody tr').first().getByRole('button', { name: '승인' }).click()
await page.waitForTimeout(1200)
ok('승인하면 목록에서 빠진다', (await rowCount()) === before - 1, `${before} → ${await rowCount()}`)

// 거부는 확인 모달을 거친다
await page.locator('main tbody tr').first().getByRole('button', { name: '거부' }).click()
await page.waitForTimeout(500)
const dialog = await page.getByRole('alertdialog').innerText()
ok('거부는 확인을 받는다', dialog.includes('거부'), dialog.split('\n')[0])
ok('로그에 기록된다고 알린다', dialog.includes('로그에 기록'))
await page.getByRole('button', { name: '거부', exact: true }).last().click()
await page.waitForTimeout(1200)
ok('거부하면 목록에서 빠진다', (await rowCount()) === before - 2, `${await rowCount()}행`)

/* ── 3. 로스터 (§12-17) ─────────────────────────────────────────────────── */
console.log('\n[로스터 — 학번으로 계정이 이어진다]')

await openTab('로스터')
const rosterRows = await rowCount()
ok('로스터 목록이 보인다', rosterRows > 0, `${rosterRows}행`)
const linked = await page.locator('main tbody tr a[href^="/user/"], main tbody tr a[href="/mypage"]').count()
ok('가입된 사람은 링크로 보인다', linked > 0, `${linked}건`)
ok('미가입 표시도 함께 있다', (await page.getByText('미가입').count()) > 0)

await page.getByLabel('등번호').fill('88')
await page.getByLabel('이름').fill('신재원')
await page.getByLabel('학번').fill('2022900211')
await page.getByLabel('기수').fill('20')
await page.getByRole('button', { name: '추가' }).click()
await page.waitForTimeout(1300)
ok('추가하면 행이 늘어난다', (await rowCount()) === rosterRows + 1, `${rosterRows} → ${await rowCount()}`)

// 같은 학번을 또 넣으면 409 가 인라인으로 뜬다
await page.getByLabel('등번호').fill('89')
await page.getByLabel('이름').fill('중복')
await page.getByLabel('학번').fill('2022900211')
await page.getByLabel('기수').fill('20')
await page.getByRole('button', { name: '추가' }).click()
await page.waitForTimeout(1200)
ok('중복 학번은 화면을 옮기지 않고 인라인으로 알린다',
  new URL(page.url()).pathname === '/admin' && (await page.getByRole('alert').count()) > 0,
  (await page.getByRole('alert').first().innerText()).slice(0, 30))

/* ── 4. 스태프 (root) ───────────────────────────────────────────────────── */
console.log('\n[스태프 — root 전용]')

await loginAs('rootadmin')
await page.goto(B + '/admin', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await openTab('스태프')
ok('스태프 구분 선택이 행마다 있다', (await page.locator('main select').count()) > 0)
const staffRowsBefore = await page.locator('main table').first().locator('tbody tr').count()
await page.locator('main table').last().locator('tbody tr').first().getByRole('button', { name: '임명' }).click()
await page.waitForTimeout(1300)
const staffRowsAfter = await page.locator('main table').first().locator('tbody tr').count()
ok('임명하면 현재 스태프가 늘어난다', staffRowsAfter === staffRowsBefore + 1, `${staffRowsBefore} → ${staffRowsAfter}`)

/* ── 5. 설정 ────────────────────────────────────────────────────────────── */
console.log('\n[설정 — 활성 연도 · 공휴일 동기화]')

await openTab('설정')
await page.getByRole('button', { name: '2025', exact: true }).click()
await page.waitForTimeout(1200)
ok('연도 변경 성공 메시지', (await page.getByText('활성 연도를 2025').count()) === 1)
await page.getByRole('button', { name: '2026', exact: true }).click()
await page.waitForTimeout(1200)

await page.getByRole('button', { name: '동기화' }).click()
await page.waitForTimeout(1300)
ok('공휴일 동기화 결과를 알린다', (await page.getByText(/공휴일 \d+건을 동기화/).count()) === 1)

/* ── 6. 활동 내역 · 로그 탭 (§12-2) ─────────────────────────────────────── */
console.log('\n[활동 내역 — 로그 탭은 권한이 있을 때만]')

await loginAs('manager01')
await page.goto(B + '/user/player01', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
tabs = await tabNames()
ok('manager 가 member 를 보면 로그 탭이 있다', tabs.includes('활동 로그'), tabs.join(','))

await loginAs('player02')
await page.goto(B + '/user/player01', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
tabs = await tabNames()
ok('동급끼리는 로그 탭이 없다', !tabs.includes('활동 로그'), tabs.join(','))
ok('게시글·댓글 탭은 보인다', tabs.length === 2, tabs.join(','))

await page.goto(B + '/user/nosuchuser', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
ok('없는 사용자 → /404', new URL(page.url()).pathname === '/404', new URL(page.url()).pathname)

/* ── 7. §12-11 로그 상세를 URL 로 연다 ─────────────────────────────────── */
console.log('\n[§12-11 — 로그 상세가 URL 로 열린다]')

const mgrToken = await loginAs('manager01')
const logs = await page.evaluate(
  async ([api, t]) => {
    const res = await fetch(api + '/api/users/player01/logs?size=50', {
      headers: { Authorization: `Bearer ${t}` },
    })
    return (await res.json()).items
  },
  [API, mgrToken],
)
const postLog = logs.find((l) => l.action.startsWith('post_'))
ok('게시글 로그가 있다', Boolean(postLog), postLog?.action)

// **주소창에 직접 입력**한다. 구 구현은 여기서 항상 실패했다
await page.goto(B + `/user/player01/log/${postLog.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
ok('URL 직접 접근으로 내용이 보인다', (await page.getByRole('heading', { level: 1 }).innerText()).length > 0,
  await page.getByRole('heading', { level: 1 }).innerText())
ok('"불러올 수 없습니다" 가 아니다', (await page.getByText('불러올 수 없').count()) === 0)

// **새로고침**해도 유지된다
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(900)
ok('새로고침해도 유지된다', new URL(page.url()).pathname === `/user/player01/log/${postLog.id}`)
ok('내용이 다시 그려진다', (await page.getByRole('heading', { level: 1 }).count()) === 1)

await loginAs('player02')
await page.goto(B + `/user/player01/log/${postLog.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
ok('권한 없으면 /403', new URL(page.url()).pathname === '/403', new URL(page.url()).pathname)

/* ── 8. 모바일 카드 전환 (§12-26) ───────────────────────────────────────── */
console.log('\n[모바일 — 관리자 표가 카드로 바뀐다]')

const mobile = await browser.newPage({ viewport: { width: 390, height: 900 } })
await mobile.goto(B + '/', { waitUntil: 'networkidle' })
// 토큰은 페이지 안에서 바로 심는다 — 여기서 다시 쓸 일이 없다
await mobile.evaluate(async (api) => {
  const res = await fetch(api + '/api/__dev/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'rootadmin' }),
  })
  sessionStorage.setItem('token', (await res.json()).token)
}, API)
await mobile.goto(B + '/admin', { waitUntil: 'networkidle' })
await mobile.waitForTimeout(1000)

const tableVisible = await mobile.locator('main table').first().isVisible().catch(() => false)
const cardCount = await mobile.locator('main li[class*="card"]').count()
ok('표는 숨고', tableVisible === false)
ok('카드가 그려진다', cardCount > 0, `${cardCount}장`)
const over = await mobile.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
)
ok('가로 넘침 없음', over <= 0, `${over}px`)
await mobile.close()

console.log('\n' + (errs.length ? '오류:\n  ' + errs.join('\n  ') : '콘솔 오류 없음'))
console.log(fails === 0 ? '전 항목 통과' : `실패 ${fails}건`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
