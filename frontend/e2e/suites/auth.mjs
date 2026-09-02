import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)))

let fails = 0
const ok = (l, p, x = '') => {
  if (!p) fails++
  console.log(`  ${p ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`)
}

/** 목의 개발 전용 엔드포인트로 해당 계정 토큰을 받아 심는다. */
async function loginAs(username) {
  await page.goto(B + '/', { waitUntil: 'networkidle' })
  if (username === null) {
    await page.evaluate(() => {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
    })
    return
  }
  await page.evaluate(async (u) => {
    const res = await fetch('http://localhost:3001/api/__dev/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u }),
    })
    const { token } = await res.json()
    localStorage.removeItem('token')
    sessionStorage.setItem('token', token)
  }, username)
}

/** 이동 후 최종 경로를 돌려준다. */
async function land(path) {
  await page.goto(B + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(450)
  return new URL(page.url()).pathname
}

/**
 * **실제로 존재하는 글 id 를 쓴다.**
 *
 * 예전에는 `/board/12` 처럼 없는 id 를 하드코딩했는데, 지금은 없는 글이면
 * `/404` 로 보내므로(의도한 동작) 권한 검사가 아니라 리소스 존재 여부를 재게 된다.
 * 두 가지가 섞이면 "권한이 막았는지 글이 없어서인지" 구분할 수 없다.
 */
await page.goto(B + '/', { waitUntil: 'networkidle' })
/** 아무나 열 수 있는 글(본문 조회용)과 **player01 이 쓴 글**(수정 권한용). */
const { anyPost, ownPost } = await page.evaluate(async () => {
  const r = await fetch('http://localhost:3001/api/__dev/impersonate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'player01' }),
  })
  const { token } = await r.json()
  const res = await fetch('http://localhost:3001/api/posts?page=1&size=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const items = (await res.json()).items
  return {
    anyPost: items[0].id,
    ownPost: items.find((p) => p.author.startsWith('player01')).id,
  }
})

/* ── §4.4 · §6.1 기대표 ────────────────────────────────────────────────────
   값은 도달해야 하는 최종 경로. '=' 는 요청한 경로 그대로(통과)를 뜻한다. */
const N = '/401' // 비로그인
const F = '/403' // 권한 부족
const P = '=' //    통과

const ROUTES = [
  ['/board', 'basic+'],
  [`/board/${anyPost}`, 'member+'],
  ['/board/write', 'member+'],
  [`/board/${ownPost}/edit`, '소유자만'],
  ['/user/player01', 'member+'],
  ['/schedule/write', 'manager+'],
  ['/admin', 'manager+'],
  ['/user/player01/log/3', 'manager+'],
  ['/mypage', '로그인'],
]

/*
   `edit` 열은 **player01 이 쓴 글**의 수정 화면이다.
   §12-7 로 수정은 소유자만 가능하므로 매니저·스태프·root 도 403 이다 —
   권한이 높다고 남의 글을 고칠 수 있는 게 아니다. 삭제만 manager+ 가 할 수 있다. */
//                 board  detail write  edit   user   sched  admin  log    mypage
const EXPECTED = {
  '비로그인': [N, N, N, N, N, N, N, N, N],
  newbie: [P, F, F, F, F, F, F, F, P],
  player01: [P, P, P, P, P, F, F, F, P],
  manager01: [P, P, P, F, P, P, P, P, P],
  president: [P, P, P, F, P, P, P, P, P],
  rootadmin: [P, P, P, F, P, P, P, P, P],
}

const ACCOUNTS = [
  [null, '비로그인'],
  ['newbie', 'newbie'],
  ['player01', 'player01'],
  ['manager01', 'manager01'],
  ['president', 'president'],
  ['rootadmin', 'rootadmin'],
]

console.log('===== §4.4 권한 매트릭스 워크스루 =====')
for (const [account, label] of ACCOUNTS) {
  await loginAs(account)
  const expected = EXPECTED[label]
  const results = []
  let rowOk = true

  for (let i = 0; i < ROUTES.length; i++) {
    const [path] = ROUTES[i]
    const landed = await land(path)
    const want = expected[i] === P ? path : expected[i]
    const good = landed === want
    if (!good) rowOk = false
    results.push(good ? '·' : `${path}→${landed}(기대 ${want})`)
  }

  if (rowOk) console.log(`  ✓ ${label.padEnd(10)} 9개 라우트 전부 기대대로`)
  else {
    fails++
    console.log(`  ✗ ${label}`)
    results.filter((r) => r !== '·').forEach((r) => console.log(`       ${r}`))
  }
}

console.log('\n===== 헤더 메뉴 =====')
for (const [account, label] of ACCOUNTS) {
  await loginAs(account)
  await page.goto(B + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const menu = await page.locator('header nav a').allInnerTexts()
  const expected =
    account === null
      ? ['홈', '일정', '선수단', '기록']
      : ['manager01', 'president', 'rootadmin'].includes(account)
        ? ['홈', '일정', '선수단', '기록', '게시판', '관리자', '마이페이지']
        : ['홈', '일정', '선수단', '기록', '게시판', '마이페이지']
  ok(`${label.padEnd(10)} ${menu.join(' · ')}`, JSON.stringify(menu) === JSON.stringify(expected))
}

console.log('\n===== 로그인 화면 =====')
await loginAs(null)
await page.goto(B + '/login', { waitUntil: 'networkidle' })
await page.getByLabel('아이디').fill('player01')
await page.getByLabel('비밀번호').fill('틀린비밀번호1!')
await page.getByRole('button', { name: '로그인' }).click()
await page.waitForTimeout(700)
ok('실패 시 화면이 바뀌지 않음', new URL(page.url()).pathname === '/login')
ok('오류가 인라인으로 표시됨', (await page.getByRole('alert').count()) === 1)
ok('입력이 보존됨', (await page.getByLabel('아이디').inputValue()) === 'player01')
const msg = await page.getByRole('alert').innerText()
ok('아이디 존재 여부를 노출하지 않음', !msg.includes('없는') && msg.includes('아이디 또는 비밀번호'), msg.trim())

await page.getByLabel('비밀번호').fill('Pegasus!2026')
await page.getByRole('button', { name: '로그인' }).click()
await page.waitForTimeout(900)
ok('성공 시 홈으로', new URL(page.url()).pathname === '/')
ok('미체크 시 sessionStorage 사용', await page.evaluate(() => sessionStorage.getItem('token') !== null && localStorage.getItem('token') === null))

console.log('\n===== returnTo 복귀 =====')
await loginAs(null)
const landed = await land('/admin')
ok('비로그인이 /admin → /401', landed === '/401')
// 헤더에도 로그인 링크가 있으므로 본문 안의 것을 집는다
  await page.locator('main').getByRole('link', { name: '로그인' }).click()
await page.waitForTimeout(500)
ok('로그인 링크가 returnTo 전달', page.url().includes('returnTo=%2Fadmin'))
await page.getByLabel('아이디').fill('manager01')
await page.getByLabel('비밀번호').fill('Pegasus!2026')
await page.getByLabel('자동 로그인').click()
await page.getByRole('button', { name: '로그인' }).click()
await page.waitForTimeout(900)
ok('로그인 후 /admin 으로 복귀', new URL(page.url()).pathname === '/admin')
ok('자동 로그인 체크 시 localStorage 사용', await page.evaluate(() => localStorage.getItem('token') !== null))

console.log('\n===== 새로고침 후 세션 유지 =====')
await page.goto(B + '/mypage', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
ok('/mypage 유지', new URL(page.url()).pathname === '/mypage')
ok('헤더에 사용자 표시', (await page.locator('header').innerText()).includes('manager01'))

console.log('\n' + (errs.length ? '페이지 예외:\n  ' + errs.join('\n  ') : '페이지 예외 없음'))
console.log(fails === 0 ? '전 항목 통과' : `실패 ${fails}건`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
