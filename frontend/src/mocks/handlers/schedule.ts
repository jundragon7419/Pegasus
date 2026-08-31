import { HttpResponse, http } from 'msw'

import { makeEvents, makeHolidays } from '@/mocks/fixtures/schedule'
import { applyMockSwitches } from '@/mocks/switches'

/** 블루프린트 §5.5 · §5.6. 둘 다 공개 조회다. */
export const scheduleHandlers = [
  http.get('*/api/events', async ({ request }) => {
    const override = await applyMockSwitches('schedule')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])

    const yearParam = new URL(request.url).searchParams.get('year')
    const year = yearParam ? Number(yearParam) : new Date().getFullYear()
    return HttpResponse.json(makeEvents(year))
  }),

  http.get('*/api/holidays', async ({ request }) => {
    const override = await applyMockSwitches('schedule')
    if (override && 'response' in override) return override.response
    if (override) return HttpResponse.json([])

    const yearParam = new URL(request.url).searchParams.get('year')
    const year = yearParam ? Number(yearParam) : new Date().getFullYear()
    return HttpResponse.json(makeHolidays(year))
  }),
]
