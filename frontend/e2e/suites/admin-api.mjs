/**
 * 관리자 · 활동내역 **API 계약** 검증 (화면 이전 단계).
 *
 * 목의 쓰기 상태는 탭 메모리에만 산다. 페이지를 리로드하면 초기화되므로
 * 한 페이지에서 토큰만 바꿔 가며 이어서 확인한다.
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5173'
const API = 'http://localhost:3001'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

let fails = 0
const ok = (label, cond, extra = '') => {
  if (!cond) fails++
  console.log(`  ${cond ? '✓' : '✗'} ${label}${extra ? '  — ' + extra : ''}`)
}

await page.goto(B + '/', { waitUntil: 'networkidle' })

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

async function call(path, { token = null, method = 'GET', body = null } = {}) {
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

const T = {}
for (const u of ['player01', 'player02', 'manager01', 'manager02', 'president', 'rootadmin', 'newbie']) {
  T[u] = await tokenFor(u)
}
const ids = {}
for (const u of ['player01', 'player02', 'manager01', 'manager02', 'president', 'headcoach', 'rootadmin', 'wait_park', 'banned_basic', 'banned_mgr']) {
  ids[u] = (await call(`/api/users/${u}`, { token: T.rootadmin })).data?.id
}

/* ── 1. §12-2 활동 로그 API ─────────────────────────────────────────────── */
console.log('[§12-2 — 활동 로그 API 가 이제 막힌다]')

let r = await call('/api/users/player01/logs')
ok('토큰 없이 로그 조회 → 401 (구 구현은 스냅샷이 다 나왔다)', r.status === 401, `status ${r.status}`)

r = await call('/api/users/player01/logs', { token: T.player02 })
ok('동급(member→member) → 403', r.status === 403, `status ${r.status}`)

r = await call('/api/users/manager01/logs', { token: T.player01 })
ok('하급이 상급 로그 요청 → 403', r.status === 403, `status ${r.status}`)

r = await call('/api/users/player01/logs', { token: T.manager01 })
ok('manager 가 member 로그 → 200', r.status === 200, `status ${r.status}`)

r = await call('/api/users/manager01/logs', { token: T.manager02 })
ok('manager 가 동급 manager 로그 → 403', r.status === 403, `status ${r.status}`)

r = await call('/api/users/player01/logs', { token: T.player01 })
ok('본인 로그는 본다 (§8.4 본인 예외)', r.status === 200, `status ${r.status}`)

r = await call('/api/users/president/logs', { token: T.rootadmin })
ok('root 는 staff 로그를 본다', r.status === 200, `status ${r.status}`)

r = await call('/api/users/rootadmin/logs', { token: T.rootadmin })
ok('root 도 자기 로그는 본다(본인 예외)', r.status === 200, `status ${r.status}`)

r = await call('/api/users/player01/posts')
ok('토큰 없이 활동 게시글 → 401', r.status === 401, `status ${r.status}`)
r = await call('/api/users/player01', { token: T.newbie })
ok('basic 은 활동 화면 자체가 403', r.status === 403, `status ${r.status}`)

/* ── 2. §12-11 로그 상세를 id 로 조회 ──────────────────────────────────── */
console.log('\n[§12-11 — 로그 상세를 URL 로 열 수 있다]')

const logs = (await call('/api/users/player01/logs', { token: T.manager01 })).data
ok('로그 목록이 비어있지 않다', logs.items.length > 0, `${logs.total}건`)
const logId = logs.items[0].id
r = await call(`/api/users/player01/logs/${logId}`, { token: T.manager01 })
ok('id 로 단건 조회 200 (구 구현은 location.state 뿐이었다)', r.status === 200, `status ${r.status}`)
ok('스냅샷이 함께 온다', r.data?.snapshot !== undefined)

r = await call(`/api/users/player02/logs/${logId}`, { token: T.manager01 })
ok('다른 사람 경로에 남의 로그 id 를 끼우면 404', r.status === 404, `status ${r.status}`)
r = await call(`/api/users/player01/logs/${logId}`, { token: T.player02 })
ok('권한 없으면 단건도 403', r.status === 403, `status ${r.status}`)

/* ── 3. §12-10 승인이 조용히 실패하지 않는다 ──────────────────────────── */
console.log('\n[§12-10 — 승인이 조용히 실패하지 않는다]')

const pending = (await call('/api/admin/pending-members', { token: T.manager01 })).data
ok('승인 대기 목록이 여러 건', pending.length >= 3, `${pending.length}명`)

const logsBefore = (await call('/api/users/manager01/logs?size=50', { token: T.rootadmin })).data.total

r = await call(`/api/admin/approve-member/${ids.wait_park}`, { token: T.manager01, method: 'POST' })
ok('대기 중인 사람 승인 → 200', r.status === 200 && r.data.authority === 'member', r.data?.authority)

r = await call(`/api/admin/approve-member/${ids.wait_park}`, { token: T.manager01, method: 'POST' })
ok('이미 승인된 사람을 또 승인 → 409 (구 구현은 "승인 완료"였다)', r.status === 409, `status ${r.status}`)

const logsAfter = (await call('/api/users/manager01/logs?size=50', { token: T.rootadmin })).data.total
ok('실패한 승인은 로그를 남기지 않는다', logsAfter === logsBefore + 1, `${logsBefore} → ${logsAfter}`)

r = await call(`/api/admin/approve-member/999999`, { token: T.manager01, method: 'POST' })
ok('없는 사용자 → 404', r.status === 404, `status ${r.status}`)

/* ── 4. 대상 조건 (§4.4) ────────────────────────────────────────────────── */
console.log('\n[대상 조건을 서버가 판정한다]')

r = await call(`/api/admin/users/${ids.manager01}/set-manager`, { token: T.president, method: 'PUT' })
ok('이미 매니저를 매니저 임명 → 409', r.status === 409, `status ${r.status}`)
r = await call(`/api/admin/users/${ids.player01}/unset-manager`, { token: T.president, method: 'PUT' })
ok('멤버를 매니저 해제 → 409', r.status === 409, `status ${r.status}`)
r = await call(`/api/admin/users/${ids.manager01}/demote-member`, { token: T.president, method: 'PUT' })
ok('매니저를 강등 → 409 (멤버만 가능)', r.status === 409, `status ${r.status}`)

r = await call(`/api/admin/users/${ids.player02}/set-manager`, { token: T.manager01, method: 'PUT' })
ok('manager 는 임명 권한이 없다 → 403', r.status === 403, `status ${r.status}`)
r = await call(`/api/admin/users/${ids.player02}/set-manager`, { token: T.president, method: 'PUT' })
ok('staff 는 멤버를 매니저로 임명 → 200', r.status === 200, `status ${r.status}`)

r = await call(`/api/admin/users/${ids.headcoach}/ban`, { token: T.president, method: 'PUT' })
ok('staff 가 staff 를 차단 → 403 (root 만)', r.status === 403, `status ${r.status}`)
r = await call(`/api/admin/users/${ids.rootadmin}/ban`, { token: T.rootadmin, method: 'PUT' })
ok('root 차단 → 403 (아무도 불가)', r.status === 403, `status ${r.status}`)

r = await call(`/api/admin/users/${ids.player01}/ban`, { token: T.president, method: 'PUT' })
ok('staff 가 member 를 차단 → 200', r.status === 200, `status ${r.status}`)
r = await call(`/api/admin/users/${ids.player01}/ban`, { token: T.president, method: 'PUT' })
ok('이미 차단된 계정 → 409', r.status === 409, `status ${r.status}`)

// 차단 해제가 신청 상태를 덮어쓰지 않는지 (§12-19 분리의 결과)
const beforeUnban = (await call(`/api/users/banned_basic`, { token: T.rootadmin })).data
r = await call(`/api/admin/users/${ids.banned_basic}/unban`, { token: T.president, method: 'PUT' })
ok('차단 해제 200', r.status === 200, `status ${r.status}`)
ok('해제해도 authority 가 그대로', r.data?.authority === beforeUnban.authority, `${beforeUnban.authority} → ${r.data?.authority}`)
ok('해제해도 신청 상태가 그대로 (구 구현은 추측해 덮어썼다)', r.data?.membershipStatus === 'none', r.data?.membershipStatus)

/* ── 5. 스태프 (root 전용) ──────────────────────────────────────────────── */
console.log('\n[스태프 임명은 root 전용]')

r = await call('/api/admin/staffs', { token: T.president })
ok('staff 가 스태프 목록 요청 → 403', r.status === 403, `status ${r.status}`)
r = await call('/api/admin/staffs', { token: T.rootadmin })
ok('root 는 200, 회장이 먼저', r.status === 200 && r.data[0]?.staffType === 'president', r.data?.[0]?.staffType)

r = await call(`/api/admin/users/${ids.player02}/set-staff`, { token: T.rootadmin, method: 'PUT', body: {} })
ok('staffType 없으면 400', r.status === 400, `status ${r.status}`)
r = await call(`/api/admin/users/${ids.player02}/set-staff`, { token: T.rootadmin, method: 'PUT', body: { staffType: 'boss' } })
ok('화이트리스트 밖이면 400', r.status === 400, `status ${r.status}`)
r = await call(`/api/admin/users/${ids.player02}/set-staff`, { token: T.rootadmin, method: 'PUT', body: { staffType: 'headcoach' } })
ok('멤버·매니저를 스태프로 임명 → 200', r.status === 200 && r.data.staffType === 'headcoach', r.data?.staffType)
r = await call(`/api/admin/users/${ids.player02}/unset-staff`, { token: T.rootadmin, method: 'PUT' })
ok('해제하면 멤버로 돌아가고 staffType 이 비워진다', r.data?.authority === 'member' && r.data?.staffType === null)

/* ── 6. 로스터 (§12-17) ─────────────────────────────────────────────────── */
console.log('\n[로스터 — userId 를 채운다]')

r = await call('/api/admin/roster', { token: T.manager01 })
ok('연도 없이 조회 → 400', r.status === 400, `status ${r.status}`)

const year = new Date().getFullYear()
const list2026 = (await call(`/api/admin/roster?year=2026`, { token: T.manager01 })).data
ok('연도별 조회 200', Array.isArray(list2026), `${list2026?.length}건`)
ok('가입된 사람과 미가입이 함께 있다',
  list2026.some((e) => e.username !== null) && list2026.some((e) => e.username === null))

// 학번이 실제 계정과 일치하면 userId 가 채워져야 한다
r = await call('/api/admin/roster', {
  token: T.manager01, method: 'POST',
  body: { year: 2026, number: '77', name: '강태윤', studentId: '2024900208', generation: 22, role: 'roster_player' },
})
ok('로스터 추가 201', r.status === 201, `status ${r.status}`)
ok('학번이 맞는 계정의 userId 가 채워진다 (§12-17)', r.data?.userId === ids.player02, `userId ${r.data?.userId}`)
const newEntryId = r.data?.id

r = await call('/api/admin/roster', {
  token: T.manager01, method: 'POST',
  body: { year: 2026, number: '78', name: '중복', studentId: '2024900208', generation: 22, role: 'roster_player' },
})
ok('같은 해 학번 중복 → 409', r.status === 409, `status ${r.status}`)

r = await call('/api/admin/roster', {
  token: T.manager01, method: 'POST',
  body: { year: 2026, number: 'X', name: '번호오류', studentId: '2024900299', generation: 22, role: 'roster_player' },
})
ok('등번호가 M 도 숫자도 아니면 400', r.status === 400, `status ${r.status}`)

r = await call('/api/admin/roster', {
  token: T.manager01, method: 'POST',
  body: { year: 2026, number: '9', name: '역할오류', studentId: '2024900298', generation: 22, role: 'coach' },
})
ok('역할 화이트리스트 밖이면 400', r.status === 400, `status ${r.status}`)

r = await call(`/api/admin/roster/${newEntryId}`, { token: T.manager01, method: 'DELETE' })
ok('삭제 200', r.status === 200, `status ${r.status}`)

/* ── 7. 설정 (staff+) ───────────────────────────────────────────────────── */
console.log('\n[연도 설정 · 공휴일 동기화]')

r = await call('/api/admin/roster-year', { token: T.manager01, method: 'PUT', body: { year: 2025 } })
ok('manager 는 연도 설정 불가 → 403', r.status === 403, `status ${r.status}`)
r = await call('/api/admin/roster-year', { token: T.president, method: 'PUT', body: { year: 1999 } })
ok('하한 미만 → 400', r.status === 400, `status ${r.status}`)
r = await call('/api/admin/roster-year', { token: T.president, method: 'PUT', body: { year: 2025 } })
ok('staff 가 연도 변경 → 200', r.status === 200, `status ${r.status}`)

const active = (await call('/api/roster/active-year')).data
ok('공개 조회에 즉시 반영된다', active.year === 2025, `year ${active.year}`)
const defaultRoster = (await call('/api/roster')).data
ok('연도 미지정 조회가 새 활성 연도를 따른다', defaultRoster.every((e) => e.year === 2025), `${defaultRoster.length}건`)
await call('/api/admin/roster-year', { token: T.president, method: 'PUT', body: { year: 2026 } })

r = await call('/api/admin/sync-holidays', { token: T.manager01, method: 'POST', body: { year } })
ok('manager 는 공휴일 동기화 불가 → 403', r.status === 403, `status ${r.status}`)
r = await call('/api/admin/sync-holidays', { token: T.president, method: 'POST', body: { year } })
ok('staff 가 동기화 → 200', r.status === 200 && r.data.count > 0, `${r.data?.count}건`)
const holidays = (await call(`/api/holidays?year=${year}`)).data
ok('동기화 뒤에도 공휴일 수가 유지된다 (중복 적재 없음)', holidays.length === r.data.count, `${holidays.length}건`)

/* ── 8. 관리 행동이 대상의 활동 로그에 쌓인다 ──────────────────────────── */
console.log('\n[관리 행동이 로그로 남는다]')

const mgrLogs = (await call('/api/users/manager01/logs?size=50', { token: T.rootadmin })).data
const actions = mgrLogs.items.map((l) => l.action)
ok('member_approve 가 남았다', actions.includes('member_approve'))
ok('roster_add · roster_delete 가 남았다', actions.includes('roster_add') && actions.includes('roster_delete'))
const presLogs = (await call('/api/users/president/logs?size=50', { token: T.rootadmin })).data
const pActions = presLogs.items.map((l) => l.action)
ok('user_ban · user_unban · roster_year_set 이 남았다',
  pActions.includes('user_ban') && pActions.includes('user_unban') && pActions.includes('roster_year_set'))
const rosterUpdateLog = mgrLogs.items.find((l) => l.action === 'roster_update')
ok('로스터 수정 로그도 before/after 형식', !rosterUpdateLog || Boolean(rosterUpdateLog.snapshot?.before))

console.log('\n' + (fails === 0 ? '전 항목 통과' : `실패 ${fails}건`))
await browser.close()
process.exit(fails === 0 ? 0 : 1)
