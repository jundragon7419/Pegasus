import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

const codes = []
page.on('console', (m) => {
  const hit = /인증번호: (\d{6})/.exec(m.text())
  if (hit) codes.push(hit[1])
})
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)))

let fails = 0
const ok = (l, p, x = '') => {
  if (!p) fails++
  console.log(`  ${p ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`)
}

/** 라벨은 필수 표시 * 때문에 불안정하다. name 으로 잡는다. */
const field = (name) => page.locator(`input[name="${name}"]`)

/** 해당 입력에 aria-describedby 로 연결된 메시지. */
async function msg(name) {
  return field(name).evaluate((el) => {
    const id = el.getAttribute('aria-describedby')
    return id ? (document.getElementById(id)?.textContent ?? '') : ''
  })
}

const submitBtn = () => page.getByRole('button', { name: /가입하기|가입 중/ })

await page.goto(B + '/signup', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)

console.log('[제출 차단]')
ok('이메일 인증 전에는 가입 버튼 비활성', await submitBtn().isDisabled())
ok('안내 문구 노출', (await page.getByText('이메일 인증을 완료해야').count()) === 1)

console.log('\n[아이디 중복 확인]')
await field('username').fill('player01')
await page.getByRole('button', { name: '중복확인' }).click()
await page.waitForTimeout(600)
ok('이미 쓰는 아이디 → 필드 인라인', (await msg('username')).includes('이미 사용 중'), await msg('username'))
ok('화면이 바뀌지 않음', new URL(page.url()).pathname === '/signup')

await field('username').fill('ab')
await page.getByRole('button', { name: '중복확인' }).click()
await page.waitForTimeout(300)
ok('짧은 아이디 → 형식 오류', (await msg('username')).includes('5~15'), await msg('username'))

await field('username').fill('newmember01')
await page.getByRole('button', { name: '중복확인' }).click()
await page.waitForTimeout(600)
ok('사용 가능 → 성공 문구', (await msg('username')).includes('사용할 수 있는'), await msg('username'))

console.log('\n[이메일 인증]')
await field('email').fill('player01@example.com')
await page.getByRole('button', { name: '발송' }).click()
await page.waitForTimeout(700)
ok('중복 이메일 → 409 인라인', (await msg('email')).includes('이미 사용 중'), await msg('email'))

await field('email').fill('brandnew@example.com')
await page.getByRole('button', { name: '발송' }).click()
await page.waitForTimeout(800)
ok('인증번호 발송', codes.length > 0, codes.at(-1) ?? '(콘솔에서 코드를 찾지 못함)')
ok('인증번호 입력칸 노출', (await field('emailCode').count()) === 1)

await field('emailCode').fill('000000')
await page.getByRole('button', { name: '인증' }).click()
await page.waitForTimeout(600)
ok('틀린 코드 → 인라인 오류', (await msg('emailCode')).includes('올바르지 않'), await msg('emailCode'))

await field('emailCode').fill(codes.at(-1) ?? '')
await page.getByRole('button', { name: '인증' }).click()
await page.waitForTimeout(700)
ok('올바른 코드 → 인증 완료', (await msg('email')).includes('인증이 완료'), await msg('email'))

console.log('\n[비밀번호 검증은 제출 시]')
await field('password').fill('abcd1234')
await field('passwordConfirm').fill('abcd1234')
await submitBtn().click()
await page.waitForTimeout(600)
ok('약한 비밀번호 → 필드 인라인', (await msg('password')).includes('특수문자'), await msg('password'))
ok('화면이 바뀌지 않음', new URL(page.url()).pathname === '/signup')

await field('password').fill('Newbie!2026')
await field('passwordConfirm').fill('Newbie!2027')
await submitBtn().click()
await page.waitForTimeout(500)
ok('비밀번호 불일치 → 인라인', (await msg('passwordConfirm')).includes('일치하지'), await msg('passwordConfirm'))

await field('passwordConfirm').fill('Newbie!2026')
await submitBtn().click()
await page.waitForTimeout(1000)
ok('가입 성공 → 로그인 화면으로', new URL(page.url()).pathname === '/login')

console.log('\n[가입한 계정으로 로그인]')
await field('username').fill('newmember01')
await field('password').fill('Newbie!2026')
await page.getByRole('button', { name: /로그인/ }).last().click()
await page.waitForTimeout(1000)
ok('로그인 성공', new URL(page.url()).pathname === '/')
ok('새 계정은 basic 권한', (await page.locator('header').innerText()).includes('일반'))

console.log('\n[§12-3 — 이메일 미인증 가입 차단]')
const direct = await page.evaluate(async () => {
  const res = await fetch('http://localhost:3001/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'bypasser1',
      password: 'Bypass!2026',
      email: 'never-verified@example.com',
    }),
  })
  return { status: res.status, body: await res.text() }
})
ok(
  'API 직접 호출로도 가입 불가',
  direct.status === 400 && direct.body.includes('이메일 인증'),
  `${direct.status} ${direct.body.slice(0, 60)}`,
)

console.log('\n' + (errs.length ? '페이지 예외:\n  ' + errs.join('\n  ') : '페이지 예외 없음'))
console.log(fails === 0 ? '전 항목 통과' : `실패 ${fails}건`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
