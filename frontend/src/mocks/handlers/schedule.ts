import { HttpResponse, http } from 'msw'

import { requireRole } from '@/mocks/authGuard'
import {
  createEvent,
  deleteEvent,
  findEvent,
  hasDuplicate,
  listEvents,
  listHolidays,
  updateEvent,
} from '@/mocks/scheduleState'
import { log } from '@/mocks/logState'
import { applyMockSwitches } from '@/mocks/switches'
import { validateEventName } from '@/lib/validators'
import type { EventType, TeamEvent } from '@/types/schedule'

/** 블루프린트 §5.5 · §5.6. 조회는 공개, 쓰기는 manager+ 다. */

type EventInput = { date?: string; type?: EventType; name?: string }

const EVENT_TYPES: EventType[] = ['training', 'meeting', 'events', 'etc']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const bad = (message: string) => HttpResponse.json({ message }, { status: 400 })

/** §8.1 의 event 스냅샷. */
const snapshotOf = (event: TeamEvent) => ({ date: event.date, type: event.type, name: event.name })

/** 입력을 검증하고 정규화한다. 문제가 있으면 사유 문자열을 돌려준다. */
function normalize(input: EventInput): { date: string; type: EventType; name: string } | string {
  const date = (input.date ?? '').trim()
  const name = (input.name ?? '').trim()
  const type = input.type

  if (!DATE_RE.test(date)) return '날짜 형식이 올바르지 않습니다.'
  if (!type || !EVENT_TYPES.includes(type)) return '일정 유형이 올바르지 않습니다.'

  const nameCheck = validateEventName(name)
  if (!nameCheck.valid) return nameCheck.error

  return { date, type, name }
}

const yearOf = (request: Request) => {
  const raw = new URL(request.url).searchParams.get('year')
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : new Date().getFullYear()
}

export const scheduleHandlers = [
  /* ── 조회 (공개) ──────────────────────────────────────────────────────── */

  http.get('*/api/events', async ({ request }) => {
    const override = await applyMockSwitches('schedule')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(listEvents(yearOf(request)))
  }),

  http.get('*/api/holidays', async ({ request }) => {
    const override = await applyMockSwitches('schedule')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])
    return HttpResponse.json(listHolidays(yearOf(request)))
  }),

  /* ── 쓰기 (manager+) ──────────────────────────────────────────────────── */

  http.post('*/api/events/bulk', async ({ request }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const body = (await request.json()) as { events?: EventInput[] }
    const items = body.events ?? []
    if (items.length === 0) return bad('등록할 일정이 없습니다.')

    const created: TeamEvent[] = []
    const conflicts: Array<{ date: string; name: string; reason: string }> = []

    for (const item of items) {
      const normalized = normalize(item)
      if (typeof normalized === 'string') {
        conflicts.push({ date: item.date ?? '', name: item.name ?? '', reason: normalized })
        continue
      }
      if (hasDuplicate(normalized.date, normalized.name)) {
        conflicts.push({ ...normalized, reason: '이미 존재하는 일정입니다.' })
        continue
      }
      const event = createEvent(normalized)
      created.push(event)
      log(auth.user, 'event_create', 'event', event.id, snapshotOf(event))
    }

    // 부분 성공을 감추지 않는다. 무엇이 들어갔고 무엇이 막혔는지 그대로 알린다.
    return HttpResponse.json({ created, conflicts }, { status: created.length > 0 ? 201 : 409 })
  }),

  http.post('*/api/events', async ({ request }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const normalized = normalize((await request.json()) as EventInput)
    if (typeof normalized === 'string') return bad(normalized)

    if (hasDuplicate(normalized.date, normalized.name)) {
      return HttpResponse.json({ message: '이미 존재하는 일정입니다.' }, { status: 409 })
    }
    const event = createEvent(normalized)
    log(auth.user, 'event_create', 'event', event.id, snapshotOf(event))

    return HttpResponse.json(event, { status: 201 })
  }),

  http.put('*/api/events/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const id = Number(params.id)
    const existing = findEvent(id)
    if (!existing) {
      return HttpResponse.json({ message: '존재하지 않는 일정입니다.' }, { status: 404 })
    }

    const normalized = normalize((await request.json()) as EventInput)
    if (typeof normalized === 'string') return bad(normalized)

    if (hasDuplicate(normalized.date, normalized.name, id)) {
      return HttpResponse.json({ message: '이미 존재하는 일정입니다.' }, { status: 409 })
    }

    // 고치기 전에 떠 둔다(§12-7 과 같은 이유)
    const before = snapshotOf(existing)
    const updated = updateEvent(id, normalized)
    log(auth.user, 'event_update', 'event', id, { before, after: normalized })

    return HttpResponse.json(updated)
  }),

  http.delete('*/api/events/:id', async ({ request, params }) => {
    const auth = requireRole(request, 'manager')
    if ('response' in auth) return auth.response

    const id = Number(params.id)
    const existing = findEvent(id)
    if (!existing) {
      return HttpResponse.json({ message: '존재하지 않는 일정입니다.' }, { status: 404 })
    }

    const snapshot = snapshotOf(existing)
    deleteEvent(id)
    log(auth.user, 'event_delete', 'event', id, snapshot)

    return HttpResponse.json({ message: '삭제되었습니다.' })
  }),
]
