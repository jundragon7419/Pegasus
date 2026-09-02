/**
 * 마이페이지 검증.
 *
 * 목의 쓰기 상태는 탭 메모리에만 산다. `loginAs` 는 페이지를 리로드해 상태를
 * 초기화하므로, 이어서 확인해야 하는 것들은 토큰만 바꿔 가며 한 페이지에서 한다.
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const API = 'http://localhost:3001'
const PW = 'Pegasus!2026'

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
  if (username === null) {
    await page.evaluate(() => {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
    })
    return null
  }
  const token = await tokenFor(username)
  await page.evaluate((t) => sessionStorage.setItem('token', t), token)
  return token
}

async function callApi(path, { token = null, method = 'GET', body = null } = {}) {
  return page.evaluate(
    async ([api, p, t, m, b]) => {
      const headers = {}
      if (t) headers.Authorization = `Bearer ${t}`
      if (b) headers['Content-Type'] = 'application/json'
      const res = await fetch(api + p, { method: m, headers, body: b ? JSON.stringify(b) : undefined })
      let data = null
      try { data = await res.json() } catch { data = null }
      return { status: res.status, data }
    },
    [API, path, token, method, body],
  )
}

const openTab = async (name) => {
  await page.getByRole('tab', { name, exact: true }).click()
  await page.waitForTimeout(700)
}

/* ── 1. 탭 지연 로딩 ─────────────────────────────────────────────────────── */
console.log('[탭 지연 로딩 — 열기 전에는 요청하지 않는다]')

const requested = []
page.on('request', (r) => {
  const u = r.url()
  if (u.includes('/api/mypage/')) requested.push(new URL(u).pathname)
})

let memberToken = await loginAs('player01')
await page.goto(B + '/mypage', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)

ok('진입 시 /me 만 부른다', requested.includes('/api/mypage/me'))
ok('로그 탭을 열기 전에는 /logs 를 부르지 않는다', !requested.includes('/api/mypage/logs'), requested.join(','))
ok('투표 탭도 마찬가지', !requested.includes('/api/mypage/votes'))

await openTab('활동 로그')
ok('탭을 열면 그때 부른다', requested.includes('/api/mypage/logs'))

/* ── 2. 활동 로그 (§8.4 · §12-7) ─────────────────────────────────────────── */
console.log('\n[활동 로그 — 내 로그를 내가 본다]')

const logRows = () => page.locator('main li > div[class*="row"]').count()
const before = await logRows()
ok('내 로그가 보인다 (구 구현은 아무도 자기 로그를 못 봤다)', before > 0, `${before}줄`)

const beforeApi = (await callApi('/api/mypage/logs?page=1&size=50', { token: memberToken })).data
ok('내 것만 내려온다', beforeApi.items.every((l) => l.username.startsWith('player01')), `${beforeApi.total}건`)

// 글을 하나 쓰고 로그가 실제로 늘어나는지 본다
const created = await callApi('/api/posts', {
  token: memberToken,
  method: 'POST',
  body: { type: 'normal', title: '로그 확인용 글', content: '처음 내용', pinUntil: null },
})
ok('글 작성 201', created.status === 201, `status ${created.status}`)

let afterApi = (await callApi('/api/mypage/logs?page=1&size=50', { token: memberToken })).data
ok('로그가 실제로 늘어난다', afterApi.total === beforeApi.total + 1, `${beforeApi.total} → ${afterApi.total}`)
ok('post_create 가 맨 위', afterApi.items[0].action === 'post_create', afterApi.items[0].action)

// 수정하면 before/after 가 둘 다 남아야 한다
await callApi(`/api/posts/${created.data.id}`, {
  token: memberToken,
  method: 'PUT',
  body: { type: 'normal', title: '로그 확인용 글(수정)', content: '고친 내용', pinUntil: null },
})
afterApi = (await callApi('/api/mypage/logs?page=1&size=50', { token: memberToken })).data
const upd = afterApi.items.find((l) => l.action === 'post_update')
ok('수정 로그에 before 와 after 가 둘 다 있다 (§12-7)',
  Boolean(upd?.snapshot?.before && upd?.snapshot?.after))
ok('before 가 원본을 담고 있다', upd?.snapshot?.before?.title === '로그 확인용 글', upd?.snapshot?.before?.title)
ok('after 가 수정본을 담고 있다', upd?.snapshot?.after?.title === '로그 확인용 글(수정)', upd?.snapshot?.after?.title)

/* ── 3. 익명 투표가 로그로 새지 않는가 (§12-9 · §8.3) ────────────────────── */
console.log('\n[익명 투표 — 감사 로그로 새지 않는다]')

const list = (await callApi('/api/posts?page=1&size=50', { token: memberToken })).data.items
const anonPost = list.find((p) => p.title === 'MT 숙소 예약 완료되었습니다')
const anonPoll = (await callApi(`/api/polls/post/${anonPost.id}`, { token: memberToken })).data
const voteRes = await callApi(`/api/polls/${anonPoll.poll.id}/vote`, {
  token: memberToken,
  method: 'POST',
  body: { optionIds: [anonPoll.options[1].id] },
})
ok('익명 투표 참여 200', voteRes.status === 200, `status ${voteRes.status}`)

afterApi = (await callApi('/api/mypage/logs?page=1&size=50', { token: memberToken })).data
const voteLog = afterApi.items.find((l) => l.action === 'vote_submit')
ok('투표 참여가 로그에 남는다 (§8.3)', Boolean(voteLog))
const snapKeys = Object.keys(voteLog?.snapshot ?? {})
ok('스냅샷에 선택 내용이 없다', !snapKeys.some((k) => /option|choice/i.test(k)), snapKeys.join(','))
const chosenText = anonPoll.options[1].text
const wholeLog = JSON.stringify(afterApi)
ok(`로그 전체에 내가 고른 "${chosenText}" 가 없다`, !wholeLog.includes(chosenText))

/* ── 4. 내 투표 탭 ───────────────────────────────────────────────────────── */
console.log('\n[내 투표 — 익명은 "참여함"까지만]')

const votes = (await callApi('/api/mypage/votes', { token: memberToken })).data
const anonVote = votes.find((v) => v.isAnonymous)
const namedVote = votes.find((v) => !v.isAnonymous)
ok('익명 투표의 myChoices 는 null', anonVote && anonVote.myChoices === null, JSON.stringify(anonVote?.myChoices))
ok('기명 투표는 선택을 돌려준다', !namedVote || Array.isArray(namedVote.myChoices))

/* ── 5. 이메일 인증 강제 (§12-3) ─────────────────────────────────────────── */
console.log('\n[이메일 변경도 서버가 인증을 강제한다 (§12-3)]')

let r = await callApi('/api/mypage/account', {
  token: memberToken,
  method: 'PUT',
  body: { username: 'player01', email: 'hijack@example.com', phone: null, phoneCountry: '82' },
})
ok('인증 없이 이메일 변경 → 400', r.status === 400, `status ${r.status} ${r.data?.message ?? ''}`)

r = await callApi('/api/mypage/account', {
  token: memberToken,
  method: 'PUT',
  body: { username: 'player01', email: 'player01@example.com', phone: '01012345678', phoneCountry: '82' },
})
ok('이메일을 그대로 두면 인증 없이도 저장된다', r.status === 200, `status ${r.status}`)
ok('전화번호가 숫자만 저장된다', r.data?.phone === '01012345678', r.data?.phone)

r = await callApi('/api/mypage/account', {
  token: memberToken,
  method: 'PUT',
  body: { username: 'manager01', email: 'player01@example.com', phone: null, phoneCountry: '82' },
})
ok('남의 아이디로 바꾸면 409', r.status === 409, `status ${r.status}`)

/* ── 6. 비밀번호 변경 (부록 A) ───────────────────────────────────────────── */
console.log('\n[비밀번호 변경 — 구 구현은 disabled 버튼만 있었다]')

r = await callApi('/api/mypage/password', {
  token: memberToken, method: 'PUT', body: { current: '틀린비번', next: 'NewPass!2026' },
})
ok('현재 비밀번호가 틀리면 400', r.status === 400, r.data?.message)

r = await callApi('/api/mypage/password', {
  token: memberToken, method: 'PUT', body: { current: PW, next: 'weak' },
})
ok('규칙 위반이면 400', r.status === 400, r.data?.message)

r = await callApi('/api/mypage/password', {
  token: memberToken, method: 'PUT', body: { current: PW, next: PW },
})
ok('같은 비밀번호면 400', r.status === 400, r.data?.message)

r = await callApi('/api/mypage/password', {
  token: memberToken, method: 'PUT', body: { current: PW, next: 'NewPass!2026' },
})
ok('올바르면 200', r.status === 200, `status ${r.status}`)

const relogin = await callApi('/api/auth/login', {
  method: 'POST', body: { username: 'player01', password: 'NewPass!2026' },
})
ok('바뀐 비밀번호로 실제 로그인된다', relogin.status === 200, `status ${relogin.status}`)

/* ── 7. 프로필 잠금 (§7.1) ───────────────────────────────────────────────── */
console.log('\n[프로필 잠금 — 승인 후에는 못 고친다]')

r = await callApi('/api/mypage/profile', {
  token: memberToken, method: 'PUT', body: { name: '가짜', studentId: '2024900099', obYb: 'yb' },
})
ok('approved 계정의 프로필 수정 → 403', r.status === 403, `status ${r.status}`)

const basicToken = await tokenFor('newbie')
r = await callApi('/api/mypage/profile', {
  token: basicToken, method: 'PUT', body: { name: '한지호', studentId: '2026900011', obYb: 'yb' },
})
ok('none 상태의 basic 은 수정 가능', r.status === 200, `status ${r.status}`)

/* ── 8. 멤버 신청 전제조건 4가지 (§7.1 · §12-13) ─────────────────────────── */
console.log('\n[멤버 신청 전제조건]')

const applicantToken = await tokenFor('applicant') // pending
r = await callApi('/api/mypage/membership-request', { token: applicantToken, method: 'POST' })
ok('이미 신청 중 → 400', r.status === 400 && r.data.message.includes('이미 신청 중'), r.data?.message)

r = await callApi('/api/mypage/membership-request', { token: memberToken, method: 'POST' })
ok('이미 멤버 → 400', r.status === 400 && r.data.message.includes('이미 멤버'), r.data?.message)

// newbie 를 프로필 없는 상태로 되돌린다
await callApi('/api/mypage/profile', {
  token: basicToken, method: 'PUT', body: { name: '한지호', studentId: null, obYb: 'yb' },
})
r = await callApi('/api/mypage/membership-request', { token: basicToken, method: 'POST' })
ok('학번 없음 → 400 (구 UI 는 "선택"이라 적었다)', r.status === 400 && r.data.message.includes('학번'), r.data?.message)

await callApi('/api/mypage/profile', {
  token: basicToken, method: 'PUT', body: { name: '한지호', studentId: '2026900011', obYb: 'yb' },
})
r = await callApi('/api/mypage/membership-request', { token: basicToken, method: 'POST' })
ok('다 채우면 신청된다', r.status === 200 && r.data.membershipStatus === 'pending', r.data?.membershipStatus)

/* ── 9. 로스터 이력 (§12-17) ─────────────────────────────────────────────── */
console.log('\n[로스터 이력 — userId 로 잇는다]')

const history = (await callApi('/api/mypage/roster-history', { token: memberToken })).data
ok('player01 의 이력이 2년치 나온다', history.length === 2, `${history.length}건`)
ok('연도 내림차순', history[0]?.year > history[1]?.year, history.map((h) => h.year).join(','))
ok('전부 userId 로 연결돼 있다', history.every((h) => h.userId === 3))

/* ── 10. basic 탭 노출 ───────────────────────────────────────────────────── */
console.log('\n[basic 화면]')

await loginAs('newbie')
await page.goto(B + '/mypage', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
const tabs = await page.getByRole('tab').allInnerTexts()
ok('basic 에게는 계정·설정만 보인다', tabs.join(',') === '계정,설정', tabs.join(','))

r = await callApi('/api/mypage/logs', { token: await tokenFor('newbie') })
ok('basic 이 로그 API 를 부르면 403', r.status === 403, `status ${r.status}`)

/* ── 11. 탈퇴 익명화 (§12-12) ────────────────────────────────────────────── */
console.log('\n[회원 탈퇴 — 익명화]')

const rootToken = await tokenFor('rootadmin')
r = await callApi('/api/mypage/withdraw', { token: rootToken, method: 'DELETE' })
ok('root 는 탈퇴 불가 403', r.status === 403, `status ${r.status}`)

await loginAs('rootadmin')
await page.goto(B + '/mypage', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await openTab('설정')
ok('root 화면에는 탈퇴 버튼이 없다', (await page.getByRole('button', { name: '회원 탈퇴' }).count()) === 0)

// player01 로 탈퇴시킨다. 그 사람의 글에 매니저가 댓글을 달아 둔 상태에서 확인한다.
//
// **페이지를 먼저 띄운 뒤에 댓글을 만든다.** page.goto 는 리로드라 목의 쓰기
// 상태를 초기화한다 — 순서를 바꾸면 방금 만든 댓글이 사라진 채로 검사하게 된다.
memberToken = await loginAs('player01')
await page.goto(B + '/mypage', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

const mine = (await callApi('/api/posts?page=1&size=50', { token: memberToken })).data.items
  .find((p) => p.author.startsWith('player01'))
const mgrToken = await tokenFor('manager01')
await callApi('/api/comments', {
  token: mgrToken, method: 'POST', body: { postId: mine.id, content: '남의 댓글입니다' },
})
const logsBefore = (await callApi('/api/mypage/logs?page=1&size=50', { token: memberToken })).data.total

await openTab('설정')
await page.getByRole('button', { name: '회원 탈퇴' }).click()
await page.waitForTimeout(500)

const confirmBtn = page.getByRole('button', { name: '탈퇴', exact: true })
ok('확인 문구를 입력하기 전에는 비활성', await confirmBtn.isDisabled())
await page.getByRole('textbox').fill('동의')
await page.waitForTimeout(200)
ok('부분 일치로는 안 된다', await confirmBtn.isDisabled())
await page.getByRole('textbox').fill('동의합니다')
await page.waitForTimeout(200)
ok('정확히 일치하면 활성', !(await confirmBtn.isDisabled()))
await confirmBtn.click()
await page.waitForTimeout(1400)
ok('탈퇴 후 홈으로', new URL(page.url()).pathname === '/', new URL(page.url()).pathname)

// 탈퇴 뒤에도 데이터가 남아 있는지 — 매니저 눈으로 확인한다
const post = (await callApi(`/api/posts/${mine.id}`, { token: mgrToken })).data
ok('탈퇴해도 글이 남아 있다 (구 구현은 DELETE 했다)', post?.title === mine.title, post?.title ?? '(사라짐)')
ok('작성자 연결만 끊긴다', post?.userId === null, String(post?.userId))
ok('작성자 표시는 작성 시점 그대로', post?.author?.startsWith('player01'), post?.author)

const comments = (await callApi(`/api/comments?postId=${mine.id}`, { token: mgrToken })).data
ok('그 글에 달린 타인의 댓글이 살아 있다 (구 구현은 CASCADE 로 지웠다)',
  comments.some((c) => c.content === '남의 댓글입니다'), `${comments.length}건`)

r = await callApi('/api/mypage/me', { token: memberToken })
ok('탈퇴한 토큰은 더 이상 통하지 않는다', r.status === 401, `status ${r.status}`)

const relog = await callApi('/api/auth/login', {
  method: 'POST', body: { username: 'player01', password: 'NewPass!2026' },
})
ok('탈퇴한 계정으로 로그인 불가', relog.status !== 200, `status ${relog.status}`)

// 감사 로그 보존 — 매니저가 아니라 목 내부 상태를 확인할 방법이 없으므로
// 탈퇴 로그가 남았는지는 다음 페이즈(활동내역)에서 화면으로 확인한다
ok('탈퇴 전 로그가 존재했다', logsBefore > 0, `${logsBefore}건`)

console.log('\n' + (errs.length ? '오류:\n  ' + errs.join('\n  ') : '콘솔 오류 없음'))
console.log(fails === 0 ? '전 항목 통과' : `실패 ${fails}건`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
