import { HttpResponse, http } from 'msw'

import { requireRole } from '@/mocks/authGuard'
import {
  approveMember,
  banUser,
  demoteMember,
  findById,
  listUsers,
  rejectMember,
  setManager,
  setStaff,
  toPublicUser,
  unbanUser,
  unsetManager,
  unsetStaff,
  type MockUser,
} from '@/mocks/authState'
import { log } from '@/mocks/logState'
import {
  createRosterEntry,
  deleteRosterEntry,
  findRosterEntry,
  hasStudentIdInYear,
  listRoster,
  listRosterByUser,
  setActiveYear,
  updateRosterEntry,
  type RosterInput,
} from '@/mocks/rosterState'
import { resyncHolidays } from '@/mocks/scheduleState'
import { canBanUser } from '@/lib/roles'
import { validateRosterNumber, validateStudentId } from '@/lib/validators'
import type { StaffType } from '@/types/auth'
import type { RosterRole } from '@/types/roster'

/**
 * 블루프린트 §5.10. 라우터 전체에 인증이 걸린다.
 *
 * **대상 조건을 서버가 판정한다.** 구 구현은 SQL 의 `WHERE authority='basic'`
 * 같은 조건에 기대면서 `affectedRows` 를 보지 않아, 대상이 조건을 벗어나면
 * **아무것도 안 바뀌는데 "완료" 응답이 나가고 로그까지 남았다**(§12-10).
 * 여기서는 먼저 확인하고 어긋나면 409 로 알린다.
 *
 * 모든 쓰기가 감사 로그를 남긴다(§8.1). 로그는 `logState.log` 가 절대 throw 하지
 * 않으므로 본 흐름을 막지 않는다.
 */

const ROSTER_ROLES: RosterRole[] = [
  'roster_president',
  'roster_headcoach',
  'roster_retired',
  'roster_player',
  'roster_manager',
]
const STAFF_TYPES: StaffType[] = ['president', 'headcoach']

const bad = (message: string) => HttpResponse.json({ message }, { status: 400 })
const forbidden = (message: string) => HttpResponse.json({ message }, { status: 403 })
const conflict = (message: string) => HttpResponse.json({ message }, { status: 409 })
const notFound = (message: string) => HttpResponse.json({ message }, { status: 404 })

/** §8.1 의 user 스냅샷. 계정이 지워지거나 바뀐 뒤에도 누구였는지 남는다. */
const userSnapshot = (user: MockUser) => ({
  username: user.username,
  name: user.name,
  studentId: user.studentId,
  obYb: user.obYb,
})

/** 관리 대상 유저를 찾는다. 없으면 404 응답을 돌려준다. */
function target(params: Record<string, unknown>): MockUser | Response {
  const user = findById(Number(params.id))
  return user ?? notFound('존재하지 않는 사용자입니다.')
}

const isResponse = (value: unknown): value is Response => value instanceof Response

/** 목록 응답에서 비밀번호를 떨어뜨리고 최신 로스터 정보를 붙인다(§5.10). */
function toAdminUser(user: MockUser) {
  const latest = listRosterByUser(user.id)[0]
  return {
    ...toPublicUser(user),
    rosterNumber: latest?.number ?? null,
    rosterRole: latest?.role ?? null,
    rosterYear: latest?.year ?? null,
  }
}

export const adminHandlers = [
  /* ── 멤버 승인 (manager+) ─────────────────────────────────────────────── */

  http.get('*/api/admin/pending-members', async ({ request }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    return HttpResponse.json(
      listUsers()
        .filter((u) => u.membershipStatus === 'pending' && !u.isBanned)
        .map(toAdminUser),
    )
  }),

  http.post('*/api/admin/approve-member/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const user = target(params)
    if (isResponse(user)) return user

    // **§12-10.** 구 구현은 `WHERE authority='basic'` 으로 조용히 넘어갔다.
    // 이미 멤버인 사람을 승인하면 아무 일도 안 일어나는데 "승인 완료"가 나갔다
    if (user.membershipStatus !== 'pending') {
      return conflict('승인 대기 상태가 아닙니다. 목록을 새로 고쳐 주세요.')
    }

    approveMember(user)
    log(auth.user, 'member_approve', 'user', user.id, userSnapshot(user))
    return HttpResponse.json(toPublicUser(user))
  }),

  http.post('*/api/admin/reject-member/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const user = target(params)
    if (isResponse(user)) return user
    if (user.membershipStatus !== 'pending') {
      return conflict('승인 대기 상태가 아닙니다. 목록을 새로 고쳐 주세요.')
    }

    rejectMember(user)
    log(auth.user, 'member_reject', 'user', user.id, userSnapshot(user))
    return HttpResponse.json(toPublicUser(user))
  }),

  /* ── 로스터 (manager+) ────────────────────────────────────────────────── */

  http.get('*/api/admin/roster', async ({ request }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const yearParam = new URL(request.url).searchParams.get('year')
    // 구 API 는 연도를 필수로 요구하고 없으면 400 이다. 그대로 둔다 —
    // 전체 연도를 한 번에 편집하는 화면이 없으므로 실수를 막는 쪽이 낫다
    if (!yearParam) return bad('연도를 지정해 주세요.')

    const entries = listRoster(Number(yearParam)).map((entry) => ({
      ...entry,
      // 가입 여부를 표에 보여준다. 학번이 아니라 userId 로 잇는다(§12-17)
      username: entry.userId === null ? null : (findById(entry.userId)?.username ?? null),
    }))
    return HttpResponse.json(entries)
  }),

  http.post('*/api/admin/roster', async ({ request }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const input = normalizeRoster(await request.json())
    if (typeof input === 'string') return bad(input)
    if (hasStudentIdInYear(input.year, input.studentId)) {
      return conflict('그 해에 이미 등록된 학번입니다.')
    }

    const entry = createRosterEntry(input)
    log(auth.user, 'roster_add', 'roster', entry.id, {
      name: entry.name,
      studentId: entry.studentId,
      role: entry.role,
      year: entry.year,
      number: entry.number,
    })
    return HttpResponse.json(entry, { status: 201 })
  }),

  http.put('*/api/admin/roster/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const id = Number(params.id)
    const existing = findRosterEntry(id)
    if (!existing) return notFound('존재하지 않는 로스터 항목입니다.')

    const input = normalizeRoster(await request.json())
    if (typeof input === 'string') return bad(input)
    if (hasStudentIdInYear(input.year, input.studentId, id)) {
      return conflict('그 해에 이미 등록된 학번입니다.')
    }

    const before = { name: existing.name, studentId: existing.studentId, role: existing.role }
    const entry = updateRosterEntry(id, input)
    log(auth.user, 'roster_update', 'roster', id, {
      before,
      after: { name: input.name, studentId: input.studentId, role: input.role },
    })
    return HttpResponse.json(entry)
  }),

  http.delete('*/api/admin/roster/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const id = Number(params.id)
    const existing = findRosterEntry(id)
    if (!existing) return notFound('존재하지 않는 로스터 항목입니다.')

    const snapshot = { name: existing.name, studentId: existing.studentId, role: existing.role }
    deleteRosterEntry(id)
    log(auth.user, 'roster_delete', 'roster', id, snapshot)
    return HttpResponse.json({ message: '삭제되었습니다.' })
  }),

  /* ── 사용자 목록 (staff+) ─────────────────────────────────────────────── */

  ...userList('org-members', (u) => !u.isBanned && u.authority !== 'basic' && u.authority !== 'root'),
  ...userList('members', (u) => !u.isBanned && u.authority === 'member'),
  ...userList('managers', (u) => !u.isBanned && u.authority === 'manager'),
  ...userList('basic-users', (u) => !u.isBanned && u.authority === 'basic'),
  ...userList('banned-users', (u) => u.isBanned),
  ...userList('bannable-users', (u) => !u.isBanned && u.authority !== 'root'),

  /* ── 권한 변경 (staff+) ───────────────────────────────────────────────── */

  ...transition('demote-member', 'staff', 'member_demote', (u) => u.authority === 'member', demoteMember,
    '멤버만 강등할 수 있습니다.'),
  ...transition('set-manager', 'staff', 'role_set_manager', (u) => u.authority === 'member', setManager,
    '멤버만 매니저로 임명할 수 있습니다.'),
  ...transition('unset-manager', 'staff', 'role_unset_manager', (u) => u.authority === 'manager', unsetManager,
    '매니저만 해제할 수 있습니다.'),

  /* ── 차단 (staff+) ────────────────────────────────────────────────────── */

  http.put('*/api/admin/users/:id/ban', async ({ request, params }) => {
    const auth = requireRole(request, 'staff')
    if ('response' in auth) return auth.response

    const user = target(params)
    if (isResponse(user)) return user

    // 대상 역할에 따라 필요한 권한이 다르다(§4.4). staff 는 root 만, root 는 아무도
    if (!canBanUser(auth.user.authority, user.authority)) {
      return forbidden('이 계정을 차단할 권한이 없습니다.')
    }
    if (user.isBanned) return conflict('이미 차단된 계정입니다.')

    banUser(user)
    log(auth.user, 'user_ban', 'user', user.id, userSnapshot(user))
    return HttpResponse.json(toPublicUser(user))
  }),

  http.put('*/api/admin/users/:id/unban', async ({ request, params }) => {
    const auth = requireRole(request, 'staff')
    if ('response' in auth) return auth.response

    const user = target(params)
    if (isResponse(user)) return user
    if (!user.isBanned) return conflict('차단된 계정이 아닙니다.')

    // 해제는 신청 상태를 건드리지 않는다. isBanned 를 분리했으므로 원래 상태가
    // 그대로 남아 있다 — 구 구현은 authority 로 추측해 덮어썼다(§12-19)
    unbanUser(user)
    log(auth.user, 'user_unban', 'user', user.id, userSnapshot(user))
    return HttpResponse.json(toPublicUser(user))
  }),

  /* ── 스태프 (root 전용) ───────────────────────────────────────────────── */

  http.get('*/api/admin/staffs', async ({ request }) => {
    const auth = requireRole(request, 'root')
    if ('response' in auth) return auth.response

    return HttpResponse.json(
      listUsers()
        .filter((u) => u.authority === 'staff' && !u.isBanned)
        // 회장을 먼저 보여준다(§5.10)
        .sort((a, b) => (a.staffType === 'president' ? -1 : b.staffType === 'president' ? 1 : 0))
        .map(toAdminUser),
    )
  }),

  http.put('*/api/admin/users/:id/set-staff', async ({ request, params }) => {
    const auth = requireRole(request, 'root')
    if ('response' in auth) return auth.response

    const user = target(params)
    if (isResponse(user)) return user

    const body = (await request.json()) as { staffType?: StaffType }
    if (!body.staffType || !STAFF_TYPES.includes(body.staffType)) {
      return bad('스태프 구분(회장·감독)을 선택해 주세요.')
    }
    if (user.authority !== 'member' && user.authority !== 'manager') {
      return conflict('멤버 또는 매니저만 스태프로 임명할 수 있습니다.')
    }

    setStaff(user, body.staffType)
    log(auth.user, 'role_set_staff', 'user', user.id, {
      ...userSnapshot(user),
      staffType: body.staffType,
    })
    return HttpResponse.json(toPublicUser(user))
  }),

  ...transition('unset-staff', 'root', 'role_unset_staff', (u) => u.authority === 'staff', unsetStaff,
    '스태프만 해제할 수 있습니다.'),

  /* ── 설정 (staff+) ────────────────────────────────────────────────────── */

  http.put('*/api/admin/roster-year', async ({ request }) => {
    const auth = requireRole(request, 'staff')
    if ('response' in auth) return auth.response

    const body = (await request.json()) as { year?: number }
    const year = Number(body.year)
    // §7.6 — 하한은 캘린더와 같은 2000년. 상한은 다음 시즌 준비를 감안해 +1년
    if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      return bad('연도가 올바르지 않습니다.')
    }

    setActiveYear(year)
    log(auth.user, 'roster_year_set', 'setting', null, { year })
    return HttpResponse.json({ year })
  }),

  /**
   * 공휴일 동기화.
   *
   * **§12-6 — 자동 동기화를 없앴다.** 구 구현은 데이터가 없는 연도를 조회하면
   * 그 자리에서 공공 API 를 호출하고 DB 를 갈아엎어서, `?year=1900` 같은 요청을
   * 반복하면 외부 쿼터를 소진시킬 수 있었다. 이제 staff+ 가 눌러야만 돈다.
   */
  http.post('*/api/admin/sync-holidays', async ({ request }) => {
    const auth = requireRole(request, 'staff')
    if ('response' in auth) return auth.response

    const body = (await request.json()) as { year?: number }
    const year = Number(body.year)
    if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      return bad('연도가 올바르지 않습니다.')
    }

    const count = resyncHolidays(year)
    return HttpResponse.json({ year, count })
  }),
]

/* ── 헬퍼 ────────────────────────────────────────────────────────────────── */

/** 목록 엔드포인트는 필터만 다르다. 같은 모양을 여덟 번 적지 않는다. */
function userList(path: string, filter: (user: MockUser) => boolean) {
  return [
    http.get(`*/api/admin/${path}`, async ({ request }) => {
      const auth = requireRole(request, 'staff')
      if ('response' in auth) return auth.response
      return HttpResponse.json(listUsers().filter(filter).map(toAdminUser))
    }),
  ]
}

/**
 * 권한 전이 엔드포인트도 모양이 같다 — **대상 조건 · 적용 · 로그** 셋뿐이다.
 * 조건을 만족하지 않으면 409 로 알린다(§12-10 과 같은 이유).
 */
function transition(
  path: string,
  minRole: 'staff' | 'root',
  action: 'member_demote' | 'role_set_manager' | 'role_unset_manager' | 'role_unset_staff',
  allowed: (user: MockUser) => boolean,
  apply: (user: MockUser) => void,
  reason: string,
) {
  return [
    http.put(`*/api/admin/users/:id/${path}`, async ({ request, params }) => {
      const auth = requireRole(request, minRole)
      if ('response' in auth) return auth.response

      const user = target(params)
      if (isResponse(user)) return user
      if (!allowed(user)) return conflict(reason)

      const snapshot = userSnapshot(user)
      apply(user)
      log(auth.user, action, 'user', user.id, snapshot)
      return HttpResponse.json(toPublicUser(user))
    }),
  ]
}

/** 로스터 입력 검증. 문제가 있으면 사유 문자열을 돌려준다. */
function normalizeRoster(body: unknown): RosterInput | string {
  const input = body as Partial<RosterInput>

  const year = Number(input.year)
  if (!Number.isInteger(year) || year < 2000) return '연도가 올바르지 않습니다.'

  const name = (input.name ?? '').trim()
  if (!name) return '이름을 입력해 주세요.'

  const studentId = (input.studentId ?? '').trim()
  const studentCheck = validateStudentId(studentId)
  if (!studentCheck.valid) return studentCheck.error

  const number = (input.number ?? '').trim().toUpperCase()
  const numberCheck = validateRosterNumber(number)
  if (!numberCheck.valid) return numberCheck.error

  const generation = Number(input.generation)
  if (!Number.isInteger(generation) || generation < 1) return '기수가 올바르지 않습니다.'

  if (!input.role || !ROSTER_ROLES.includes(input.role)) return '역할이 올바르지 않습니다.'

  return { year, name, studentId, number, generation, role: input.role }
}
