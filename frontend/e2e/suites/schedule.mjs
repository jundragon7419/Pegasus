import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 130)))
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
    errs.push('console: ' + m.text().slice(0, 130))
  }
})

let fails = 0
const ok = (l, c, x = '') => {
  if (!c) fails++
  console.log(`  ${c ? '✓' : '✗'} ${l}${x ? '  — ' + x : ''}`)
}

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
    sessionStorage.setItem('token', (await res.json()).token)
  }, username)
}

const now = new Date()
const y = now.getFullYear()
const mm = String(now.getMonth() + 1).padStart(2, '0')
const label = () => page.locator('button[class*="monthLabel"]').first().innerText()

/* ── 권한 ────────────────────────────────────────────────────────────────── */
console.log('[권한]')
await loginAs(null)
await page.goto(B + '/schedule', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
ok('비로그인은 "일정 추가" 버튼이 없음', (await page.getByRole('link', { name: /일정 추가/ }).count()) === 0)

await loginAs('player01')
await page.goto(B + '/schedule/write', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
ok('member 가 /schedule/write → /403', new URL(page.url()).pathname === '/403')

await loginAs('manager01')
await page.goto(B + '/schedule', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
ok('manager 는 "일정 추가" 버튼 노출', (await page.getByRole('link', { name: /일정 추가/ }).count()) === 1)

/* ── 캘린더 ──────────────────────────────────────────────────────────────── */
console.log('\n[캘린더]')
ok('이번 달로 시작', (await label()) === `${y}. ${mm}`, await label())
ok('현재 월에서는 "오늘" 버튼이 없음', (await page.getByRole('button', { name: '오늘' }).count()) === 0)

await page.getByRole('button', { name: '다음 달' }).click()
await page.waitForTimeout(400)
ok('다른 달에서는 "오늘" 버튼 노출', (await page.getByRole('button', { name: '오늘' }).count()) === 1)
await page.getByRole('button', { name: '오늘' }).click()
await page.waitForTimeout(400)
ok('"오늘" 로 복귀', (await label()) === `${y}. ${mm}`)

await page.locator('button[class*="monthLabel"]').first().click()
await page.waitForTimeout(400)
ok('연·월 피커 열림', (await page.getByRole('button', { name: '3월', exact: true }).count()) === 1)
await page.getByRole('button', { name: '3월', exact: true }).click()
await page.waitForTimeout(400)
ok('월 선택 반영', (await label()).endsWith('03'), await label())

// 픽스처는 현재 월 ±1 에만 일정을 만든다. 칩은 이번 달에서 확인한다
await page.locator('button[class*="monthLabel"]').first().click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: `${now.getMonth() + 1}월`, exact: true }).click()
await page.waitForTimeout(700)

ok('일정 칩 렌더', (await page.locator('main span[class*="chip"]').count()) > 0)
const chipType = await page.locator('main span[class*="chipType"]').first().innerText()
ok('칩에 유형 라벨이 있음 (색만으로 구분하지 않음)', ['훈련', '회의', '행사', '기타'].includes(chipType), chipType)

/* ── 등록: bulk 요청 1회 ─────────────────────────────────────────────────── */
console.log('\n[등록 — 날짜 범위 7일]')
await page.goto(B + '/schedule/write', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)

const posts = []
page.on('request', (r) => {
  if (r.method() === 'POST' && r.url().includes('/api/events')) posts.push(r.url())
})

await page.getByLabel('시작일').fill(`${y}-07-01`)
await page.getByLabel('종료일').fill(`${y}-07-07`)
await page.getByLabel('일정 이름').fill('여름 집중훈련')
ok('버튼이 총 건수를 보여줌', (await page.getByRole('button', { name: /7건 등록/ }).count()) === 1)
await page.getByRole('button', { name: /7건 등록/ }).click()
await page.waitForTimeout(1400)
ok('요청이 1회 (구 구현은 7회)', posts.length === 1, `${posts.length}회`)
ok('전부 성공하면 /schedule 로 이동', new URL(page.url()).pathname === '/schedule')

/* ── 409 인라인 ──────────────────────────────────────────────────────────
   목의 쓰기 상태는 새로고침하면 초기 픽스처로 돌아간다. 그래서 방금 만든 일정이
   아니라 **픽스처에 원래 있는 일정**으로 중복을 시험한다. */
console.log('\n[중복 등록 — 409 인라인]')
await page.goto(B + '/schedule/write', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.getByLabel('시작일').fill(`${y}-${mm}-04`)
await page.getByLabel('종료일').fill(`${y}-${mm}-04`)
await page.getByLabel('일정 이름').fill('주말 정기훈련')
await page.getByRole('button', { name: /1건 등록/ }).click()
await page.waitForTimeout(1400)
ok('화면이 바뀌지 않음', new URL(page.url()).pathname === '/schedule/write')
const alertText = await page.getByRole('alert').innerText()
ok('실패 건이 목록으로 표시됨', alertText.includes('1건 실패') && alertText.includes('이미 존재'), alertText.split('\n')[0])
ok('입력한 값이 그대로 남음', (await page.getByLabel('일정 이름').inputValue()) === '주말 정기훈련')

/* ── 수정 · 삭제 ─────────────────────────────────────────────────────────── */
console.log('\n[수정 · 삭제]')
await page.goto(B + '/schedule/write?tab=edit', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.getByRole('button', { name: `${now.getMonth() + 1}월`, exact: true }).click()
await page.waitForTimeout(700)
const countRows = () => page.locator('main input[type="date"]').count()
const rowsBefore = await countRows()
ok('이번 달 목록에 일정이 보임', rowsBefore > 0, rowsBefore + '행')

ok('변경 전에는 저장 버튼이 비활성', await page.getByRole('button', { name: '저장' }).first().isDisabled())
await page.getByLabel('일정 이름').first().fill('주말 정기훈련(변경)')
await page.waitForTimeout(250)
await page.getByRole('button', { name: '저장' }).first().click()
await page.waitForTimeout(1400)
ok('수정 반영', (await page.getByLabel('일정 이름').first().inputValue()).includes('변경'))

await page.getByRole('button', { name: '일정 삭제' }).first().click()
await page.waitForTimeout(700)
ok('삭제 확인 모달', (await page.getByRole('alertdialog').count()) === 1)
await page.getByRole('button', { name: '삭제', exact: true }).click()
await page.waitForTimeout(1400)
const rowsAfter = await countRows()
ok('삭제 후 행이 줄어듦', rowsAfter === rowsBefore - 1, `${rowsBefore} → ${rowsAfter}`)

console.log('\n' + (errs.length ? '오류:\n  ' + errs.join('\n  ') : '콘솔 오류 없음'))
console.log(fails === 0 ? '전 항목 통과' : `실패 ${fails}건`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
