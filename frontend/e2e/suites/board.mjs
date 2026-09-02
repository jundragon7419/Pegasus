/**
 * 게시판 검증.
 *
 * 목의 쓰기 상태는 탭 메모리에만 산다. 새로고침하면 초기 픽스처로 돌아가므로
 * 한 페이지 안에서 이어서 확인해야 하는 것들은 페이지를 유지한 채 검사한다.
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const API = 'http://localhost:3001'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } })

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

async function loginAs(username) {
  await page.goto(B + '/', { waitUntil: 'networkidle' })
  if (username === null) {
    await page.evaluate(() => {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
    })
    return null
  }
  return await page.evaluate(
    async ([u, api]) => {
      const res = await fetch(api + '/api/__dev/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u }),
      })
      const { token } = await res.json()
      sessionStorage.setItem('token', token)
      return token
    },
    [username, API],
  )
}

/** 브라우저 안에서 API 를 직접 호출한다. 목(Service Worker)을 거치려면 페이지 컨텍스트여야 한다. */
async function callApi(path, { token = null, method = 'GET', body = null } = {}) {
  return await page.evaluate(
    async ([api, p, t, m, b]) => {
      const headers = {}
      if (t) headers.Authorization = `Bearer ${t}`
      if (b) headers['Content-Type'] = 'application/json'
      const res = await fetch(api + p, { method: m, headers, body: b ? JSON.stringify(b) : undefined })
      let data = null
      try {
        data = await res.json()
      } catch {
        data = null
      }
      return { status: res.status, data }
    },
    [API, path, token, method, body],
  )
}

/* ── 1. 권한 (§12-1) ─────────────────────────────────────────────────────── */
console.log('[권한 — 조회 API 를 권한별로 나눴는가 (§12-1)]')

await loginAs(null)
let r = await callApi('/api/posts/recent?limit=8')
ok('비로그인도 /api/posts/recent 는 200', r.status === 200, `status ${r.status}`)
ok(
  '축약 응답에 작성자·조회수가 없다',
  Array.isArray(r.data) && r.data.length > 0 && !('author' in r.data[0]) && !('views' in r.data[0]),
  Object.keys(r.data?.[0] ?? {}).join(','),
)

r = await callApi('/api/posts')
ok('토큰 없이 /api/posts → 401', r.status === 401, `status ${r.status}`)

const firstId = (await callApi('/api/posts/recent?limit=1')).data[0].id
r = await callApi(`/api/posts/${firstId}`)
ok('토큰 없이 본문 → 401 (구 구현은 본문이 그대로 나왔다)', r.status === 401, `status ${r.status}`)

r = await callApi(`/api/comments?postId=${firstId}`)
ok('토큰 없이 댓글 → 401', r.status === 401, `status ${r.status}`)

const basicToken = await loginAs('newbie')
r = await callApi('/api/posts', { token: basicToken })
ok('basic 은 목록 200', r.status === 200, `status ${r.status}`)
r = await callApi(`/api/posts/${firstId}`, { token: basicToken })
ok('basic 은 본문 403', r.status === 403, `status ${r.status}`)

/* ── 2. 서버 페이지네이션 (§12-14) ───────────────────────────────────────── */
console.log('\n[서버 페이지네이션 (§12-14)]')

const memberToken = await loginAs('player01')
const p1 = await callApi('/api/posts?page=1&size=15', { token: memberToken })
const p2 = await callApi('/api/posts?page=2&size=15', { token: memberToken })
ok('응답이 { items, page, size, total }', ['items', 'page', 'size', 'total'].every((k) => k in p1.data))
const pinnedCount = p1.data.items.filter((i) => i.isPinned).length
ok(
  '1페이지 = 고정글 + 일반글 15개',
  p1.data.items.length === pinnedCount + 15,
  `${p1.data.items.length}개 (고정 ${pinnedCount})`,
)
ok('total 은 일반글 수', p1.data.total === 22 - pinnedCount, `total ${p1.data.total}`)
const p1ids = new Set(p1.data.items.filter((i) => !i.isPinned).map((i) => i.id))
const p2ids = p2.data.items.filter((i) => !i.isPinned).map((i) => i.id)
ok('2페이지 일반글이 1페이지와 겹치지 않는다', p2ids.every((id) => !p1ids.has(id)))
ok('목록에 본문이 없다', !('content' in p1.data.items[0]))

/* ── 3. basic 화면 (⑥) ──────────────────────────────────────────────────── */
console.log('\n[basic 화면 — 안 열리는 링크를 만들지 않는다]')

await loginAs('newbie')
await page.goto(B + '/board', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
ok('안내 문구가 보인다', (await page.getByText('회원 승인 후 게시글을 열람').count()) === 1)
ok('본문 링크가 없다', (await page.locator('main a[href^="/board/"]').count()) === 0)
ok('제목은 보인다', (await page.getByText('2026 시즌 정기훈련 일정 안내').count()) > 0)
ok('글쓰기 버튼이 없다', (await page.getByRole('link', { name: '글쓰기' }).count()) === 0)

await page.goto(B + `/board/${firstId}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
ok('basic 이 URL 로 직접 들어가면 /403', new URL(page.url()).pathname === '/403')

/* ── 4. 수정 권한 (§12-7) ────────────────────────────────────────────────── */
console.log('\n[수정은 소유자만 · 삭제는 매니저도 (§12-7)]')

const managerToken = await loginAs('manager01')
const list = (await callApi('/api/posts?page=1&size=50', { token: managerToken })).data.items
const mine = list.find((p) => p.author.startsWith('manager01'))
const others = list.find((p) => p.author.startsWith('headcoach'))

await page.goto(B + `/board/${mine.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
ok('본인 글에는 수정 버튼이 있다', (await page.getByRole('link', { name: '수정' }).count()) === 1)

await page.goto(B + `/board/${others.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
ok('타인 글에는 수정 버튼이 없다', (await page.getByRole('link', { name: '수정' }).count()) === 0)
// 댓글에도 삭제 버튼이 있으므로 게시글 액션 영역으로 좁힌다
const postDelete = page.locator('[class*="ownerActions"] button', { hasText: '삭제' })
ok('타인 글에도 삭제 버튼은 있다', (await postDelete.count()) === 1)

r = await callApi(`/api/posts/${others.id}`, {
  token: managerToken,
  method: 'PUT',
  body: { type: 'game', title: '가로채기', content: '본문', pinUntil: null },
})
ok('매니저가 타인 글 수정 API → 403', r.status === 403, `status ${r.status}`)

await postDelete.click()
await page.waitForTimeout(500)
const dialogText = await page.getByRole('alertdialog').innerText()
ok('타인 글 삭제 안내가 다르다', dialogText.includes('로그에 기록됩니다'), dialogText.split('\n')[1] ?? '')
await page.keyboard.press('Escape')

await page.goto(B + `/board/${others.id}/edit`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
ok('타인 글 수정 화면 직접 접근 → /403', new URL(page.url()).pathname === '/403')

/* ── 5. 투표 (§12-8 · §12-9) ─────────────────────────────────────────────── */
console.log('\n[투표 — 표 보존과 진짜 익명]')

const ownerToken = await loginAs('player01')
const votePost = list.find((p) => p.title === '이번 주 훈련 참석 여부 투표')

await page.goto(B + `/board/${votePost.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
ok('투표가 그려진다', (await page.getByRole('region', { name: '투표' }).count()) === 1)

await page.getByText('참석', { exact: true }).click()
await page.getByRole('button', { name: '투표하기' }).click()
await page.waitForTimeout(900)
ok('투표 후 결과로 바뀐다', (await page.getByText('내 선택').count()) === 1)
let poll = (await callApi(`/api/polls/post/${votePost.id}`, { token: ownerToken })).data
const before = Object.fromEntries(poll.options.map((o) => [o.text, o.votes]))
ok('내 표가 반영됐다', before['참석'] === 8, JSON.stringify(before))
ok('기명 투표는 명단이 있다', poll.options[0].voters.includes('player01(김민준)'))

// 제목만 바꿔 저장한다 — 옵션은 그대로
r = await callApi(`/api/posts/${votePost.id}`, {
  token: ownerToken,
  method: 'PUT',
  body: {
    type: 'normal',
    title: '이번 주 훈련 참석 여부 투표 (수정)',
    content: '본문',
    pinUntil: null,
    poll: {
      title: '이번 주 훈련에 참석하시나요?',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['참석', '불참', '미정'],
    },
  },
})
ok('소유자 수정 200', r.status === 200, `status ${r.status}`)
poll = (await callApi(`/api/polls/post/${votePost.id}`, { token: ownerToken })).data
const after = Object.fromEntries(poll.options.map((o) => [o.text, o.votes]))
ok('옵션이 그대로면 표가 보존된다 (§12-8)', JSON.stringify(after) === JSON.stringify(before), JSON.stringify(after))

// 옵션 하나를 바꾼다
await callApi(`/api/posts/${votePost.id}`, {
  token: ownerToken,
  method: 'PUT',
  body: {
    type: 'normal',
    title: '이번 주 훈련 참석 여부 투표',
    content: '본문',
    pinUntil: null,
    poll: {
      title: '이번 주 훈련에 참석하시나요?',
      isMultiple: false,
      isAnonymous: false,
      isPrivate: false,
      options: ['참석', '불참', '보류'],
    },
  },
})
poll = (await callApi(`/api/polls/post/${votePost.id}`, { token: ownerToken })).data
const changed = Object.fromEntries(poll.options.map((o) => [o.text, o.votes]))
ok(
  '바꾼 선택지의 표만 사라진다',
  changed['참석'] === before['참석'] && changed['불참'] === before['불참'] && changed['보류'] === 0,
  JSON.stringify(changed),
)

// 익명
const anonPost = list.find((p) => p.title === 'MT 숙소 예약 완료되었습니다')
const anonPoll = (await callApi(`/api/polls/post/${anonPost.id}`, { token: ownerToken })).data
ok('익명 투표에는 명단이 없다', anonPoll.options.every((o) => o.voters.length === 0))

await page.goto(B + `/board/${anonPost.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
ok('익명 배지가 보인다', (await page.getByText('익명', { exact: true }).count()) >= 1)
ok('투표자 명단 버튼이 없다', (await page.locator('button[class*="votersButton"]').count()) === 0)

await page.getByText('치킨', { exact: true }).click()
await page.getByRole('button', { name: '투표하기' }).click()
await page.waitForTimeout(900)
const voted = (await callApi(`/api/polls/post/${anonPost.id}`, { token: ownerToken })).data
ok('익명: 참여 사실은 남는다', voted.hasVoted === true)
ok('익명: 내 선택은 남지 않는다 (§12-9)', voted.userVotes.length === 0, JSON.stringify(voted.userVotes))
ok('익명: 집계는 정상', voted.options.find((o) => o.text === '치킨').votes === 6)
ok('익명: 다시 선택 버튼이 없다', (await page.getByRole('button', { name: '다시 선택' }).count()) === 0)
ok('익명: 그 이유를 화면에 적는다', (await page.getByText('익명 투표는 다시 선택할 수 없습니다').count()) === 1)

r = await callApi(`/api/polls/${voted.poll.id}/vote`, {
  token: ownerToken,
  method: 'POST',
  body: { optionIds: [voted.options[0].id] },
})
ok('익명 재투표 API → 409', r.status === 409, `status ${r.status}`)

// 비공개
const privPost = list.find((p) => p.title === '체육관 이용 규정 변경 안내')
const asMember = (await callApi(`/api/polls/post/${privPost.id}`, { token: ownerToken })).data
ok('비공개: 일반 회원에게 결과를 감춘다', asMember.canSeeResults === false && asMember.totalVotes === null)
const asManager = (await callApi(`/api/polls/post/${privPost.id}`, { token: managerToken })).data
ok('비공개: 매니저도 볼 수 없다 (staff+ 만)', asManager.canSeeResults === false)
const staffToken = await loginAs('president')
const asStaff = (await callApi(`/api/polls/post/${privPost.id}`, { token: staffToken })).data
ok('비공개: staff 는 볼 수 있다', asStaff.canSeeResults === true)

/* ── 6. 작성 · XSS ──────────────────────────────────────────────────────── */
console.log('\n[작성 · XSS]')

await loginAs('player01')
await page.goto(B + '/board/write', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const typeOptions = await page.locator('#post-type option').allInnerTexts()
ok('member 에게는 매니저 전용 유형이 없다', !typeOptions.includes('공지'), typeOptions.join(','))
ok('member 에게는 상단 고정 항목이 없다', (await page.getByText('상단 고정').count()) === 0)

const XSS = '<script>window.__pwned = 1</script>\n<img src=x onerror="window.__pwned=2">'
await page.getByLabel('제목').fill('XSS 시험')
await page.locator('#post-content').fill(XSS)
await page.getByRole('button', { name: '등록' }).click()
await page.waitForTimeout(1200)
ok('작성 후 본문으로 이동', /^\/board\/\d+$/.test(new URL(page.url()).pathname), new URL(page.url()).pathname)
ok('태그가 문자 그대로 보인다', (await page.getByText('<script>window.__pwned = 1</script>').count()) === 1)
ok('스크립트가 실행되지 않았다', (await page.evaluate(() => window.__pwned)) === undefined)
ok('삽입된 img 요소가 없다', (await page.locator('article img').count()) === 0)

/* ── 7. 댓글 ────────────────────────────────────────────────────────────── */
console.log('\n[댓글]')

const newPostId = Number(new URL(page.url()).pathname.split('/').pop())
await page.getByLabel('댓글 입력').fill('첫 댓글입니다')
await page.getByRole('button', { name: '등록' }).click()
await page.waitForTimeout(900)
ok('댓글이 등록된다', (await page.getByText('첫 댓글입니다').count()) === 1)

await page.getByRole('button', { name: '수정' }).first().click()
await page.waitForTimeout(300)
await page.getByLabel('댓글 수정').fill('고친 댓글입니다')
await page.getByRole('button', { name: '저장' }).click()
await page.waitForTimeout(900)
ok('수정하면 (수정) 표시가 붙는다', (await page.getByText('(수정)').count()) === 1)

const long = 'ㄱ'.repeat(501)
r = await callApi('/api/comments', {
  token: memberToken,
  method: 'POST',
  body: { postId: newPostId, content: long },
})
ok('501자 댓글 → 400', r.status === 400, `status ${r.status}`)
r = await callApi('/api/comments', {
  token: memberToken,
  method: 'POST',
  body: { postId: newPostId, content: 'ㄱ'.repeat(500) },
})
ok('500자 댓글 → 201', r.status === 201, `status ${r.status}`)

// loginAs 는 페이지를 리로드해 목 상태를 날린다. 토큰은 self-describing 이라
// 리로드 없이 그대로 쓸 수 있으므로 앞에서 받아둔 것을 재사용한다
const otherToken = managerToken
const comments = (await callApi(`/api/comments?postId=${newPostId}`, { token: otherToken })).data
r = await callApi(`/api/comments/${comments[0].id}`, {
  token: otherToken,
  method: 'PUT',
  body: { content: '가로채기' },
})
ok('매니저가 타인 댓글 수정 → 403', r.status === 403, `status ${r.status}`)
r = await callApi(`/api/comments/${comments[0].id}`, { token: otherToken, method: 'DELETE' })
ok('매니저가 타인 댓글 삭제 → 200', r.status === 200, `status ${r.status}`)

/* ── 8. 홈 위젯 ─────────────────────────────────────────────────────────── */
console.log('\n[홈 위젯]')
await loginAs(null)
await page.goto(B + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
const widgetRows = await page.locator('a[class*="postRow"]').count()
ok('비로그인 홈에 게시글 8줄', widgetRows === 8, `${widgetRows}줄`)

console.log('\n' + (errs.length ? '오류:\n  ' + errs.join('\n  ') : '콘솔 오류 없음'))
console.log(fails === 0 ? '전 항목 통과' : `실패 ${fails}건`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
