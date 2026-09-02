import { LOG_SEEDS } from '@/mocks/fixtures/logs'
import type {
  ActivityAction,
  ActivityLog,
  ActivityTargetType,
} from '@/types/activity-log'

/**
 * 감사 로그 저장소. 탭 메모리에만 산다.
 *
 * 구 구현은 §8.3 이 지적하듯 탈퇴·투표 제출을 기록하지 않았고, 탈퇴 시
 * `activity_logs.user_id ON DELETE CASCADE` 로 **그 사람의 로그를 전부 지웠다.**
 * 여기서는 계정이 사라져도 로그가 남는다 — `userId` 만 null 이 되고
 * `username` 스냅샷은 유지된다.
 */

const logs: ActivityLog[] = [...LOG_SEEDS]

let nextId = Math.max(0, ...logs.map((l) => l.id)) + 1

/** 로그를 남기는 주체. 표시 이름은 기록 시점에 굳는다. */
export type LogActor = { id: number; username: string; name: string | null }

const displayName = (actor: LogActor) =>
  actor.name ? `${actor.username}(${actor.name})` : actor.username

/**
 * 로그 한 줄을 남긴다.
 *
 * **§8.2 규약: 절대 throw 하지 않는다.** 로그가 실패해도 본 흐름(글 저장, 투표 등)이
 * 막히면 안 된다. 호출부는 반환값을 보지 않고 그냥 부른다.
 */
export function log(
  actor: LogActor,
  action: ActivityAction,
  targetType: ActivityTargetType,
  targetId: number | null,
  snapshot: Record<string, unknown> | null = null,
): void {
  try {
    logs.push({
      id: nextId++,
      userId: actor.id,
      username: displayName(actor),
      action,
      targetType,
      targetId,
      snapshot,
      createdAt: new Date().toISOString(),
    })
  } catch {
    // 삼킨다. 감사 로그 실패가 사용자 동작을 막는 것이 더 나쁘다.
  }
}

export type PagedLogs = {
  items: ActivityLog[]
  page: number
  size: number
  total: number
}

/** 최신순. `userId` 를 주면 그 사람 것만 추린다. */
export function listLogs(options: { userId?: number; page: number; size: number }): PagedLogs {
  const filtered =
    options.userId === undefined ? logs : logs.filter((l) => l.userId === options.userId)

  const sorted = [...filtered].sort((a, b) =>
    a.createdAt === b.createdAt ? b.id - a.id : a.createdAt < b.createdAt ? 1 : -1,
  )

  const start = (options.page - 1) * options.size
  return {
    items: sorted.slice(start, start + options.size),
    page: options.page,
    size: options.size,
    total: sorted.length,
  }
}

export const findLog = (id: number) => logs.find((l) => l.id === id)

/**
 * 탈퇴 익명화. 로그를 **지우지 않고** 작성자 연결만 끊는다(§12-12).
 * `username` 스냅샷은 그대로 두어 누구의 행동이었는지는 남는다.
 */
export function anonymizeLogsOf(userId: number): void {
  for (const entry of logs) {
    if (entry.userId === userId) entry.userId = null
  }
}
